import { existsSync, readFileSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';

const repoRoot = process.cwd();
const distRoot = resolve(repoRoot, 'dist');
const astroConfigPath = resolve(repoRoot, 'astro.config.ts');
const astroConfigSource = readFileSync(astroConfigPath, 'utf8');
const siteOrigin =
  astroConfigSource.match(/^\s*site:\s*'([^'\n]+)'\s*,?\s*$/mu)?.[1] ??
  (() => {
    throw new Error('Expected astro.config.ts to declare a site URL.');
  })();

const attributePatterns = [
  { attribute: 'href', regex: /\bhref\s*=\s*["']([^"']+)["']/gu },
  { attribute: 'src', regex: /\bsrc\s*=\s*["']([^"']+)["']/gu },
  { attribute: 'srcset', regex: /\bsrcset\s*=\s*["']([^"']+)["']/gu },
];

const requiredPublicRoutes = ['/', '/people/', '/research/', '/publications/', '/news/', '/positions/', '/contact/', '/404.html'];
const disallowedGeneratedRoutes = new Set([
  '/people.html',
  '/research.html',
  '/publications.html',
  '/news.html',
  '/positions.html',
  '/contact.html',
  '/gallery.html',
  '/teaching.html',
  '/pages/LISC.html',
  '/pages/PHD-NSL.html',
  '/pages/RF-ANSR.html',
  '/pages/RA-CCU.html',
  '/pages/RA-LLwL-OD.html',
  '/pages/RA-DP-VN.html',
  '/pages/RA-LLwL-VC.html',
]);

const shouldSkipReference = (value) =>
  value.length === 0 || /^(?:https?:|mailto:|tel:|data:|javascript:)/u.test(value);

const collectFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
      continue;
    }

    files.push(entryPath);
  }

  return files;
};

const toPosixPath = (value) => value.split('\\').join('/');

const toFileTargetPath = (filePath) => {
  const fileRelativePath = toPosixPath(relative(distRoot, filePath));
  return `/${fileRelativePath}`;
};

const toRoutePath = (filePath) => {
  const fileRelativePath = toPosixPath(relative(distRoot, filePath));

  if (fileRelativePath === 'index.html') {
    return '/';
  }

  if (fileRelativePath.endsWith('/index.html')) {
    return `/${fileRelativePath.slice(0, -'index.html'.length)}`;
  }

  return `/${fileRelativePath}`;
};

const extractAnchors = (html) => {
  const anchors = new Set();

  for (const match of html.matchAll(/\sid\s*=\s*["']([^"']+)["']/gu)) {
    const anchorId = match[1];
    if (anchorId) {
      anchors.add(anchorId);
    }
  }

  return anchors;
};

const expandAttributeValues = (attribute, value) => {
  if (attribute !== 'srcset') {
    return [value];
  }

  return value
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/u)[0])
    .filter(Boolean);
};

const resolveInternalTarget = (fromRoutePath, reference) => {
  if (shouldSkipReference(reference)) {
    return null;
  }

  const resolved = new URL(reference, new URL(fromRoutePath, siteOrigin));
  if (resolved.origin !== siteOrigin) {
    return null;
  }

  return {
    pathname: decodeURIComponent(resolved.pathname),
    hash: resolved.hash.slice(1),
  };
};

const lineNumberForIndex = (content, index) => content.slice(0, index).split('\n').length;

const main = async () => {
  if (!existsSync(distRoot)) {
    throw new Error('dist/ is missing. Run pnpm build before pnpm test:e2e so preview and link validation use current output.');
  }

  const files = await collectFiles(distRoot);
  const availableTargets = new Set();
  const pageAnchors = new Map();
  const htmlFiles = [];

  for (const filePath of files) {
    const fileTargetPath = toFileTargetPath(filePath);
    availableTargets.add(fileTargetPath);

    if (extname(filePath) !== '.html') {
      continue;
    }

    const routePath = toRoutePath(filePath);
    const html = await readFile(filePath, 'utf8');
    const anchors = extractAnchors(html);

    availableTargets.add(routePath);
    pageAnchors.set(routePath, anchors);
    pageAnchors.set(fileTargetPath, anchors);
    htmlFiles.push({ filePath, routePath, html });
  }

  const missingRoutes = requiredPublicRoutes.filter((routePath) => !availableTargets.has(routePath));
  if (missingRoutes.length > 0) {
    throw new Error(`Generated output is missing required public routes: ${missingRoutes.join(', ')}`);
  }

  const emittedLegacyRoutes = [...disallowedGeneratedRoutes].filter((routePath) => availableTargets.has(routePath));
  if (emittedLegacyRoutes.length > 0) {
    throw new Error(`Generated output still contains retired legacy routes: ${emittedLegacyRoutes.join(', ')}`);
  }

  const errors = [];
  let checkedReferenceCount = 0;

  for (const htmlFile of htmlFiles) {
    for (const { attribute, regex } of attributePatterns) {
      for (const match of htmlFile.html.matchAll(regex)) {
        const [fullMatch, rawValue] = match;
        const matchIndex = match.index ?? 0;

        if (typeof rawValue !== 'string') {
          continue;
        }

        for (const reference of expandAttributeValues(attribute, rawValue)) {
          const target = resolveInternalTarget(htmlFile.routePath, reference);
          if (!target) {
            continue;
          }

          checkedReferenceCount += 1;

          if (!availableTargets.has(target.pathname)) {
            errors.push(
              `${relative(repoRoot, htmlFile.filePath)}:${lineNumberForIndex(htmlFile.html, matchIndex + fullMatch.indexOf(rawValue))} ` +
                `${attribute}="${reference}" resolves to missing path "${target.pathname}".`,
            );
            continue;
          }

          if (target.hash.length > 0) {
            const anchors = pageAnchors.get(target.pathname);
            if (!anchors || !anchors.has(target.hash)) {
              errors.push(
                `${relative(repoRoot, htmlFile.filePath)}:${lineNumberForIndex(htmlFile.html, matchIndex + fullMatch.indexOf(rawValue))} ` +
                  `${attribute}="${reference}" resolves to missing anchor "#${target.hash}" on "${target.pathname}".`,
              );
            }
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Generated output validation failed:\n- ${errors.join('\n- ')}`);
  }

  console.log(
    `Generated output validation passed for ${htmlFiles.length} HTML files and ${checkedReferenceCount} internal href/src references in dist/.`,
  );
};

await main();
