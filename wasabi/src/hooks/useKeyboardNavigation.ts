import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for keyboard navigation and accessibility
 */

// Focus trap for modals
export function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on open
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return containerRef;
}

// Escape key handler
export function useEscapeKey(onEscape: () => void, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, isActive]);
}

// Arrow key navigation for lists
export function useArrowKeyNavigation(
  items: any[],
  selectedIndex: number,
  onSelect: (index: number) => void,
  isActive: boolean = true
) {
  useEffect(() => {
    if (!isActive || items.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          onSelect(Math.min(selectedIndex + 1, items.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          onSelect(Math.max(selectedIndex - 1, 0));
          break;
        case 'Home':
          e.preventDefault();
          onSelect(0);
          break;
        case 'End':
          e.preventDefault();
          onSelect(items.length - 1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items.length, selectedIndex, onSelect, isActive]);
}

// Keyboard shortcuts handler
type ShortcutKey = string; // e.g., 'ctrl+s', 'meta+k', 'shift+/'

interface ShortcutConfig {
  key: ShortcutKey;
  handler: () => void;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        if (matchesShortcut(e, shortcut.key)) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }
          shortcut.handler();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

function matchesShortcut(e: KeyboardEvent, shortcutKey: ShortcutKey): boolean {
  const parts = shortcutKey.toLowerCase().split('+');
  const key = parts.pop()!;
  const modifiers = parts;

  const ctrlRequired = modifiers.includes('ctrl');
  const metaRequired = modifiers.includes('meta') || modifiers.includes('cmd');
  const shiftRequired = modifiers.includes('shift');
  const altRequired = modifiers.includes('alt');

  // Check modifiers
  if (ctrlRequired && !e.ctrlKey) return false;
  if (metaRequired && !e.metaKey) return false;
  if (shiftRequired && !e.shiftKey) return false;
  if (altRequired && !e.altKey) return false;

  // Check key
  return e.key.toLowerCase() === key;
}

// Global keyboard shortcuts for the app
export function useGlobalShortcuts() {
  const shortcuts: ShortcutConfig[] = [
    {
      key: 'meta+k',
      handler: () => {
        // Focus search input
        const searchInput = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="Search"]');
        searchInput?.focus();
      },
    },
    {
      key: 'ctrl+k',
      handler: () => {
        // Focus search input (Windows/Linux)
        const searchInput = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="Search"]');
        searchInput?.focus();
      },
    },
    {
      key: '/',
      handler: () => {
        // Focus search when pressing / (like GitHub)
        const activeElement = document.activeElement;
        if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
          const searchInput = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="Search"]');
          searchInput?.focus();
        }
      },
      preventDefault: false, // Don't prevent if in input
    },
  ];

  useKeyboardShortcuts(shortcuts);
}
