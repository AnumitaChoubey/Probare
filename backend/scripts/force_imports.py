import glob

for f in glob.glob('app/db/models/*.py'):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Just add a totally separate import line at the top of every model file
    new_imports = "\nfrom sqlalchemy import Column, String, Integer, Uuid, Boolean, Float, Text, Date, DateTime, BigInteger, ForeignKey, CheckConstraint, Index\n"
    if "from sqlalchemy import Column, String, Integer" not in content:
        content = new_imports + content
        
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
print("Imports forced")
