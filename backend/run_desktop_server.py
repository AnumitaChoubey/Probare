import argparse
import os
import sys
import uvicorn
from alembic.config import Config
from alembic import command
import importlib

# Force import all models for PyInstaller
import app.db.models
import app.db.models.sync

def parse_args():
    parser = argparse.ArgumentParser(description="QEMS Desktop Backend")
    parser.add_argument("--port", type=int, default=8765, help="Port to run the server on")
    parser.add_argument("--db-path", type=str, required=True, help="Path to the SQLite database")
    return parser.parse_args()

def run_migrations(db_path: str):
    print(f"Running SQLite migrations on {db_path}...")
    
    # Alembic assumes it's running from the root where alembic_sqlite.ini is
    base_dir = os.path.dirname(os.path.abspath(__file__))
    alembic_ini_path = os.path.join(base_dir, "alembic_sqlite.ini")
    
    alembic_cfg = Config(alembic_ini_path)
    
    # Execute the migration
    try:
        command.upgrade(alembic_cfg, "head")
        print("Migrations completed successfully.")
    except Exception as e:
        print(f"Failed to run migrations: {e}")
        sys.exit(1)

def main():
    args = parse_args()
    
    # Ensure SQLite path is set for the backend config
    os.environ["SQLITE_DB_PATH"] = args.db_path
    
    # We must run migrations before importing app.main because importing it 
    # triggers db models and we want to make sure the db is ready
    run_migrations(args.db_path)
    
    # Now import the app after environment variables are set
    from app.main import app
    
    print(f"Starting QEMS desktop backend on 127.0.0.1:{args.port} with DB {args.db_path}")
    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="info")

if __name__ == "__main__":
    main()
