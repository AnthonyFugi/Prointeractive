import os, re, sys

def collect(root, exts):
    out = []
    for dp, dn, fn in os.walk(root):
        if 'node_modules' in dp: continue
        for f in fn:
            if os.path.splitext(f)[1] in exts:
                out.append(os.path.join(dp, f))
    return out

def exports_of(path):
    try: s = open(path).read()
    except: return None
    names = set()
    for m in re.finditer(r'export\s+(?:const|let|var|function|async\s+function|class)\s+(\w+)', s):
        names.add(m.group(1))
    for m in re.finditer(r'export\s*\{([^}]*)\}', s):
        for part in m.group(1).split(','):
            part = part.strip()
            if not part: continue
            names.add(part.split(' as ')[-1].strip())
    if re.search(r'export\s+default', s): names.add('default')
    return names

def resolve(importer, spec):
    if not spec.startswith('.'): return None
    base = os.path.normpath(os.path.join(os.path.dirname(importer), spec))
    for cand in [base, base+'.js', base+'.jsx', base+'/index.js', base+'/index.jsx']:
        if os.path.isfile(cand): return cand
    return base  # missing

problems = []
for root, exts in [('frontend/src', {'.js','.jsx'}), ('mobile/src', {'.js','.jsx'}), ('backend', {'.js'})]:
    for f in collect(root, exts):
        s = open(f).read()
        for m in re.finditer(r"import\s+([^;]+?)\s+from\s+['\"]([^'\"]+)['\"]", s, re.S):
            clause, spec = m.group(1), m.group(2)
            target = resolve(f, spec)
            if target is None: continue
            if not os.path.isfile(target):
                problems.append((f, spec, 'MISSING FILE', ''))
                continue
            exp = exports_of(target)
            named = re.search(r'\{([^}]*)\}', clause)
            wanted = []
            if named:
                for part in named.group(1).split(','):
                    part = part.strip()
                    if part: wanted.append(part.split(' as ')[0].strip())
            if re.match(r'^\s*\w', clause) and not clause.strip().startswith('{'):
                wanted.append('default')
            for w in wanted:
                if w and w not in exp:
                    problems.append((f, spec, 'NOT EXPORTED', w))

if problems:
    print(f"{len(problems)} broken import(s):\n")
    for f, spec, kind, name in problems:
        print(f"  {kind:14} {name or spec:24} in {f}\n{'':17} from '{spec}'")
else:
    print("All local imports resolve. No drift.")
