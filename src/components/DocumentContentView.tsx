import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface HeaderCell {
  text: string;
  colSpan?: number;
  rowSpan?: number;
}

interface DataCell {
  value: string;
  rowSpan?: number;
}

function TableDisplay({
  table,
}: {
  table: {
    headers?: string[];
    header_rows?: string[][];
    header_structure?: { row1: HeaderCell[]; row2: (HeaderCell | null)[] };
    rows?: string[][];
    row_cells?: (DataCell | string | null)[][];
  };
}) {
  const headerStructure = table.header_structure;
  const headerRows = table.header_rows ?? (table.headers ? [table.headers] : []);
  const rows = table.rows ?? [];
  const rowCells = table.row_cells;

  const colCount = headerStructure
    ? headerStructure.row1.reduce(
        (sum, c) => sum + (c.colSpan ?? c.rowSpan ?? 1),
        0
      )
    : Math.max(
        ...headerRows.map((r) => r.length),
        ...rows.map((r) => r.length),
        rowCells ? Math.max(...rowCells.map((r) => r.length), 0) : 0,
        0
      );

  if (colCount === 0) return null;

  return (
    <div className="table-wrapper">
      <table className="content-table">
        {headerStructure ? (
          <thead>
            <tr>
              {headerStructure.row1.map((cell, j) => (
                <th
                  key={j}
                  colSpan={cell.colSpan ?? 1}
                  rowSpan={cell.rowSpan ?? 1}
                >
                  {cell.text}
                </th>
              ))}
            </tr>
            {headerStructure.row2.some((c) => c !== null) && (
              <tr>
                {headerStructure.row2
                  .filter((c): c is HeaderCell => c !== null)
                  .map((cell, j) => (
                    <th key={j}>{cell.text}</th>
                  ))}
              </tr>
            )}
          </thead>
        ) : (
          headerRows.length > 0 && (
            <thead>
              {headerRows.map((headerRow, ri) => (
                <tr key={ri}>
                  {Array.from({ length: colCount }, (_, j) => (
                    <th key={j}>{headerRow[j] ?? ''}</th>
                  ))}
                </tr>
              ))}
            </thead>
          )
        )}
        <tbody>
          {rowCells
            ? rowCells.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => {
                    if (cell === null || cell === 'covered') return null;
                    const c = cell as DataCell;
                    return (
                      <td
                        key={j}
                        rowSpan={c.rowSpan && c.rowSpan > 1 ? c.rowSpan : undefined}
                      >
                        {c.value}
                      </td>
                    );
                  })}
                </tr>
              ))
            : rows.map((row, i) => (
                <tr key={i}>
                  {Array.from({ length: colCount }, (_, j) => (
                    <td key={j}>{row[j] ?? ''}</td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

interface PageContent {
  page_num: number;
  text: string;
  tables: unknown[];
}

interface DocumentContentData {
  document_id: string;
  status: string;
  metadata: Record<string, unknown>;
  full_text: string;
  pages?: PageContent[];
  chunks?: unknown[];
  chunks_count?: number;
}

interface DocumentContentViewProps {
  content: DocumentContentData;
}

export function DocumentContentView({ content }: DocumentContentViewProps) {
  const [viewMode, setViewMode] = useState<'formatted' | 'json'>('formatted');
  const [activePage, setActivePage] = useState(0);
  const pages = content.pages ?? [];

  const formattedJson = {
    document_id: content.document_id,
    metadata: content.metadata,
    pages: pages.map((p) => ({
      page_num: p.page_num,
      text: p.text,
      tables: p.tables,
    })),
    chunks_count: content.chunks?.length ?? 0,
  };

  return (
    <div className="document-content-view">
      <div className="content-view-tabs">
        <button
          className={viewMode === 'formatted' ? 'active' : ''}
          onClick={() => setViewMode('formatted')}
        >
          Formatted
        </button>
        <button
          className={viewMode === 'json' ? 'active' : ''}
          onClick={() => setViewMode('json')}
        >
          JSON
        </button>
      </div>

      {viewMode === 'formatted' ? (
        <div className="formatted-content">
          <div className="content-metadata">
            <h4>Metadata</h4>
            <dl>
              {Object.entries(content.metadata ?? {}).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>

          {pages.length > 0 ? (
            <div className="content-pages">
              <div className="page-tabs">
                {pages.map((p, i) => (
                  <button
                    key={p.page_num}
                    className={activePage === i ? 'active' : ''}
                    onClick={() => setActivePage(i)}
                  >
                    Page {p.page_num}
                  </button>
                ))}
              </div>
              <div className="page-body">
                <h4>Page {pages[activePage]?.page_num}</h4>
                <pre className="page-text">{pages[activePage]?.text}</pre>
                {pages[activePage]?.tables && pages[activePage].tables.length > 0 && (
                  <div className="page-tables">
                    <h5>Tables</h5>
                    {pages[activePage].tables.map((t, i) => (
                      <TableDisplay key={i} table={t as { headers?: string[]; rows?: string[][] }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="page-body">
              <pre className="page-text">{content.full_text || 'No content'}</pre>
            </div>
          )}
        </div>
      ) : (
        <div className="json-view">
          <SyntaxHighlighter language="json" style={oneDark} customStyle={{ margin: 0, borderRadius: 0 }}>
            {JSON.stringify(formattedJson, null, 2)}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  );
}
