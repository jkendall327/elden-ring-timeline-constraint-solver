import { useEffect, useCallback } from 'react';
import { useTimeline } from '../context/TimelineContext';

interface KeyboardShortcutsOptions {
  onDelete?: () => void;
  onEscape?: () => void;
  disabled?: boolean;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { undo, redo, canUndo, canRedo, state, deleteNode } = useTimeline();
  const { onDelete, onEscape, disabled = false } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      // Don't capture if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Allow escape in inputs
        if (e.key === 'Escape' && onEscape) {
          onEscape();
        }
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Undo: Ctrl+Z / Cmd+Z
      if (modKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (canUndo) undo();
        return;
      }

      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y
      if (modKey && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }
      if (modKey && e.key === 'y') {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      // Escape: close modals, deselect
      if (e.key === 'Escape') {
        if (onEscape) {
          onEscape();
        }
        return;
      }

      // Delete / Backspace: delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedNodeId) {
        e.preventDefault();
        if (onDelete) {
          onDelete();
        } else {
          // Default behavior: delete the selected node
          deleteNode(state.selectedNodeId);
        }
        return;
      }
    },
    [disabled, canUndo, canRedo, undo, redo, onEscape, onDelete, deleteNode, state.selectedNodeId]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
