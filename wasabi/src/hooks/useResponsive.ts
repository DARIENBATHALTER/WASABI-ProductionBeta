import { useState, useEffect } from 'react';

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const breakpoints: Record<Breakpoint, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

/**
 * Hook to check if viewport matches a breakpoint
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const query = `(min-width: ${breakpoints[breakpoint]}px)`;
    const mediaQuery = window.matchMedia(query);

    setMatches(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [breakpoint]);

  return matches;
}

/**
 * Hook to get current breakpoint name
 */
export function useCurrentBreakpoint(): Breakpoint | 'xs' {
  const [current, setCurrent] = useState<Breakpoint | 'xs'>('xs');

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      if (width >= breakpoints['2xl']) return '2xl';
      if (width >= breakpoints.xl) return 'xl';
      if (width >= breakpoints.lg) return 'lg';
      if (width >= breakpoints.md) return 'md';
      if (width >= breakpoints.sm) return 'sm';
      return 'xs';
    };

    const handler = () => setCurrent(checkBreakpoint());
    handler(); // Initial check

    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return current;
}

/**
 * Hook to check if device is mobile
 */
export function useIsMobile(): boolean {
  return !useBreakpoint('md');
}

/**
 * Hook to check if device is tablet
 */
export function useIsTablet(): boolean {
  const isMd = useBreakpoint('md');
  const isLg = useBreakpoint('lg');
  return isMd && !isLg;
}

/**
 * Hook to check if device is desktop
 */
export function useIsDesktop(): boolean {
  return useBreakpoint('lg');
}

/**
 * Hook to check if device supports touch
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
}

/**
 * Hook to get viewport dimensions
 */
export function useViewportSize(): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const handler = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handler(); // Initial
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return size;
}

/**
 * Hook to check if user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(query.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    query.addEventListener('change', handler);

    return () => query.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

/**
 * Hook to check if user prefers dark mode
 */
export function usePrefersDarkMode(): boolean {
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    setPrefersDark(query.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    query.addEventListener('change', handler);

    return () => query.removeEventListener('change', handler);
  }, []);

  return prefersDark;
}
