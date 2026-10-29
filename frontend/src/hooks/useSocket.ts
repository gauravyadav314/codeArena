import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/$/, '');

export interface MatchStartPayload {
  matchCode: string;
  startedAt: string;
  expiresAt: string;
  durationSeconds: number;
}

export interface MatchProgressPayload {
  matchCode: string;
  userId: string;
  status: string;
  passedCount: number;
  totalCount: number;
}

export interface MatchConcludedPayload {
  matchCode: string;
  outcome: 'PLAYER_WIN' | 'DRAW';
  winnerId?: string;
  reason?: string;
  match: any;
  eloDeltas?: any;
}

export interface ChatMessagePayload {
  id: string;
  senderUsername: string;
  text: string;
  createdAt: string;
}

export interface AntiCheatPayload {
  matchCode: string;
  username: string;
  type: 'PASTE_DETECTION' | 'TAB_BLUR' | 'WINDOW_UNFOCUS';
  details?: Record<string, any>;
  timestamp: string;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinMatchRoom = useCallback((matchCode: string, username?: string) => {
    if (socketRef.current?.connected && matchCode) {
      socketRef.current.emit('match:join-room', { matchCode, username });
    }
  }, []);

  const leaveMatchRoom = useCallback((matchCode: string) => {
    if (socketRef.current?.connected && matchCode) {
      socketRef.current.emit('match:leave-room', { matchCode });
    }
  }, []);

  const sendChatMessage = useCallback((matchCode: string, senderUsername: string, text: string) => {
    if (socketRef.current?.connected && matchCode && text.trim()) {
      socketRef.current.emit('match:chat-message', {
        matchCode,
        senderUsername,
        text: text.trim(),
      });
    }
  }, []);

  const sendAntiCheatSignal = useCallback((payload: AntiCheatPayload) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('match:anticheat-signal', payload);
    }
  }, []);

  const onMatchStarted = useCallback((callback: (data: MatchStartPayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('match:started', callback);
    return () => {
      socket.off('match:started', callback);
    };
  }, []);

  const onMatchProgress = useCallback((callback: (data: MatchProgressPayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('match:progress', callback);
    return () => {
      socket.off('match:progress', callback);
    };
  }, []);

  const onMatchConcluded = useCallback((callback: (data: MatchConcludedPayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('match:concluded', callback);
    return () => {
      socket.off('match:concluded', callback);
    };
  }, []);

  const onChatMessage = useCallback((callback: (data: ChatMessagePayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on('match:chat-broadcast', callback);
    return () => {
      socket.off('match:chat-broadcast', callback);
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    joinMatchRoom,
    leaveMatchRoom,
    sendChatMessage,
    sendAntiCheatSignal,
    onMatchStarted,
    onMatchProgress,
    onMatchConcluded,
    onChatMessage,
  };
}
