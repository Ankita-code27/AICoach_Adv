import { useRef } from 'react';

// A deliberately dependency-free code editor: a monospace textarea with tab-to-indent and
// auto-closing brackets/quotes, plus a line-number gutter. This keeps the bundle light and
// avoids introducing a library (e.g. CodeMirror/Monaco) that can't be installed or build-
// verified in this environment. If a richer editor (syntax highlighting, linting) is wanted
// later, swap this component's internals for one - the value/onChange contract below is all
// InterviewSessionPage.jsx depends on.
const AUTO_CLOSE_PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };

function CodeEditor({ value, onChange, language, disabled, placeholder }) {
  const textareaRef = useRef(null);

  function handleKeyDown(event) {
    if (disabled) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd } = textarea;

    if (event.key === 'Tab') {
      event.preventDefault();
      const nextValue = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`;
      onChange(nextValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
      });
      return;
    }

    if (AUTO_CLOSE_PAIRS[event.key] && selectionStart === selectionEnd) {
      const closing = AUTO_CLOSE_PAIRS[event.key];
      event.preventDefault();
      const nextValue = `${value.slice(0, selectionStart)}${event.key}${closing}${value.slice(selectionEnd)}`;
      onChange(nextValue);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      });
      return;
    }

    if (event.key === 'Enter') {
      const currentLineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLine = value.slice(currentLineStart, selectionStart);
      const indentMatch = currentLine.match(/^\s*/);
      const extraIndent = /[{[(]\s*$/.test(currentLine) ? '  ' : '';
      if (indentMatch?.[0] || extraIndent) {
        event.preventDefault();
        const insert = `\n${indentMatch[0]}${extraIndent}`;
        const nextValue = `${value.slice(0, selectionStart)}${insert}${value.slice(selectionEnd)}`;
        onChange(nextValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + insert.length;
        });
      }
    }
  }

  const lineCount = Math.max(1, value.split('\n').length);

  return (
    <div className="code-editor" data-language={language}>
      <div className="code-editor-gutter" aria-hidden="true">
        {Array.from({ length: lineCount }, (_, index) => (
          <span key={index}>{index + 1}</span>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        className="code-editor-textarea"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={`Code editor (${language})`}
      />
    </div>
  );
}

export default CodeEditor;
