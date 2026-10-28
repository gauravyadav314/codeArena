import type React from 'react';

/**
 * Enhanced keyboard navigation for in-browser coding:
 * - Tab key inserts 2 spaces without losing textarea focus
 * - Ctrl+Enter / Cmd+Enter runs test cases
 * - Ctrl+Shift+Enter / Cmd+Shift+Enter triggers official submission
 */
export function handleEditorKeyDown(
  e: React.KeyboardEvent<HTMLTextAreaElement>,
  code: string,
  setCode: (code: string) => void,
  onRun?: () => void,
  onSubmit?: () => void
) {
  // Cmd/Ctrl + Shift + Enter -> Submit solution
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Enter') {
    e.preventDefault();
    if (onSubmit) onSubmit();
    return;
  }

  // Cmd/Ctrl + Enter -> Run tests
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    if (onRun) onRun();
    return;
  }

  // Tab key -> 2 spaces indentation
  if (e.key === 'Tab') {
    e.preventDefault();
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newCode = code.substring(0, start) + '  ' + code.substring(end);
    setCode(newCode);

    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 2;
    });
  }
}
