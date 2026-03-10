import { useCallback, useState } from 'react';
import { uploadPdf } from '../api';

interface UploadZoneProps {
  onUploaded: (documentId: string) => void;
}

export function UploadZone({ onUploaded }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF files are supported');
        return;
      }
      setError(null);
      setUploading(true);
      try {
        const { document_id } = await uploadPdf(file);
        onUploaded(document_id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [onUploaded]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div
      className={`upload-zone ${dragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        type="file"
        accept=".pdf"
        onChange={onInputChange}
        disabled={uploading}
        className="upload-input"
      />
      {uploading ? (
        <span className="upload-text">Processing…</span>
      ) : (
        <span className="upload-text">Drop PDF here or click to upload</span>
      )}
      {error && <span className="upload-error">{error}</span>}
    </div>
  );
}
