import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

type ViewMode = 'markdown' | 'json' | 'raw';

interface SearchResult {
  chunk_id?: string;
  content?: string;
  score?: number;
  page_range?: number[];
}

function isSearchResults(content: unknown): content is SearchResult[] {
  return (
    Array.isArray(content) &&
    content.length > 0 &&
    typeof content[0] === 'object' &&
    content[0] !== null &&
    'content' in (content[0] as object) &&
    'page_range' in (content[0] as object)
  );
}

function searchResultsToMarkdown(results: SearchResult[]): string {
  return results
    .map((r, i) => {
      const pages = r.page_range?.length
        ? r.page_range[0] === r.page_range[r.page_range.length - 1]
          ? `Page ${r.page_range[0]}`
          : `Pages ${r.page_range[0]}–${r.page_range[r.page_range.length - 1]}`
        : '';
      const header = `### Result ${i + 1}${pages ? ` (${pages})` : ''}\n\n`;
      return header + (r.content ?? '').trim();
    })
    .join('\n\n---\n\n');
}

interface OutputViewerProps {
  content: string | object;
  title?: string;
}

export function OutputViewer({ content, title }: OutputViewerProps) {
  const [mode, setMode] = useState<ViewMode>('markdown');
  const str = typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
  const isJson = typeof content === 'object' || (typeof content === 'string' && (content.trim().startsWith('{') || content.trim().startsWith('[')));
  const searchResults = isSearchResults(content) ? content : null;
  const markdownContent = searchResults ? searchResultsToMarkdown(searchResults) : str;

  return (
    <div className="output-viewer">
      {title && <div className="output-title">{title}</div>}
      <div className="output-tabs">
        <button className={mode === 'markdown' ? 'active' : ''} onClick={() => setMode('markdown')}>
          Markdown
        </button>
        <button className={mode === 'json' ? 'active' : ''} onClick={() => setMode('json')}>
          JSON
        </button>
        <button className={mode === 'raw' ? 'active' : ''} onClick={() => setMode('raw')}>
          Raw
        </button>
      </div>
      <div className="output-body">
        {mode === 'markdown' && (
          <div className="markdown-content">
            <ReactMarkdown
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return match ? (
                    <SyntaxHighlighter style={oneDark as object} language={match[1]} PreTag="div" {...props}>
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>{children}</code>
                  );
                },
              }}
            >
              {markdownContent}
            </ReactMarkdown>
          </div>
        )}
        {mode === 'json' && (
          <SyntaxHighlighter language="json" style={oneDark as object} customStyle={{ margin: 0, borderRadius: 0 }}>
            {isJson ? str : JSON.stringify({ text: str }, null, 2)}
          </SyntaxHighlighter>
        )}
        {mode === 'raw' && <pre className="raw-content">{str}</pre>}
      </div>
    </div>
  );
}
