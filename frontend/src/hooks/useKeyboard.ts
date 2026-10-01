import { useEffect, useLayoutEffect, useRef } from 'react';
import { keyToAction } from '../calculator/keys';
import type { Action } from '../calculator/types';

/**
 * Reports keyboard keys as calculator actions. It listens on the window, so
 * keys work whatever has focus.
 */
export function useKeyboard(onAction: (action: Action) => void): void {
  // The listener is added once; the ref lets it call the latest handler.
  const handler = useRef(onAction);
  useLayoutEffect(() => {
    handler.current = onAction;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Leave browser shortcuts such as Ctrl+R alone.
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      // Enter on a focused button activates that button; the browser does it.
      if (event.key === 'Enter' && event.target instanceof HTMLButtonElement) return;

      const action = keyToAction(event.key);
      if (!action) return;

      // Stops defaults such as "/" opening quick find in Firefox.
      event.preventDefault();
      handler.current(action);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
