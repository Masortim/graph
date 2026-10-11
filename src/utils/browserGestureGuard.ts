import { useEffect } from 'react';

/**
 * Browser mouse-gesture guard.
 *
 * The graph is edited with raw mouse interactions (LMB drag of a node, LMB double click to
 * pin/unpin an information card, RMB pan / local subgraph, wheel zoom). Browsers attach their
 * own behaviour to several of those actions - middle click autoscroll, "open in new tab",
 * Back/Forward side buttons, native drag & drop, text selection with its "Look Up / Translate /
 * Copy" popups, Ctrl+Wheel page zoom, trackpad pinch, swipe navigation, Alt+Arrow history
 * navigation - and the resulting browser menus/overlays interrupt graph editing.
 *
 * This hook suppresses all of those browser level reactions while keeping the application's own
 * mouse handlers untouched (preventDefault never stops the events from reaching React handlers).
 *
 * Native text interaction is preserved where it is a feature:
 *  - editable fields (input / textarea / select / contenteditable) keep caret placement,
 *    word selection on double click and Backspace editing;
 *  - elements marked with the `.select-text` class (pinned information cards) stay selectable
 *    so that formulas can be copied out of them.
 *
 * The right click context menu is already suppressed globally in App.tsx for every mode.
 */

const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

/** Elements whose native selection behaviour must stay alive (pinned info cards). */
const SELECTABLE_SELECTOR = '.select-text';

export const GESTURE_GUARD_CLASS = 'browser-gesture-guard';

function isElement(target: EventTarget | null): target is Element {
  return target instanceof Element;
}

function isEditableTarget(target: EventTarget | null): boolean {
  return isElement(target) && target.closest(EDITABLE_SELECTOR) !== null;
}

function isSelectableTarget(target: EventTarget | null): boolean {
  return isElement(target) && target.closest(SELECTABLE_SELECTOR) !== null;
}

function isCanvasTarget(target: EventTarget | null): boolean {
  return isElement(target) && target.closest('canvas') !== null;
}

/**
 * Installs the guard while `enabled` is true and removes every listener / class on disable
 * (or on unmount), so modes that must behave exactly as before are never affected.
 */
export function useBrowserGestureGuard(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const root = document.documentElement;
    root.classList.add(GESTURE_GUARD_CLASS);

    const capture = { capture: true, passive: false } as const;

    // --- Mouse buttons that only the browser uses (middle click, Back/Forward side buttons) ---
    const handleMouseDown = (event: MouseEvent) => {
      // On the graph canvas every button belongs to the app: block the browser default
      // (autoscroll, native drag, selection start, gesture recognition) for all of them.
      if (isCanvasTarget(event.target)) {
        event.preventDefault();
        return;
      }
      if (event.button === 1 && !isEditableTarget(event.target)) {
        // Middle click: autoscroll / open link in a new tab / middle click paste
        event.preventDefault();
      }
      if (event.button === 3 || event.button === 4) {
        // Browser Back / Forward side buttons
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 1 && !isEditableTarget(event.target)) {
        event.preventDefault();
      }
      if (event.button === 3 || event.button === 4) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleAuxClick = (event: MouseEvent) => {
      if (event.button !== 0) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // --- Double click: word selection and the browser "Look Up / Translate / Search" popups ---
    const handleDoubleClick = (event: MouseEvent) => {
      if (isEditableTarget(event.target) || isSelectableTarget(event.target)) return;
      event.preventDefault();
    };

    // --- Native drag & drop (dragging canvas content, dropping files onto the window) ---
    const handleDragStart = (event: DragEvent) => {
      event.preventDefault();
    };

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
    };

    const handleDrop = (event: DragEvent) => {
      event.preventDefault();
    };

    // --- Text selection outside of the places where it is a feature ---
    const handleSelectStart = (event: Event) => {
      if (isEditableTarget(event.target) || isSelectableTarget(event.target)) return;
      event.preventDefault();
    };

    // --- Ctrl/Cmd + Wheel and trackpad pinch: browser page zoom gestures ---
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    };

    const handleGesture = (event: Event) => {
      event.preventDefault();
    };

    // --- Keyboard shortcuts that navigate the browser history and lose unsaved proposals ---
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        return;
      }
      if (event.key === 'Backspace' && !isEditableTarget(event.target)) {
        event.preventDefault();
      }
    };

    window.addEventListener('mousedown', handleMouseDown, capture);
    window.addEventListener('mouseup', handleMouseUp, capture);
    window.addEventListener('auxclick', handleAuxClick, capture);
    window.addEventListener('dblclick', handleDoubleClick, capture);
    window.addEventListener('dragstart', handleDragStart, capture);
    window.addEventListener('dragover', handleDragOver, capture);
    window.addEventListener('drop', handleDrop, capture);
    window.addEventListener('selectstart', handleSelectStart, capture);
    window.addEventListener('wheel', handleWheel, capture);
    window.addEventListener('keydown', handleKeyDown, capture);
    // Safari / WebKit trackpad & pinch gestures
    window.addEventListener('gesturestart', handleGesture, capture);
    window.addEventListener('gesturechange', handleGesture, capture);
    window.addEventListener('gestureend', handleGesture, capture);

    return () => {
      root.classList.remove(GESTURE_GUARD_CLASS);
      window.removeEventListener('mousedown', handleMouseDown, capture);
      window.removeEventListener('mouseup', handleMouseUp, capture);
      window.removeEventListener('auxclick', handleAuxClick, capture);
      window.removeEventListener('dblclick', handleDoubleClick, capture);
      window.removeEventListener('dragstart', handleDragStart, capture);
      window.removeEventListener('dragover', handleDragOver, capture);
      window.removeEventListener('drop', handleDrop, capture);
      window.removeEventListener('selectstart', handleSelectStart, capture);
      window.removeEventListener('wheel', handleWheel, capture);
      window.removeEventListener('keydown', handleKeyDown, capture);
      window.removeEventListener('gesturestart', handleGesture, capture);
      window.removeEventListener('gesturechange', handleGesture, capture);
      window.removeEventListener('gestureend', handleGesture, capture);
    };
  }, [enabled]);
}

export default useBrowserGestureGuard;
