import { useCallback, useEffect, useRef, useState } from 'react';
import { getContent, getStatus, getDocumentStreamUrl, queryDocument, searchDocument, deleteDocument } from '../api';
import { DocumentContentView } from './DocumentContentView';
import { OutputViewer } from './OutputViewer';

interface PageContent {
  page_num: number;
  text: string;
  tables: unknown[];
}

interface DocumentPanelProps {
  documentId: string | null;
  onClose: () => void;
}

export function DocumentPanel({ documentId, onClose }: DocumentPanelProps) {
  const [status, setStatus] = useState<string>('');
  const [content, setContent] = useState<object | string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [streamingPages, setStreamingPages] = useState<PageContent[]>([]);
  const [query, setQuery] = useState('');
  const [ragQuestion, setRagQuestion] = useState('');
  const [ragAnswer, setRagAnswer] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<unknown[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'content' | 'search' | 'rag'>('content');
  const eventSourceRef = useRef<EventSource | null>(null);

  const refresh = useCallback(async () => {
    if (!documentId) return;
    try {
      const s = await getStatus(documentId);
      setStatus(s.status);
      if (s.status === 'completed') {
        const c = await getContent(documentId);
        setContent(c);
      }
    } catch {
      setStatus('not_found');
    }
  }, [documentId]);

  useEffect(() => {
    if (!documentId) return;

    setContent(null);
    setRagAnswer(null);
    setSearchResults(null);
    setStreamingPages([]);
    setProgressMessage('');

    const init = async () => {
      const s = await getStatus(documentId);
      setStatus(s.status);
      if (s.status === 'completed') {
        const c = await getContent(documentId);
        setContent(c);
        return;
      }
      if (s.status === 'not_found') return;
      if (s.status === 'failed') {
        setProgressMessage('Processing failed');
        return;
      }

      // Connect to SSE stream for real-time progress
      const url = getDocumentStreamUrl(documentId);
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onmessage = (e) => {
        try {
          const ev = JSON.parse(e.data) as {
            type: string;
            message?: string;
            page_num?: number;
            total_pages?: number;
            page_content?: PageContent;
            error?: string;
          };
          if (ev.message) setProgressMessage(ev.message);
          if (ev.type === 'page_ocr_done' && ev.page_content) {
            setStreamingPages((prev) => {
              const existing = prev.findIndex((p) => p.page_num === ev.page_content!.page_num);
              const next = [...prev];
              if (existing >= 0) next[existing] = ev.page_content!;
              else next.push(ev.page_content!);
              next.sort((a, b) => a.page_num - b.page_num);
              return next;
            });
          }
          if (ev.type === 'completed') {
            setStatus('completed');
            es.close();
            eventSourceRef.current = null;
            getContent(documentId).then(setContent);
          }
          if (ev.type === 'failed') {
            setStatus('failed');
            setProgressMessage(ev.error || 'Processing failed');
            es.close();
            eventSourceRef.current = null;
          }
        } catch {}
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        refresh();
      };
    };

    init();
    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [documentId, refresh]);

  const handleSearch = async () => {
    if (!documentId || !query.trim()) return;
    setLoading(true);
    try {
      const r = await searchDocument(documentId, query.trim());
      setSearchResults(r.results || []);
      setView('search');
    } catch (e) {
      setSearchResults([{ error: String(e) }]);
    } finally {
      setLoading(false);
    }
  };

  const handleRagQuery = async () => {
    if (!documentId || !ragQuestion.trim()) return;
    setLoading(true);
    setRagAnswer(null);
    try {
      const r = await queryDocument(documentId, ragQuestion.trim());
      setRagAnswer(r.answer);
      setView('rag');
    } catch (e) {
      setRagAnswer(`Error: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!documentId) return;
    if (!confirm('Delete this document?')) return;
    try {
      await deleteDocument(documentId);
      onClose();
    } catch (e) {
      alert(String(e));
    }
  };

  if (!documentId) return null;

  return (
    <div className="document-panel">
      <div className="panel-header">
        <span className="panel-title">Document {documentId}</span>
        <span className={`panel-status ${status}`}>{status}</span>
        <button className="panel-close" onClick={onClose}>×</button>
      </div>

      <div className="panel-tabs">
        <button className={view === 'content' ? 'active' : ''} onClick={() => setView('content')}>
          Content
        </button>
        <button className={view === 'rag' ? 'active' : ''} onClick={() => setView('rag')}>
          RAG Query
        </button>
        <button className={view === 'search' ? 'active' : ''} onClick={() => setView('search')}>
          Search
        </button>
      </div>

      {view === 'content' && (
        <div className="panel-content">
          {status === 'processing' && (
            <div className="loading">
              <div className="progress-message">{progressMessage || 'Processing…'}</div>
              {streamingPages.length > 0 && (
                <div className="streaming-pages-hint">
                  {streamingPages.length} page{streamingPages.length !== 1 ? 's' : ''} ready
                </div>
              )}
            </div>
          )}
          {status === 'pending' && <div className="loading">{progressMessage || 'Queued…'}</div>}
          {status === 'failed' && <div className="error">{progressMessage || 'Processing failed'}</div>}
          {(content || streamingPages.length > 0) && (
            <DocumentContentView
              content={{
                document_id: (content as { document_id?: string })?.document_id ?? documentId ?? '',
                status: (content as { status?: string })?.status ?? status,
                metadata: (content as { metadata?: object })?.metadata ?? {},
                full_text: (content as { full_text?: string })?.full_text ?? streamingPages.map((p) => p.text).join('\n\n'),
                pages: (content as { pages?: unknown[] })?.pages ?? streamingPages,
                chunks: (content as { chunks?: unknown[] })?.chunks ?? [],
              }}
            />
          )}
        </div>
      )}

      {view === 'search' && (
        <div className="panel-content">
          <div className="search-bar">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in document…"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} disabled={loading}>Search</button>
          </div>
          {loading && (
            <div className="rag-loading">
              <span className="rag-spinner" aria-hidden />
              <span>Searching…</span>
            </div>
          )}
          {!loading && searchResults !== null && (
            <OutputViewer content={searchResults} title="Search results" />
          )}
        </div>
      )}

      {view === 'rag' && (
        <div className="panel-content">
          <div className="rag-bar">
            <input
              value={ragQuestion}
              onChange={(e) => setRagQuestion(e.target.value)}
              placeholder="Ask a question about the document…"
              onKeyDown={(e) => e.key === 'Enter' && handleRagQuery()}
            />
            <button onClick={handleRagQuery} disabled={loading}>Ask</button>
          </div>
          {loading && (
            <div className="rag-loading">
              <span className="rag-spinner" aria-hidden />
              <span>Querying document…</span>
            </div>
          )}
          {!loading && ragAnswer !== null && (
            <OutputViewer content={ragAnswer} title="RAG Answer" />
          )}
        </div>
      )}

      <div className="panel-footer">
        <button className="btn-danger" onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
}
