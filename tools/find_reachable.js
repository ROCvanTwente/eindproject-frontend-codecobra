const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(process.cwd(), 'Digital Tour App Prototype', 'src', 'app');
const entryRoots = [
  path.join(rootDir, 'App.tsx'),
  path.join(rootDir, 'components', 'LoginScreen.tsx'),
  path.join(rootDir, 'components', 'AdminPanel.tsx')
];

function walk(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const p = path.join(dir, it.name);
    if (it.isDirectory()) files.push(...walk(p));
    else if (/\.(ts|tsx|js|jsx)$/.test(it.name)) files.push(p);
  }
  return files;
}

function readImports(filePath) {
  try {
    const src = fs.readFileSync(filePath, 'utf8');
    const importRegex = /import\s+(?:[^'";]+from\s+)?['"]([^'"\n]+)['"];?/g;
    const requires = [];
    let m;
    while ((m = importRegex.exec(src))) {
      requires.push(m[1]);
    }
    // also look for require('...')
    const reqRegex = /require\(['"]([^'"\n]+)['"]\)/g;
    while ((m = reqRegex.exec(src))) {
      requires.push(m[1]);
    }
    return requires;
  } catch (e) {
    return [];
  }
}

function resolveImport(fromFile, imp) {
  if (!imp.startsWith('.')) return null;
  const base = path.dirname(fromFile);
  const candidate = path.resolve(base, imp);
  const exts = ['.ts', '.tsx', '.js', '.jsx'];
  // exact file
  for (const e of exts) {
    if (fs.existsSync(candidate + e)) return candidate + e;
  }
  // as given (maybe has extension)
  if (fs.existsSync(candidate)) return candidate;
  // index files in folder
  for (const e of exts) {
    if (fs.existsSync(path.join(candidate, 'index' + e))) return path.join(candidate, 'index' + e);
  }
  return null;
}

const allFiles = walk(rootDir);
const fileSet = new Set(allFiles.map(p => path.resolve(p)));
const adj = new Map();
for (const f of allFiles) {
  const abs = path.resolve(f);
  const imports = readImports(abs);
  const resolved = [];
  for (const imp of imports) {
    const r = resolveImport(abs, imp);
    if (r) resolved.push(path.resolve(r));
  }
  adj.set(abs, resolved);
}

const reachable = new Set();
const stack = [];
for (const r of entryRoots) {
  if (fs.existsSync(r)) {
    stack.push(path.resolve(r));
  }
}
while (stack.length) {
  const cur = stack.pop();
  if (reachable.has(cur)) continue;
  reachable.add(cur);
  const neigh = adj.get(cur) || [];
  for (const n of neigh) if (!reachable.has(n)) stack.push(n);
}

const reachableList = [...reachable].sort();
const unreachableList = [...allFiles.map(f => path.resolve(f)).filter(f => !reachable.has(f))].sort();

console.log(JSON.stringify({rootDir, entryRoots, reachable: reachableList, unreachable: unreachableList}, null, 2));
