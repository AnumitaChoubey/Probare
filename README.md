# Probare (Quality Error Management System)

> A full-stack web application that digitizes, tracks, and arbitrates quality errors identified in business operations. 

Probare (Latin: "to test / to prove") serves as a formal adjudication platform for QA and Operations teams. It replaces ad-hoc error management (like spreadsheets or email chains) with a robust state machine, automated SLA tracking, and an immutable audit trail.

## 🚀 Key Features

* **Strict State Machine Workflow**: Errors follow a formal lifecycle (`DRAFT` → `PENDING ACK` → `REBUTTAL` → `DECISION` → `CLOSED`).
* **Automated SLA Engine**: A background worker detects missed deadlines, escalates tickets, and triggers notifications automatically.
* **Role-Based Arbitration**: Distinct roles for Auditors, QA Leads, and Ops Agents to manage dispute resolution (Rebuttals).
* **Dynamic Configuration**: Admins can manage SLA windows, escalation matrices, and ownership routing rules without code deployments via a versioned, insert-only database structure.
* **Evidence Management**: Secure file uploads with versioning (supersedes chain) to support error justifications.
* **Live Dashboards**: Real-time SLA health, team-level metrics, and executive trends built with Recharts.

## 🛠️ Technology Stack

**Backend:**
* Python 3.12+
* FastAPI & Pydantic V2
* SQLAlchemy 2.0 (Async) & Alembic (Migrations)
* PostgreSQL 15 & asyncpg
* APScheduler (Background Jobs)
* JWT Authentication & bcrypt

**Frontend:**
* React 18 & TypeScript
* Vite
* TailwindCSS
* React Router DOM
* Recharts & Lucide React

## 📦 How to Run Locally

### 1. Database Setup
Ensure you have Docker installed and running.
```bash
docker-compose up -d
```
*(This starts PostgreSQL on port 5433 and Redis on port 6379)*

### 2. Backend Setup
Navigate to the backend directory, set up your Python environment, and run the API:
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # On Windows
# source venv/bin/activate     # On Linux/Mac

pip install -r requirements.txt

# Copy the env template and generate a secret key
cp .env.example .env

# Run database migrations and seed initial data
alembic upgrade head
python scripts/seed.py

# Start the FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
*API documentation will be available at `http://localhost:8000/docs`*

### 3. Frontend Setup
In a new terminal, navigate to the frontend directory:
```bash
cd frontend
npm install
npm run dev
```
*The React app will be available at `http://localhost:5173`*

---
*Built with ❤️ by the Probare Team.*
