import React, { useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  language: string;
  theme?: 'dark' | 'light';
  height?: string;
  readOnly?: boolean;
  onRunTests?: () => void;
  onSubmitCode?: () => void;
  onPasteDetected?: (pastedLength: number) => void;
}

const LANGUAGE_MAP: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  cpp: 'cpp',
  java: 'java',
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  language,
  theme = 'dark',
  height = '100%',
  readOnly = false,
  onRunTests,
  onSubmitCode,
  onPasteDetected,
}) => {
  const editorRef = useRef<any>(null);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Listen for paste events for anti-cheat tracking
    editor.onDidPaste((pasteEvent) => {
      const model = editor.getModel();
      if (model && onPasteDetected) {
        const pastedRange = pasteEvent.range;
        const pastedText = model.getValueInRange(pastedRange);
        onPasteDetected(pastedText.length);
      }
    });

    // Keyboard shortcut: Ctrl+Enter (Cmd+Enter on Mac) -> Run Tests
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      if (onRunTests) onRunTests();
    });

    // Keyboard shortcut: Ctrl+Shift+Enter (Cmd+Shift+Enter on Mac) -> Submit Solution
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      if (onSubmitCode) onSubmitCode();
    });
  };

  const monacoLanguage = LANGUAGE_MAP[language.toLowerCase()] || 'javascript';
  const monacoTheme = theme === 'light' ? 'light' : 'vs-dark';

  return (
    <div className="monaco-editor-wrapper" style={{ width: '100%', height, position: 'relative' }}>
      <Editor
        height={height}
        language={monacoLanguage}
        value={code}
        theme={monacoTheme}
        onChange={(val) => onChange(val || '')}
        onMount={handleEditorMount}
        loading={
          <div className="editor-loading-skeleton" style={{ padding: '1rem', color: 'var(--text-muted)' }}>
            Loading Monaco IDE Editor...
          </div>
        }
        options={{
          readOnly,
          fontSize: 14,
          tabSize: 2,
          insertSpaces: true,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          bracketPairColorization: { enabled: true },
          padding: { top: 12, bottom: 12 },
          wordWrap: 'on',
        }}
      />
    </div>
  );
};
