import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const repoRoot = process.cwd();
const astroConfigPath = resolve(repoRoot, 'astro.config.ts');
const robotsPath = resolve(repoRoot, 'public/robots.txt');
const astroConfigSource = readFileSync(astroConfigPath, 'utf8');

const siteOrigin =
  astroConfigSource.match(/^\s*site:\s*'([^'\n]+)'\s*,?\s*$/mu)?.[1] ??
  (() => {
    throw new Error('Expected astro.config.ts to declare a site URL.');
  })();

const robotsContents = [`User-agent: *`, `Allow: /`, ``, `Sitemap: ${siteOrigin}/sitemap-index.xml`, ``].join('\n');

await mkdir(dirname(robotsPath), { recursive: true });
await writeFile(robotsPath, robotsContents, 'utf8');

console.log(`Synced public/robots.txt from astro.config.ts site: ${siteOrigin}`);
