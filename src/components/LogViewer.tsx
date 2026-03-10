import type { FC } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getLogs, getLogsStreamUrl } from '../api';

interface LogEntry {
  timestamp: string;
  event: string;
  type?: string;
  status?: 'success' | 'failure';
  model?: string;
  model_name?: string;
  source?: string;
  document_id?: string;
  duration_sec?: number;
  cost?: number;
  error?: string;
  message?: string;
  page_num?: number;
  total_pages?: number;
  messages_preview?: unknown[];
  response_preview?: string;
}

interface LogViewerProps {
  documentId: string | null;
}

export const LogViewer: FC<LogViewerProps> = ({ documentId }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const filteredLogs = useMemo(() => {
    if (!documentId) return [];
    return logs.filter((e) => e.document_id === documentId);
  }, [logs, documentId]);

  useEffect(() => {
    getLogs(200).then((d) => setLogs(d.logs || []));
  }, []);

  useEffect(() => {
    const url = getLogsStreamUrl();
    const es = new EventSource(url);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      try {
        const entry = JSON.parse(e.data) as LogEntry;
        setLogs((prev) => [...prev.slice(-400), entry]);
      } catch {}
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [filteredLogs]);

  const renderEntry = (entry: LogEntry, i: number) => {
    const isOcr = entry.source === 'ocr' || entry.type;
    const status = entry.status ?? (entry.type === 'failed' ? 'failure' : 'success');
    return (
      <div key={i} className={`log-entry ${status} ${isOcr ? 'log-ocr' : ''}`}>
        <span className="log-time">{new Date(entry.timestamp || 0).toLocaleTimeString()}</span>
        {isOcr ? (
          <>
            <span className="log-model">{entry.model_name || entry.model || '-'}</span>
            <span className="log-source">{entry.type || entry.event}</span>
            <span className="log-message">{entry.message}</span>
            {entry.page_num != null && (
              <span className="log-meta">page {entry.page_num}{entry.total_pages != null ? `/${entry.total_pages}` : ''}</span>
            )}
            {entry.document_id && <span className="log-doc">{entry.document_id}</span>}
            {entry.error && <span className="log-error">{entry.error.slice(0, 80)}</span>}
          </>
        ) : (
          <>
            <span className="log-model">{entry.model_name || entry.model || '-'}</span>
            <span className="log-source">{entry.source || entry.event}</span>
            {entry.document_id && <span className="log-doc">{entry.document_id}</span>}
            {status === 'success' && (
              <span className="log-meta">
                {entry.duration_sec != null && `${entry.duration_sec}s`}
                {entry.cost != null && ` · $${entry.cost}`}
              </span>
            )}
            {status === 'failure' && <span className="log-error">{entry.error?.slice(0, 80)}</span>}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="log-viewer">
      <div className="log-header">
        <span className="log-header-title">{documentId ? `Logs for ${documentId}` : 'Document logs'}</span>
        {documentId && (
          <span className={`log-status ${connected ? 'live' : 'offline'}`}>
            {connected ? '● Live' : '○ Offline'}
          </span>
        )}
      </div>
      <div className="log-list">
        {!documentId && (
          <div className="log-empty">Select a document to see its OCR and RAG logs.</div>
        )}
        {documentId && filteredLogs.length === 0 && (
          <div className="log-empty">No logs for this document yet.</div>
        )}
        {documentId && filteredLogs.map(renderEntry)}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
