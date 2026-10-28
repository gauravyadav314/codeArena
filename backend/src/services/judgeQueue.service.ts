import { Queue, Worker, Job } from 'bullmq';
import EventEmitter from 'events';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { getRedisClient, isRedisConnected } from '../config/redis';
import { evaluateSubmission, JudgeVerdict, TestCase } from './judge.service';
import { prisma } from '../config/prisma';
import { finalizeMatchResult } from './elo.service';
import { getSocketServer } from '../socket';

export interface JudgeJobData {
  submissionId?: string;
  userId: string;
  problemId: string;
  code: string;
  language: 'javascript' | 'typescript' | 'python' | 'cpp' | 'java';
  testCases: TestCase[];
  timeLimitMs: number;
  matchId?: string;
  matchCode?: string;
}

export interface JudgeJobResult {
  jobId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  verdict?: JudgeVerdict;
  error?: string;
  submissionId?: string;
}

// In-memory job state store for status polling
const jobStatusStore = new Map<string, JudgeJobResult>();
const inMemoryEventEmitter = new EventEmitter();

let bullJudgeQueue: Queue | null = null;
let bullJudgeWorker: Worker | null = null;

// Initialize BullMQ if Redis is configured and responsive
export function initJudgeQueue() {
  const redis = getRedisClient();

  if (redis && isRedisConnected()) {
    try {
      bullJudgeQueue = new Queue('codearena-judge', {
        connection: redis,
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      });

      bullJudgeWorker = new Worker(
        'codearena-judge',
        async (job: Job<JudgeJobData>) => {
          return await processJudgeJob(job.id || String(Date.now()), job.data);
        },
        { connection: redis, concurrency: 4 }
      );

      bullJudgeWorker.on('completed', (job) => {
        logger.info(`[BullMQ] Judge job ${job.id} completed successfully`);
      });

      bullJudgeWorker.on('failed', (job, err) => {
        logger.error({ err }, `[BullMQ] Judge job ${job?.id} failed`);
      });

      logger.info('[BullMQ] Redis Judge Queue & Worker initialized with concurrency 4');
    } catch (err: any) {
      logger.warn(`[BullMQ] Falling back to in-memory judge worker queue: ${err.message}`);
    }
  } else {
    logger.info('[JudgeQueue] Standalone in-memory asynchronous worker active');
  }
}

/**
 * Core execution pipeline for evaluating submissions, recording verdicts,
 * updating match state, and broadcasting real-time events.
 */
export async function processJudgeJob(jobId: string, data: JudgeJobData): Promise<JudgeVerdict> {
  jobStatusStore.set(jobId, { jobId, status: 'PROCESSING', submissionId: data.submissionId });

  try {
    const verdict = await evaluateSubmission(data.code, data.testCases, undefined, data.language);

    // Update Submission in DB if id provided
    if (data.submissionId) {
      await prisma.submission.update({
        where: { id: data.submissionId },
        data: {
          status: verdict.status,
          passedCount: verdict.passedCount,
          totalCount: verdict.totalCount,
          runtimeMs: verdict.runtimeMs,
        },
      });
    }

    const io = getSocketServer();

    // If part of an active match room:
    if (data.matchId && data.matchCode) {
      const room = `match:${data.matchCode}`;

      // Notify room of progress
      if (io) {
        io.to(room).emit('match:progress', {
          matchCode: data.matchCode,
          userId: data.userId,
          status: verdict.status,
          passedCount: verdict.passedCount,
          totalCount: verdict.totalCount,
        });
      }

      // If ACCEPTED, finalize the match atomically with ELO rating calculations!
      if (verdict.status === 'ACCEPTED') {
        const result = await finalizeMatchResult({
          matchId: data.matchId,
          winnerUserId: data.userId,
        });

        if (io) {
          io.to(room).emit('match:concluded', {
            matchCode: data.matchCode,
            winnerId: data.userId,
            outcome: 'PLAYER_WIN',
            match: result.match,
            eloDeltas: result.eloDeltas,
          });
        }
      }
    }

    jobStatusStore.set(jobId, {
      jobId,
      status: 'COMPLETED',
      verdict,
      submissionId: data.submissionId,
    });

    inMemoryEventEmitter.emit(`job:${jobId}`, verdict);
    return verdict;
  } catch (error: any) {
    logger.error({ error, jobId }, '[JudgeWorker] Failed to process submission');
    jobStatusStore.set(jobId, {
      jobId,
      status: 'FAILED',
      error: error?.message || 'Execution failed',
      submissionId: data.submissionId,
    });
    throw error;
  }
}

/**
 * Enqueues a judge job into BullMQ (if Redis available) or in-memory async worker queue.
 */
export async function enqueueJudgeJob(data: JudgeJobData): Promise<{ jobId: string }> {
  const jobId = `judge-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  jobStatusStore.set(jobId, { jobId, status: 'PENDING', submissionId: data.submissionId });

  if (bullJudgeQueue && isRedisConnected()) {
    await bullJudgeQueue.add('evaluate', data, { jobId });
    return { jobId };
  }

  // In-memory non-blocking asynchronous execution
  setImmediate(async () => {
    try {
      await processJudgeJob(jobId, data);
    } catch (err: any) {
      logger.error(`[InMemoryJudge] Job ${jobId} failed: ${err.message}`);
    }
  });

  return { jobId };
}

/**
 * Retrieves current job execution status for polling.
 */
export function getJudgeJobStatus(jobId: string): JudgeJobResult | null {
  return jobStatusStore.get(jobId) || null;
}
