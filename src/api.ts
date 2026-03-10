const API_BASE = import.meta.env.VITE_API_URL || '';

export async function uploadPdf(file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export interface DocumentListItem {
  document_id: string;
  uploaded_at: string | null;
}

export async function listDocuments(): Promise<DocumentListItem[]> {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.documents as DocumentListItem[];
}

export async function getStatus(documentId: string) {
  const res = await fetch(`${API_BASE}/documents/${documentId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getContent(documentId: string) {
  const res = await fetch(`${API_BASE}/documents/${documentId}/content`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function searchDocument(documentId: string, query: string, topK = 5) {
  const res = await fetch(`${API_BASE}/documents/${documentId}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, top_k: topK }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function queryDocument(documentId: string, question: string, llmModel?: string) {
  const res = await fetch(`${API_BASE}/documents/${documentId}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, llm_model: llmModel || null }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteDocument(documentId: string) {
  const res = await fetch(`${API_BASE}/documents/${documentId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getLogs(limit = 100) {
  const res = await fetch(`${API_BASE}/logs?limit=${limit}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function getLogsStreamUrl() {
  return `${API_BASE}/logs/stream`;
}

export function getDocumentStreamUrl(documentId: string) {
  return `${API_BASE}/documents/${documentId}/stream`;
}
