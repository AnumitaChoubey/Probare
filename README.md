# Probare (Quality Event Management System)

Probare is an enterprise-grade Quality Event Management System designed to orchestrate the complete lifecycle of quality incidents, rebuttals, root cause analyses (RCA), corrective actions (CAPA), and effectiveness reviews. 

Built with an offline-capable, desktop-class React/Electron frontend and powered by a highly concurrent Python FastAPI backend, Probare prioritizes data integrity, strict optimistic concurrency, and idempotency guarantees.

## 🏗️ Architecture

The system utilizes a fully decoupled architecture:

### Frontend
- **Frameworks:** React (Vite) & Electron
- **Language:** TypeScript
- **State Management:** `@tanstack/react-query`
- **Data Layer:** `axios` centralized API client
- **Styling:** Tailwind CSS (Immutable visual design)
- **Features:** Desktop-native experience, offline capability, command palette, and rich visualization.

### Backend
- **Framework:** Python / FastAPI
- **Database:** PostgreSQL (managed via SQLAlchemy / Alembic)
- **Storage:** MinIO (S3-compatible object storage for evidence files)
- **Cache / Rate Limiting:** Redis
- **Security:** Strict RBAC, runtime tenant/project isolation (`/auth/me`), and Idempotency guarantees.
- **Concurrency:** Optimistic Concurrency Control (OCC) using explicitly tracked `version` integers to prevent state-overwrite collisions (HTTP 409).

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- Docker & Docker Compose

### 1. Start Infrastructure & Backend
The backend services (PostgreSQL, Redis, MinIO, and FastAPI) are containerized for local development.

```bash
# Start all background services and the FastAPI backend
docker compose up -d

# Check backend health
curl http://localhost:8000/api/v1/health/ready
```

### 2. Frontend Setup
Navigate to the frontend directory, install dependencies, and start the development server.

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite React app in the browser
npm run dev

# OR start the Electron desktop app
npm run dev:electron
```

## 🔐 Environment Variables & Security

### Frontend (`.env`)
- `VITE_API_URL`: Points to your FastAPI backend (e.g., `http://localhost:8000/api/v1`).
- `VITE_DEV_TOKEN`: Development-only JWT override for local bypassing of MSAL / Entra ID. *Note: The build pipeline securely tree-shakes this token entirely out of production builds.*

### Backend (`.env`)
- `APPLICATION_ENV`: Set to `production`, `development`, or `testing`. Controls seeding safety and scheduler execution.
- `SQLALCHEMY_DATABASE_URI`: Connection string for PostgreSQL.
- `REDIS_URL`: Connection string for Redis cache & rate limiting.

## 🧪 Testing and Verification

### Frontend
```bash
# Type-checking and Linting
npm run lint

# Production Build Verification
npm run build
```

### Backend
Backend tests are executed via `pytest`, ensuring isolated environments and idempotency guarantees.
```bash
# Run backend tests inside the container
docker exec -it qems-backend pytest tests/
```

## 📂 Project Structure

```text
├── backend/                  # Python FastAPI Backend
│   ├── alembic/              # Database Migrations
│   ├── app/
│   │   ├── api/v1/routers/   # REST API Endpoints
│   │   ├── models/           # SQLAlchemy DB Models
│   │   ├── repositories/     # Database access layer
│   │   ├── schemas/          # Pydantic validation schemas
│   │   └── services/         # Core business logic & Idempotency
│   └── tests/                # Pytest integration & unit tests
├── frontend/                 # React & Electron Frontend
│   ├── src/                  # React Source Code
│   │   ├── components/       # UI Components
│   │   ├── context/          # QEMSContext & Providers
│   │   ├── services/api/     # Centralized Axios Client & Domain APIs
│   │   └── types/            # TypeScript Interfaces
│   ├── electron/             # Electron main & preload scripts
│   └── package.json          # Frontend dependencies and scripts
├── local_tests/              # Ignored folder for temporary scripts and tests
└── docker-compose.yml        # Infrastructure declaration
```

## ⚠️ Important Rules
1. **Visual Immutable Source of Truth:** The UI is strictly governed by pre-approved designs. No layout DOM, Tailwind classes, or global CSS should be organically modified during backend integration tasks.
2. **Production Seeding Disabled:** The `seed.py` utility strictly refuses execution (`sys.exit(1)`) if `APPLICATION_ENV=production` to protect critical data.
3. **Idempotency Standards:** Critical mutation endpoints (RCA, CAPA, Transitions) utilize `Idempotency-Key` tracking and `expected_version` checks to safely handle duplicate network calls and overlapping user edits.
