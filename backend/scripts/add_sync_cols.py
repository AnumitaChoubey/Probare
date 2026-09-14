import re

def add_columns(filepath, columns_str):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # insert before the final newlines or at the end of the class
    # just find the last column definition and append it
    last_col_idx = content.rfind("Column(")
    if last_col_idx == -1:
        return
        
    end_of_line_idx = content.find("\n", last_col_idx)
    if end_of_line_idx == -1:
        end_of_line_idx = len(content)
        
    new_content = content[:end_of_line_idx] + "\n" + columns_str + content[end_of_line_idx:]
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(new_content)

sync_cols = """
    # Sync Columns
    local_id = Column(Uuid, nullable=True, unique=True, index=True)
    sync_status = Column(String(20), default="SYNCED", nullable=False)
    updated_by_device_id = Column(Uuid, nullable=True)
    version = Column(Integer, default=1, nullable=False)"""

append_only_cols = """
    # Sync Columns
    local_id = Column(Uuid, nullable=True, unique=True, index=True)"""

tables = [
    ("app/db/models/error.py", sync_cols),
    ("app/db/models/rebuttal.py", sync_cols),
    ("app/db/models/decision.py", sync_cols),
    ("app/db/models/evidence_file.py", sync_cols),
    ("app/db/models/in_app_notification.py", sync_cols),
    ("app/db/models/error_status_history.py", append_only_cols)
]

for file, cols in tables:
    add_columns(file, cols)
    print(f"Added columns to {file}")
