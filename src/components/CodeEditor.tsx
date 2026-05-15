'use client';

import { Highlight, themes } from 'prism-react-renderer';
import { useState } from 'react';

interface Props {
  code: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}

export function CodeEditor({ code, onChange, readOnly }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing && !readOnly) {
    return (
      <textarea
        autoFocus
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        spellCheck={false}
        className="w-full h-full bg-[#0d1117] text-text border border-border rounded-md p-4 font-mono text-sm resize-none focus:outline-none focus:border-accent scrollbar-thin"
      />
    );
  }

  return (
    <div
      onClick={() => !readOnly && setEditing(true)}
      className={`relative w-full h-full overflow-auto rounded-md border border-border bg-[#0d1117] scrollbar-thin ${
        !readOnly ? 'cursor-text' : ''
      }`}
    >
      {!code ? (
        <div className="p-4 text-muted text-sm font-mono">{'// Strudel code will appear here'}</div>
      ) : (
        <Highlight code={code} language="javascript" theme={themes.vsDark}>
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={`${className} p-4 text-sm leading-relaxed`}
              style={{ ...style, background: 'transparent', margin: 0 }}
            >
              {tokens.map((line, i) => {
                const lineProps = getLineProps({ line });
                return (
                  <div key={i} {...lineProps}>
                    <span className="inline-block w-8 select-none text-muted/50">{i + 1}</span>
                    {line.map((token, key) => {
                      const tokenProps = getTokenProps({ token });
                      return <span key={key} {...tokenProps} />;
                    })}
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      )}
    </div>
  );
}
