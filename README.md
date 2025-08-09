# QubitX

## Run with Docker (recommended)

This project has a FastAPI backend and a React (Vite) frontend. Use Docker Compose to build and run both services.

### Prerequisites
- Docker and Docker Compose

### Build and start

```bash
cd /Users/titan/Desktop/Projects/QubitX
docker compose build
docker compose up -d
```

Then open the app:
- Frontend: http://localhost:5173
- Backend API (docs): http://localhost:8000/docs

The frontend is served by nginx and proxies API calls to the backend via `/api`.

### Development (without Docker)

Frontend:
```bash
cd qubitx
npm install
npm run dev
```

Backend:
```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

By default the frontend expects the API at `http://localhost:8000`. You can override with `VITE_API_BASE`.
