# Probare (Quality Event Management System)

Probare is an enterprise-grade Quality Event Management System designed to orchestrate the complete lifecycle of quality incidents, rebuttals, root cause analyses (RCA), corrective actions (CAPA), and effectiveness reviews. 

The application has been upgraded to a fully cloud-connected architecture, using a modern React frontend hosted on Vercel and a highly concurrent Python FastAPI backend hosted on Render.

## 🌐 Deployment & Live Links

Probare is fully deployed to the cloud for immediate enterprise access:

- **Product Landing Page:** [https://probare-website.vercel.app/](https://probare-website.vercel.app/)
- **Live Web Application (Vercel):** *Deployed via Vercel for instant browser access.*
- **Live Backend API (Render):** *Hosted Python FastAPI backend with a managed PostgreSQL database.*
- **Desktop Application (Windows):** Download the `.exe` installer directly from the [GitHub Releases](https://github.com/AnumitaChoubey/Probare/releases/download/v1.0.0/QEMS.Desktop.Setup.0.0.0.exe). The desktop shell securely connects to the live Render backend.

## 🏗️ Architecture

The system utilizes a fully decoupled cloud-native architecture:

### Frontend (Vite / React)
- **Frameworks:** React (Vite) for the web, Electron for the Windows Desktop wrapper.
- **Language:** TypeScript
- **State Management:** `@tanstack/react-query` for aggressive caching and optimistic UI updates.
- **Authentication:** Clerk React SDK for enterprise single sign-on (SSO) and identity management.
- **Styling:** Tailwind CSS with a strict, immutable visual design system.
- **Features:** Desktop-native experience, global command palette (Ctrl+K), and rich Recharts visualizations.

### Backend (Python FastAPI)
- **Framework:** Python / FastAPI
- **Database:** Live PostgreSQL managed via Render (schema managed via SQLAlchemy / Alembic).
- **Authentication:** Validates Clerk JWT tokens and auto-provisions QEMS roles and tenant identities on the fly.
- **Security:** Strict RBAC, runtime tenant/project isolation (`/auth/me`), and Idempotency guarantees.
- **Concurrency:** Optimistic Concurrency Control (OCC) using explicitly tracked `version` integers to prevent state-overwrite collisions (HTTP 409).

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

### 1. Start the Backend API
The backend connects directly to your live Render PostgreSQL database via the `.env` file connection string.

```bash
# Navigate to the backend directory
cd backend

# Activate your virtual environment and install dependencies
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Start the FastAPI server (Hot-reloading enabled)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Start the Frontend
The frontend uses Clerk for authentication and connects to the backend API.

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite React app in the browser
npm run dev

# OR start the Electron desktop shell (Make sure to run `npx electron-builder install-app-deps` first if needed)
npm run dev:electron
```

## 🔐 Environment Variables & Security

### Frontend (`.env.local`)
- `VITE_API_URL`: Points to your FastAPI backend (e.g., `https://probare.onrender.com/api/v1` or `http://localhost:8000/api/v1`).
- `VITE_CLERK_PUBLISHABLE_KEY`: Your Clerk Public Key for the login flow.
- `VITE_USE_REAL_AI`: Set to `true` to enable live LLM categorization features.

### Backend (`.env`)
- `APPLICATION_ENV`: Set to `production` or `development`.
- `SQLALCHEMY_DATABASE_URI`: Connection string for your live PostgreSQL database on Render.
- `CLERK_ISSUER_URL`: The well-known JWKS issuer URL from your Clerk dashboard for secure token validation.

## 📂 Project Structure

```text
├── backend/                  # Python FastAPI Backend
│   ├── alembic/              # Database Migrations
│   ├── app/
│   │   ├── api/v1/routers/   # REST API Endpoints
│   │   ├── models/           # SQLAlchemy DB Models
│   │   ├── schemas/          # Pydantic validation schemas
│   │   └── services/         # Core business logic & Auth provisioning
│   └── tests/                # Pytest integration & unit tests
├── frontend/                 # React & Electron Frontend
│   ├── src/                  # React Source Code
│   │   ├── components/       # UI Components
│   │   ├── context/          # QEMSContext & Providers
│   │   └── services/api/     # Centralized Axios Client & Domain APIs
│   ├── electron/             # Electron main & preload scripts
│   └── package.json          # Frontend dependencies and scripts
└── README.md                 # Project Documentation
```

## ⚠️ Important Rules
1. **Visual Immutable Source of Truth:** The UI is strictly governed by pre-approved designs. No layout DOM, Tailwind classes, or global CSS should be organically modified during backend integration tasks.
2. **Production Database:** Local backend instances connect directly to the live production database. Be careful when running destructive migrations.
3. **Idempotency Standards:** Critical mutation endpoints utilize `expected_version` checks to safely handle duplicate network calls and overlapping user edits.
