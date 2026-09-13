import glob

for f in glob.glob('app/db/models/*.py'):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    content = content.replace('from sqlalchemy import Uuid, JSON, (', 'from sqlalchemy import Uuid, JSON\nfrom sqlalchemy import (')
    content = content.replace('from sqlalchemy import Uuid, JSON, Column', 'from sqlalchemy import Uuid, JSON, Column') # Should be fine
    
    # also fix ARRAY usages just in case they were missed
    content = content.replace('ARRAY(Uuid)', 'JSON')
    content = content.replace('ARRAY(String)', 'JSON')
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
print("Syntax fixed")
