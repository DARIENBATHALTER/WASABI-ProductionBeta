import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';

// Inactivity timeout: 30 minutes
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

export const useAuth = () => {
  const { currentUser, isSessionValid, logout } = useStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (currentUser) {
      timeoutRef.current = setTimeout(() => {
        logout();
      }, INACTIVITY_TIMEOUT);
    }
  }, [currentUser, logout]);

  useEffect(() => {
    // Check session validity on mount and when currentUser changes
    if (currentUser && !isSessionValid()) {
      logout();
    }
  }, [currentUser, isSessionValid, logout]);

  useEffect(() => {
    if (!currentUser) return;

    // Set up activity listeners
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the initial timer
    resetInactivityTimer();

    // Periodic session check every 5 minutes
    const intervalId = setInterval(() => {
      if (!isSessionValid()) {
        logout();
      }
    }, 5 * 60 * 1000);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      clearInterval(intervalId);
    };
  }, [currentUser, isSessionValid, logout, resetInactivityTimer]);

  return {
    isAuthenticated: !!currentUser && isSessionValid(),
    user: currentUser,
    logout,
    resetInactivityTimer
  };
};