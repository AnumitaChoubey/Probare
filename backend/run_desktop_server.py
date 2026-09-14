import argparse
import os
import sys

def parse_early_args():
    parser = argparse.ArgumentParser(description="QEMS Desktop Backend")
    parser.add_argument("--port", type=int, default=8765, help="Port to run the server on")
    parser.add_argument("--db-path", type=str, required=True, help="Path to the SQLite database")
    args, _ = parser.parse_known_args()
    return args

early_args = parse_early_args()
os.environ["SQLITE_DB_PATH"] = early_args.db_path

import uvicorn
from sqlalchemy import create_engine
from alembic.config import Config
from alembic import command

# Force Pyinstaller to bundle dynamic modules by importing them statically here
import app.auth.deps
import app.core.config
import app.api.v1.endpoints.sync
import app.sync.worker

# Force import all models for PyInstaller
import app.db.models
import app.db.models.sync

def run_migrations(db_path: str):
    
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
    args = early_args
    
    # Ensure SQLite path is set for the backend config
    os.environ["SQLITE_DB_PATH"] = args.db_path
    from app.core.config import settings
    settings.SQLITE_DB_PATH = args.db_path
    
    # We must run migrations before importing app.main because importing it 
    # triggers db models and we want to make sure the db is ready
    run_migrations(args.db_path)
    
    # Now import the app after environment variables are set
    from app.main import app
    
    print(f"Starting QEMS desktop backend on 127.0.0.1:{args.port} with DB {args.db_path}")
    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="info")

if __name__ == "__main__":
    main()
