import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove dark mode classes entirely
    content = re.sub(r'\bdark:[a-zA-Z0-9\-\/]+\s*', '', content)
    
    # Semantic mapping for QEMS visual density
    replacements = {
        'bg-indigo-50': 'bg-qems-brand-light',
        'bg-indigo-100': 'bg-qems-brand-light',
        'text-indigo-600': 'text-qems-brand-dark',
        'text-indigo-700': 'text-qems-brand-dark',
        'bg-indigo-600': 'bg-qems-brand',
        'hover:bg-indigo-700': 'hover:bg-qems-brand-dark',
        'hover:bg-indigo-50': 'hover:bg-qems-brand-light',
        'border-indigo-600': 'border-qems-brand-dark',
        'border-indigo-200': 'border-qems-brand',
        'focus:ring-indigo-500': 'focus:ring-qems-brand',
        'focus:border-indigo-500': 'focus:border-qems-brand',
        
        'text-slate-900': 'text-qems-text-primary',
        'text-slate-800': 'text-qems-text-primary',
        'text-slate-700': 'text-qems-text-secondary',
        'text-slate-600': 'text-qems-text-muted',
        'text-slate-500': 'text-qems-text-muted',
        'text-slate-400': 'text-qems-text-disabled',
        
        'bg-slate-50': 'bg-qems-bg-surface',
        'bg-slate-100': 'bg-qems-bg-secondary',
        'bg-white': 'bg-qems-bg-white',
        
        'border-slate-200': 'border-qems-border',
        'border-slate-100': 'border-qems-border-light',
        
        'text-rose-600': 'text-qems-danger',
        'text-rose-700': 'text-qems-danger-dark',
        'bg-rose-50': 'bg-qems-danger-bg',
        'bg-rose-600': 'bg-qems-danger',
        
        'bg-emerald-600': 'bg-qems-success',
        'text-emerald-600': 'text-qems-success',
        'bg-emerald-50': 'bg-qems-success-bg',
        'text-emerald-700': 'text-qems-success-dark',
        
        'text-amber-600': 'text-qems-warning',
        'bg-amber-50': 'bg-qems-warning-bg',
        'text-amber-700': 'text-qems-warning-dark',
        'bg-amber-600': 'bg-qems-warning',
        
        'backdrop-blur-xs': '',
        'backdrop-blur-sm': '',
        'backdrop-blur-md': '',
    }
    
    for old, new in replacements.items():
        content = re.sub(r'\b' + re.escape(old) + r'\b', new, content)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for root, _, files in os.walk(r'D:\Probare\frontend\src\components'):
    for file in files:
        if file.endswith('.tsx'):
            process_file(os.path.join(root, file))

for root, _, files in os.walk(r'D:\Probare\frontend\src\context'):
    for file in files:
        if file.endswith('.tsx'):
            process_file(os.path.join(root, file))
