# OCR Agent UI

Real-time agentic UI for the OCR Agent API. Upload PDFs, view extracted content, search, run RAG queries, and watch LLM audit logs live.

<img width="1720" height="964" alt="image" src="https://github.com/user-attachments/assets/f83e49cc-9aa7-43e8-98c1-1f7a5818e7f3" />

## Configuration

Copy `.env.example` to `.env` and set the backend URL:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | OCR Agent API base URL (e.g. `http://localhost:8000`). Leave empty when using Vite dev server—the proxy forwards requests to localhost:8000. |

## Run (development)

1. Start the API server (from the ocr-agent folder):
   ```bash
   cd ../ocr-agent && python examples/run_api.py
   ```

2. Start the UI (proxies API requests to localhost:8000):
   ```bash
   npm run dev
   ```

3. Open http://localhost:5173

## Build

```bash
npm run build
```

Output in `dist/`. To serve with the API, mount the `dist` folder as static files.

## Features

- **Upload**: Drag & drop or click to upload PDFs
- **Documents**: List of processed documents with status
- **Content**: View extracted text, metadata, chunks (Markdown/JSON/Raw)
- **Search**: Keyword search over document chunks
- **RAG Query**: Ask questions about the document (LLM-powered)
- **Logs**: Real-time LLM audit trail (SSE stream)
