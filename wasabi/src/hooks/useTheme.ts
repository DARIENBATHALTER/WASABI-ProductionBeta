import { useEffect } from 'react';
import { useStore } from '../store';
import { usePrefersDarkMode } from './useResponsive';

/**
 * Hook for managing the application theme
 * Provides theme state and toggle functionality
 */
export function useTheme() {
  const { theme, setTheme } = useStore();
  const prefersDark = usePrefersDarkMode();

  // Apply theme class to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const setDarkMode = () => setTheme('dark');
  const setLightMode = () => setTheme('light');

  // Follow system preference
  const followSystem = () => {
    setTheme(prefersDark ? 'dark' : 'light');
  };

  return {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    toggleTheme,
    setDarkMode,
    setLightMode,
    followSystem,
    systemPrefersDark: prefersDark,
  };
}

/**
 * Get theme-aware color values
 * Returns colors appropriate for current theme
 */
export function useThemeColors() {
  const { isDark } = useTheme();

  return {
    // Backgrounds
    bgPrimary: isDark ? 'bg-gray-900' : 'bg-white',
    bgSecondary: isDark ? 'bg-gray-800' : 'bg-gray-50',
    bgTertiary: isDark ? 'bg-gray-700' : 'bg-gray-100',

    // Text
    textPrimary: isDark ? 'text-white' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-300' : 'text-gray-600',
    textMuted: isDark ? 'text-gray-500' : 'text-gray-400',

    // Borders
    borderPrimary: isDark ? 'border-gray-700' : 'border-gray-200',
    borderSecondary: isDark ? 'border-gray-600' : 'border-gray-300',

    // Interactive
    hoverBg: isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
    activeBg: isDark ? 'bg-gray-600' : 'bg-gray-200',

    // Status colors (same in both themes but with appropriate contrast)
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
    info: 'text-blue-500',
  };
}

/**
 * CSS variables for theme colors
 * Can be used for inline styles or CSS-in-JS
 */
export function getThemeCSSVariables(isDark: boolean): Record<string, string> {
  return {
    '--color-bg-primary': isDark ? '#111827' : '#ffffff',
    '--color-bg-secondary': isDark ? '#1f2937' : '#f9fafb',
    '--color-bg-tertiary': isDark ? '#374151' : '#f3f4f6',
    '--color-text-primary': isDark ? '#ffffff' : '#111827',
    '--color-text-secondary': isDark ? '#d1d5db' : '#4b5563',
    '--color-text-muted': isDark ? '#6b7280' : '#9ca3af',
    '--color-border-primary': isDark ? '#374151' : '#e5e7eb',
    '--color-border-secondary': isDark ? '#4b5563' : '#d1d5db',
    '--color-wasabi': '#84cc16',
    '--color-wasabi-dark': '#65a30d',
  };
}
