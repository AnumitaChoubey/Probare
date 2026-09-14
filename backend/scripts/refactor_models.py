import os
import glob
import re

models_dir = os.path.join(os.path.dirname(__file__), "..", "app", "db", "models")
files = glob.glob(os.path.join(models_dir, "*.py"))

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Replacements
    # 1. Imports
    content = re.sub(r'from sqlalchemy\.dialects\.postgresql import (.*?)UUID(.*?)\n', r'', content)
    content = re.sub(r'from sqlalchemy\.dialects\.postgresql import (.*?)JSONB(.*?)\n', r'', content)
    content = re.sub(r'from sqlalchemy\.dialects\.postgresql import (.*?)ARRAY(.*?)\n', r'', content)
    
    # Clean up empty import lines if any were combined
    content = re.sub(r'from sqlalchemy\.dialects\.postgresql import \n', r'', content)
    
    # Make sure Uuid and JSON are imported from sqlalchemy
    if 'from sqlalchemy import' in content:
        if 'Uuid' not in content:
            content = content.replace('from sqlalchemy import ', 'from sqlalchemy import Uuid, JSON, ')
    else:
        content = 'from sqlalchemy import Uuid, JSON\n' + content

    # 2. Type usages
    content = content.replace('UUID(as_uuid=True)', 'Uuid')
    content = content.replace('JSONB', 'JSON')
    
    # 3. ARRAY replacements (SQLite uses JSON for arrays)
    content = content.replace('ARRAY(Uuid)', 'JSON')
    content = content.replace('ARRAY(String)', 'JSON')
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print(f"Refactored {len(files)} model files for portable types.")
