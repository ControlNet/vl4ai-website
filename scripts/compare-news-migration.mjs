import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const repoRoot = process.cwd();
const oldNewsHtmlPath = resolve(repoRoot, '../vl4ai-website-old/news.html');
const newNewsTomlPath = resolve(repoRoot, 'src/content/news/index.toml');

const monthLookup = new Map([
  ['jan', '01'],
  ['january', '01'],
  ['feb', '02'],
  ['february', '02'],
  ['mar', '03'],
  ['march', '03'],
  ['apr', '04'],
  ['april', '04'],
  ['may', '05'],
  ['jun', '06'],
  ['june', '06'],
  ['jul', '07'],
  ['july', '07'],
  ['aug', '08'],
  ['august', '08'],
  ['sep', '09'],
  ['september', '09'],
  ['oct', '10'],
  ['october', '10'],
  ['nov', '11'],
  ['november', '11'],
  ['dec', '12'],
  ['december', '12'],
]);

const normalizeWhitespace = (value) => value.replace(/\s+/gu, ' ').trim();

const decodeHtmlEntities = (value) =>
  value
    .replace(/&amp;/gu, '&')
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>');

const stripTags = (value) => normalizeWhitespace(decodeHtmlEntities(value.replace(/<[^>]+>/gu, ' ')));

const normalizeInlinePunctuation = (value) => value.replace(/\s+([.,!?;:])/gu, '$1');

const normalizeVisibleSentence = (value) => {
  const normalized = normalizeInlinePunctuation(normalizeWhitespace(value));
  return normalized.endsWith('.') ? normalized : `${normalized}.`;
};

const toIsoDate = (legacyDate) => {
  const normalized = normalizeWhitespace(legacyDate).replace(/,/gu, '');
  const [monthRaw, yearRaw] = normalized.split(' ');
  const monthKey = monthRaw?.toLowerCase();
  const month = monthKey ? monthLookup.get(monthKey) : undefined;

  if (!month || !yearRaw || !/^\d{4}$/u.test(yearRaw)) {
    throw new Error(`Could not convert legacy date label "${legacyDate}" to ISO format.`);
  }

  return `${yearRaw}-${month}-01`;
};

const parseOldNewsHtml = (html) => {
  const cleanedHtml = html.replace(/<!--[\s\S]*?-->/gu, ' ');
  const itemPattern =
    /<div class="span4 feature-item">[\s\S]*?<span class="date">([\s\S]*?)<\/span>[\s\S]*?<img\s+src="([^"]+)"[\s\S]*?<h4 class="feature-heading">([\s\S]*?)<\/h4>[\s\S]*?<p>([\s\S]*?)<\/p>/gu;

  const blocks = [...cleanedHtml.matchAll(itemPattern)];

  return blocks.map((match) => {
    const [, rawDate, rawImage, headingHtml, summaryHtml] = match;
    const titleHrefMatch = headingHtml.match(/<a\s+href="([^"]*)"/u);
    const summaryHrefMatch = summaryHtml.match(/<a\s+href="([^"]*)"/u);

    return {
      date: toIsoDate(rawDate ?? ''),
      title: normalizeInlinePunctuation(stripTags(headingHtml)).replace(/\s+\.$/u, '.'),
      summary: normalizeVisibleSentence(stripTags(summaryHtml)),
      image: rawImage ?? '',
      titleHref: titleHrefMatch?.[1] ?? '',
      summaryHref: summaryHrefMatch?.[1] ?? '',
    };
  });
};

const parseNewNewsToml = (text) => {
  const rawItems = [];
  let currentItem;

  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    const lineNumber = index + 1;
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
      continue;
    }

    if (trimmedLine === '[[item]]') {
      currentItem = {};
      rawItems.push(currentItem);
      continue;
    }

    if (!currentItem) {
      throw new Error(`Expected [[item]] before properties at line ${lineNumber}.`);
    }

    const fieldMatch = trimmedLine.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(.+)$/u);
    if (!fieldMatch) {
      throw new Error(`Could not parse TOML line ${lineNumber}: ${trimmedLine}`);
    }

    const [, fieldName, rawValueLiteral] = fieldMatch;
    currentItem[fieldName] = JSON.parse(rawValueLiteral);
  }

  return rawItems.map((item, index) => ({
    index,
    date: item.date,
    title: item.title,
    summary: item.summary,
    image: item.image,
    link: item.link,
  }));
};

const compareEntries = (oldEntries, newEntries) => {
  const mismatches = [];
  const anomalies = [];
  const maxLength = Math.max(oldEntries.length, newEntries.length);

  for (let index = 0; index < maxLength; index += 1) {
    const oldEntry = oldEntries[index];
    const newEntry = newEntries[index];
    const humanIndex = index + 1;

    if (!oldEntry) {
      mismatches.push(`extra new item #${humanIndex}: ${JSON.stringify(newEntry)}`);
      continue;
    }

    if (!newEntry) {
      mismatches.push(`missing new item for old item #${humanIndex}: ${oldEntry.date} :: ${oldEntry.title}`);
      continue;
    }

    for (const field of ['date', 'title', 'summary', 'image']) {
      if (oldEntry[field] !== newEntry[field]) {
        mismatches.push(
          `item #${humanIndex} ${field} mismatch\n  old: ${oldEntry[field]}\n  new: ${newEntry[field]}`,
        );
      }
    }

    const nonEmptyLegacyLinks = [oldEntry.titleHref, oldEntry.summaryHref].filter((value) => value.length > 0);
    const uniqueLegacyLinks = [...new Set(nonEmptyLegacyLinks)];

    if (oldEntry.titleHref !== oldEntry.summaryHref) {
      anomalies.push(
        `item #${humanIndex} link anomaly in legacy HTML: titleHref="${oldEntry.titleHref}" summaryHref="${oldEntry.summaryHref}" newLink="${newEntry.link}"`,
      );
    }

    if (uniqueLegacyLinks.length === 0) {
      anomalies.push(`item #${humanIndex} has no legacy href in news.html; newLink="${newEntry.link}" cannot be directly verified from news.html.`);
      continue;
    }

    if (!uniqueLegacyLinks.includes(newEntry.link)) {
      mismatches.push(
        `item #${humanIndex} link mismatch\n  old: ${uniqueLegacyLinks.join(' | ')}\n  new: ${newEntry.link}`,
      );
    }
  }

  return { mismatches, anomalies };
};

const main = async () => {
  const [oldHtml, newToml] = await Promise.all([
    readFile(oldNewsHtmlPath, 'utf8'),
    readFile(newNewsTomlPath, 'utf8'),
  ]);

  const oldEntries = parseOldNewsHtml(oldHtml);
  const newEntries = parseNewNewsToml(newToml);
  const { mismatches, anomalies } = compareEntries(oldEntries, newEntries);

  console.log(`Old entries: ${oldEntries.length}`);
  console.log(`New entries: ${newEntries.length}`);

  if (anomalies.length > 0) {
    console.log('\nLegacy anomalies:');
    for (const anomaly of anomalies) {
      console.log(`- ${anomaly}`);
    }
  }

  if (mismatches.length > 0) {
    console.error('\nMigration mismatches:');
    for (const mismatch of mismatches) {
      console.error(`- ${mismatch}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('\nMigration diff passed with no structured mismatches.');
};

await main();
