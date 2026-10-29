import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';

export interface AntiCheatStats {
  tabBlurCount: number;
  pasteCount: number;
  lastPastedLength: number;
  suspiciousEvents: Array<{ type: string; timestamp: string; details: any }>;
}

export function useAntiCheat(matchCode?: string, username?: string, isMatchActive: boolean = false) {
  const { sendAntiCheatSignal } = useSocket();
  const [stats, setStats] = useState<AntiCheatStats>({
    tabBlurCount: 0,
    pasteCount: 0,
    lastPastedLength: 0,
    suspiciousEvents: [],
  });

  const isMatchActiveRef = useRef(isMatchActive);
  isMatchActiveRef.current = isMatchActive;

  // Window blur & tab visibility change listener
  useEffect(() => {
    if (!matchCode || !username) return;

    const handleVisibilityChange = () => {
      if (document.hidden && isMatchActiveRef.current) {
        setStats((prev) => {
          const newEvent = {
            type: 'TAB_BLUR',
            timestamp: new Date().toISOString(),
            details: { documentState: 'hidden' },
          };
          return {
            ...prev,
            tabBlurCount: prev.tabBlurCount + 1,
            suspiciousEvents: [...prev.suspiciousEvents.slice(-10), newEvent],
          };
        });

        sendAntiCheatSignal({
          matchCode,
          username,
          type: 'TAB_BLUR',
          details: { event: 'visibilitychange_hidden' },
          timestamp: new Date().toISOString(),
        });
      }
    };

    const handleWindowBlur = () => {
      if (isMatchActiveRef.current) {
        setStats((prev) => {
          const newEvent = {
            type: 'WINDOW_UNFOCUS',
            timestamp: new Date().toISOString(),
            details: { focus: false },
          };
          return {
            ...prev,
            tabBlurCount: prev.tabBlurCount + 1,
            suspiciousEvents: [...prev.suspiciousEvents.slice(-10), newEvent],
          };
        });

        sendAntiCheatSignal({
          matchCode,
          username,
          type: 'WINDOW_UNFOCUS',
          details: { event: 'window_blur' },
          timestamp: new Date().toISOString(),
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [matchCode, username, sendAntiCheatSignal]);

  // Handle paste events inside code editor
  const recordPaste = useCallback(
    (pastedTextLength: number) => {
      if (!isMatchActiveRef.current || !matchCode || !username) return;

      setStats((prev) => {
        const isLargePaste = pastedTextLength > 80;
        const newEvent = {
          type: 'PASTE_DETECTION',
          timestamp: new Date().toISOString(),
          details: { length: pastedTextLength, isLargePaste },
        };

        return {
          ...prev,
          pasteCount: prev.pasteCount + 1,
          lastPastedLength: pastedTextLength,
          suspiciousEvents: [...prev.suspiciousEvents.slice(-10), newEvent],
        };
      });

      sendAntiCheatSignal({
        matchCode,
        username,
        type: 'PASTE_DETECTION',
        details: { pastedLength: pastedTextLength, large: pastedTextLength > 80 },
        timestamp: new Date().toISOString(),
      });
    },
    [matchCode, username, sendAntiCheatSignal]
  );

  return {
    antiCheatStats: stats,
    recordPaste,
  };
}
