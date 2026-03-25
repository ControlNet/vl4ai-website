import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const repoRoot = process.cwd();
const srcRoot = resolve(repoRoot, 'src');
const publicRoot = resolve(repoRoot, 'public');

const allowedInternalRoutes = new Set([
  '/',
  '/people/',
  '/research/',
  '/publications/',
  '/news/',
  '/gallery/',
  '/positions/',
  '/contact/',
  '/404.html',
]);
const fileExtensionsToScan = new Set(['.astro', '.ts']);
const hrefPatterns = [
  /\bhref\s*=\s*["']([^"'{}]+)["']/gu,
  /\bhref\s*:\s*["']([^"'{}]+)["']/gu,
];

const shouldSkipReference = (value) =>
  value.length === 0 ||
  value.startsWith('#') ||
  /^(?:https?:|mailto:|tel:|data:|javascript:)/u.test(value) ||
  !value.startsWith('/');

const lineNumberForIndex = (content, index) => content.slice(0, index).split('\n').length;

const isKnownPublicAsset = (pathname) => {
  if (pathname === '/') {
    return false;
  }

  return existsSync(resolve(publicRoot, decodeURIComponent(pathname.slice(1))));
};

const collectFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
      continue;
    }

    if (!fileExtensionsToScan.has(entry.name.slice(entry.name.lastIndexOf('.')))) {
      continue;
    }

    files.push(entryPath);
  }

  return files;
};

const validateReference = (reference, filePath, content, matchIndex, errors) => {
  if (shouldSkipReference(reference)) {
    return;
  }

  const [pathname] = reference.split('#');
  if (allowedInternalRoutes.has(pathname) || isKnownPublicAsset(pathname)) {
    return;
  }

  errors.push(
    `${relative(repoRoot, filePath)}:${lineNumberForIndex(content, matchIndex)} uses unresolved internal href "${reference}". ` +
      'Use one of the approved public routes (/ , /people/, /research/, /publications/, /news/, /gallery/, /positions/, /contact/, /404.html) or a file that exists under public/.',
  );
};

const main = async () => {
  const files = await collectFiles(srcRoot);
  const errors = [];
  let checkedReferenceCount = 0;

  for (const filePath of files) {
    const content = await readFile(filePath, 'utf8');

    for (const pattern of hrefPatterns) {
      for (const match of content.matchAll(pattern)) {
        const [fullMatch, reference] = match;
        const matchIndex = match.index ?? 0;

        if (typeof reference !== 'string') {
          continue;
        }

        checkedReferenceCount += 1;
        validateReference(reference, filePath, content, matchIndex + fullMatch.indexOf(reference), errors);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Source href lint failed:\n- ${errors.join('\n- ')}`);
  }

  console.log(`Source href lint passed for ${checkedReferenceCount} literal href values across ${files.length} source files.`);
};

await main();
