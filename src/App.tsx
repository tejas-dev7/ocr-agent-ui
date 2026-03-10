import { useCallback, useEffect, useState } from 'react';
import { listDocuments, type DocumentListItem } from './api';
import { DocumentPanel } from './components/DocumentPanel';
import { LogViewer } from './components/LogViewer';
import { UploadZone } from './components/UploadZone';
import './App.css';

function formatUploadedAt(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function App() {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
      setSelectedDoc((prev) => (prev && docs.some((d) => d.document_id === prev) ? prev : docs[0]?.document_id ?? null));
    } catch {
      setDocuments([]);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUploaded = (documentId: string) => {
    const entry: DocumentListItem = {
      document_id: documentId,
      uploaded_at: new Date().toISOString(),
    };
    setDocuments((prev) => (prev.some((d) => d.document_id === documentId) ? prev : [entry, ...prev]));
    setSelectedDoc(documentId);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-brand">
          <h1>OCR Agent</h1>
          <p>Upload PDFs · Extract text · Search · RAG Q&A</p>
        </div>
        <UploadZone onUploaded={handleUploaded} />
      </header>

      <main className="app-main">
        <section className="section-docs">
          <h2>Documents</h2>
          {documents.length === 0 ? (
            <p className="empty-hint">Upload a PDF to get started</p>
          ) : (
            <div className="doc-list">
              {documents.map((doc) => (
                <button
                  key={doc.document_id}
                  className={`doc-item ${selectedDoc === doc.document_id ? 'active' : ''}`}
                  onClick={() => setSelectedDoc(doc.document_id)}
                >
                  <span className="doc-item-id">{doc.document_id}</span>
                  <span className="doc-item-date">{formatUploadedAt(doc.uploaded_at)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="section-output">
          {selectedDoc ? (
            <DocumentPanel documentId={selectedDoc} onClose={() => setSelectedDoc(null)} />
          ) : (
            <div className="output-placeholder">
              <p>Select a document to view content, search, or run RAG queries</p>
            </div>
          )}
        </section>

        <aside className="section-logs" aria-label="Document logs">
          <LogViewer documentId={selectedDoc} />
        </aside>
      </main>
    </div>
  );
}

export default App;
