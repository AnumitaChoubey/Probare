import glob

for f in glob.glob('app/db/models/*.py'):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Just aggressively add String, Integer, Uuid to the imports if they are not there
    if "from sqlalchemy import Uuid, JSON" in content:
        content = content.replace("from sqlalchemy import Uuid, JSON\nfrom sqlalchemy import (", "from sqlalchemy import Uuid, JSON\nfrom sqlalchemy import (\n    String, Integer,")
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
print("Imports fixed")
