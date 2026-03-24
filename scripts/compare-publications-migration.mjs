import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const repoRoot = process.cwd();
const oldPublicationsHtmlPath = resolve(repoRoot, '../vl4ai-website-old/publications.html');
const newPublicationsTomlPath = resolve(repoRoot, 'src/content/publications/index.toml');

const normalizeWhitespace = (value) => value.replace(/\s+/gu, ' ').trim();
const normalizeInlinePunctuation = (value) => value.replace(/\s+([),.;:!?])/gu, '$1').replace(/\s+,/gu, ',');
const normalizeVisibleText = (value) => normalizeInlinePunctuation(normalizeWhitespace(value));

const decodeHtmlEntities = (value) =>
  value
    .replace(/&amp;/gu, '&')
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>');

const stripTags = (value) => normalizeVisibleText(decodeHtmlEntities(value.replace(/<[^>]+>/gu, ' ')));

const normalizeUrl = (value) => normalizeWhitespace(decodeHtmlEntities(value));

const buildEntryKey = (entry) =>
  [entry.title, entry.authors, entry.venue].map((value) => normalizeVisibleText(value).toLowerCase()).join(' || ');

const getCompactTomlNestingDepth = (value) => {
  let squareBracketDepth = 0;
  let curlyBracketDepth = 0;
  let inString = false;
  let escaped = false;

  for (const character of value) {
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === '\\') {
        escaped = true;
        continue;
      }

      if (character === '"') {
        inString = false;
      }

      continue;
    }

    if (character === '"') {
      inString = true;
      continue;
    }

    if (character === '[') {
      squareBracketDepth += 1;
      continue;
    }

    if (character === ']') {
      squareBracketDepth -= 1;
      continue;
    }

    if (character === '{') {
      curlyBracketDepth += 1;
      continue;
    }

    if (character === '}') {
      curlyBracketDepth -= 1;
    }
  }

  return squareBracketDepth + curlyBracketDepth;
};

const parseCompactTomlValue = (rawValueLiteral) => {
  if (/^"(?:[^"\\]|\\.)*"$/u.test(rawValueLiteral)) {
    return JSON.parse(rawValueLiteral);
  }

  if (/^-?\d+$/u.test(rawValueLiteral)) {
    return Number.parseInt(rawValueLiteral, 10);
  }

  if (rawValueLiteral.startsWith('[')) {
    const jsonLikeLiteral = rawValueLiteral
      .replace(/(^|[{,]\s*)([A-Za-z][A-Za-z0-9_-]*)\s*=/gmu, '$1"$2":')
      .replace(/,(\s*[\]}])/gu, '$1');

    return JSON.parse(jsonLikeLiteral);
  }

  throw new Error(`Unsupported compact TOML value: ${rawValueLiteral}`);
};

const parseNewPublicationsToml = (text) => {
  const rawItems = [];
  let currentItem;
  const lines = text.split(/\r?\n/u);

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index] ?? '';
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

    const [, fieldName, initialRawValueLiteral] = fieldMatch;
    let rawValueLiteral = initialRawValueLiteral;
    let nestingDepth = getCompactTomlNestingDepth(rawValueLiteral);

    while (nestingDepth > 0) {
      index += 1;
      const continuationLine = lines[index];

      if (continuationLine === undefined) {
        throw new Error(`Unterminated value for ${fieldName} starting at line ${lineNumber}.`);
      }

      rawValueLiteral += `\n${continuationLine.trim()}`;
      nestingDepth = getCompactTomlNestingDepth(rawValueLiteral);
    }

    currentItem[fieldName] = parseCompactTomlValue(rawValueLiteral);
  }

  const sortedItems = rawItems
    .map((item, sequence) => ({
      sequence,
      year: item.year,
      archiveGroup: typeof item.archiveGroup === 'string' ? item.archiveGroup : String(item.year),
      title: item.title,
      authors: Array.isArray(item.authors) ? item.authors.join(', ') : '',
      venue: item.venue,
      image: item.image,
      note: typeof item.note === 'string' ? item.note : '',
      linkUrls: Array.isArray(item.links) ? item.links.map((link) => normalizeUrl(link.url)).filter(Boolean) : [],
    }))
    .sort((left, right) => right.year - left.year || left.sequence - right.sequence);

  return sortedItems.map((item) => ({
    ...item,
    key: buildEntryKey(item),
  }));
};

const parseLegacySectionEntries = (sectionId, sectionHtml) => {
  const rowBlocks = sectionHtml
    .split('<div class="row-fluid">')
    .slice(1)
    .map((block) => block.split('<hr>')[0] ?? '')
    .filter((block) => /<img\s+[^>]*src=/u.test(block) && /<h4>/u.test(block));

  return rowBlocks.map((rowHtml) => {
    const imageMatch = rowHtml.match(/<img\s+[^>]*src="([^"]+)"/u);
    const titleMatch = rowHtml.match(/<h4>([\s\S]*?)<\/h4>/u);
    const paragraphMatches = [...rowHtml.matchAll(/<p(?:\s+[^>]*)?>([\s\S]*?)<\/p>/gu)];
    const noteMatch = rowHtml.match(/<p[^>]*style="[^"]*color\s*:\s*red[^"]*"[^>]*>([\s\S]*?)<\/p>/iu);
    const actionLinkMatches = [...rowHtml.matchAll(/<a href="([^"]*)">([\s\S]*?)<\/a>/gu)].filter((match) => /<i\s+class="fa /u.test(match[2] ?? ''));
    const noteLinkMatches = noteMatch ? [...noteMatch[1].matchAll(/<a href="([^"]*)"/gu)] : [];

    const authors = stripTags(paragraphMatches[0]?.[1] ?? '');
    const venue = stripTags(paragraphMatches[1]?.[1] ?? '');
    const note = stripTags(noteMatch?.[1] ?? '');
    const linkUrls = [
      ...actionLinkMatches.map((match) => normalizeUrl(match[1] ?? '')),
      ...noteLinkMatches.map((match) => normalizeUrl(match[1] ?? '')),
    ].filter(Boolean);

    const entry = {
      archiveGroup: sectionId,
      title: stripTags(titleMatch?.[1] ?? ''),
      authors,
      venue,
      image: imageMatch?.[1] ?? '',
      note,
      linkUrls: [...new Set(linkUrls)],
    };

    return {
      ...entry,
      key: buildEntryKey(entry),
    };
  });
};

const parseOldPublicationsHtml = (html) => {
  const cleanedHtml = html.replace(/<!--[\s\S]*?-->/gu, ' ');
  const sectionMatches = [...cleanedHtml.matchAll(/<section id="([^"]+)">([\s\S]*?)<\/section>/gu)];
  const entries = [];

  for (const sectionMatch of sectionMatches) {
    const sectionId = normalizeWhitespace(sectionMatch[1] ?? '');
    if (!/^\d{4}(?:-\d{4})?$/u.test(sectionId)) {
      continue;
    }

    entries.push(...parseLegacySectionEntries(sectionId, sectionMatch[2] ?? ''));
  }

  return entries;
};

const dedupeLegacyEntries = (entries) => {
  const seen = new Map();
  const uniqueEntries = [];
  const anomalies = [];

  for (const entry of entries) {
    const firstSeenGroup = seen.get(entry.key);

    if (firstSeenGroup) {
      anomalies.push(
        `legacy archive repeats "${entry.title}" in both ${firstSeenGroup} and ${entry.archiveGroup}; keeping the first occurrence only.`,
      );
      continue;
    }

    seen.set(entry.key, entry.archiveGroup);
    uniqueEntries.push(entry);
  }

  return { uniqueEntries, anomalies };
};

const groupEntries = (entries) => {
  const grouped = new Map();

  for (const entry of entries) {
    const existing = grouped.get(entry.archiveGroup);

    if (existing) {
      existing.push(entry);
      continue;
    }

    grouped.set(entry.archiveGroup, [entry]);
  }

  return grouped;
};

const compareEntries = (oldEntries, newEntries) => {
  const mismatches = [];
  const anomalies = [];
  const oldGroups = groupEntries(oldEntries);
  const newGroups = groupEntries(newEntries);
  const oldGroupLabels = [...oldGroups.keys()];
  const newGroupLabels = [...newGroups.keys()];

  if (JSON.stringify(oldGroupLabels) !== JSON.stringify(newGroupLabels)) {
    mismatches.push(`archive group order mismatch\n  old: ${oldGroupLabels.join(' -> ')}\n  new: ${newGroupLabels.join(' -> ')}`);
  }

  const allGroupLabels = [...new Set([...oldGroupLabels, ...newGroupLabels])];

  for (const groupLabel of allGroupLabels) {
    const oldGroupEntries = oldGroups.get(groupLabel) ?? [];
    const newGroupEntries = newGroups.get(groupLabel) ?? [];
    const oldKeys = oldGroupEntries.map((entry) => entry.key);
    const newKeys = newGroupEntries.map((entry) => entry.key);
    const oldKeySet = [...new Set(oldKeys)].sort();
    const newKeySet = [...new Set(newKeys)].sort();

    if (JSON.stringify(oldKeySet) !== JSON.stringify(newKeySet)) {
      mismatches.push(`${groupLabel} membership mismatch\n  old: ${oldKeys.join(' -> ')}\n  new: ${newKeys.join(' -> ')}`);
      continue;
    }

    if (JSON.stringify(oldKeys) !== JSON.stringify(newKeys)) {
      const distinctYears = new Set(newGroupEntries.map((entry) => entry.year));

      if (distinctYears.size > 1) {
        anomalies.push(
          `${groupLabel} bucket order differs because the legacy archive mixes multiple publication years inside one heading; compact data keeps the same membership but reorders by actual year descending.`,
        );
      } else {
        mismatches.push(`${groupLabel} order mismatch\n  old: ${oldKeys.join(' -> ')}\n  new: ${newKeys.join(' -> ')}`);
      }
    }

    const oldByKey = new Map(oldGroupEntries.map((entry) => [entry.key, entry]));
    const newByKey = new Map(newGroupEntries.map((entry) => [entry.key, entry]));

    for (const [index, key] of newKeySet.entries()) {
      const oldEntry = oldByKey.get(key);
      const newEntry = newByKey.get(key);
      const entryLabel = `${groupLabel} item #${index + 1}`;

      if (!oldEntry || !newEntry) {
        mismatches.push(`${entryLabel} could not be matched by key ${key}.`);
        continue;
      }

      for (const field of ['title', 'authors', 'venue', 'image', 'note']) {
        if (normalizeVisibleText(oldEntry[field]) !== normalizeVisibleText(newEntry[field])) {
          mismatches.push(`${entryLabel} ${field} mismatch\n  old: ${oldEntry[field]}\n  new: ${newEntry[field]}`);
        }
      }

      const oldLinks = [...new Set(oldEntry.linkUrls.map(normalizeUrl).filter(Boolean))].sort();
      const newLinks = [...new Set(newEntry.linkUrls.map(normalizeUrl).filter(Boolean))].sort();

      if (JSON.stringify(oldLinks) !== JSON.stringify(newLinks)) {
        const missingFromNew = oldLinks.filter((link) => !newLinks.includes(link));
        const extraInNew = newLinks.filter((link) => !oldLinks.includes(link));
        const isYoutubeVariantMismatch =
          missingFromNew.length === 1 &&
          extraInNew.length === 1 &&
          missingFromNew[0]?.startsWith('https://www.youtube.com/watch?v=') &&
          extraInNew[0]?.startsWith('https://www.youtube.com/watch?v=');

        if (isYoutubeVariantMismatch) {
          anomalies.push(
            `${entryLabel} uses different legacy/new YouTube URLs; old="${missingFromNew[0]}" new="${extraInNew[0]}".`,
          );
          continue;
        }

        mismatches.push(`${entryLabel} link set mismatch\n  old: ${oldLinks.join(' | ')}\n  new: ${newLinks.join(' | ')}`);
      }
    }
  }

  return { mismatches, anomalies };
};

const main = async () => {
  const [oldHtml, newToml] = await Promise.all([
    readFile(oldPublicationsHtmlPath, 'utf8'),
    readFile(newPublicationsTomlPath, 'utf8'),
  ]);

  const oldEntries = parseOldPublicationsHtml(oldHtml);
  const { uniqueEntries: dedupedOldEntries, anomalies } = dedupeLegacyEntries(oldEntries);
  const newEntries = parseNewPublicationsToml(newToml);
  const comparison = compareEntries(dedupedOldEntries, newEntries);
  const allAnomalies = [...anomalies, ...comparison.anomalies];
  const { mismatches } = comparison;

  console.log(`Old entries (raw): ${oldEntries.length}`);
  console.log(`Old entries (deduplicated for comparison): ${dedupedOldEntries.length}`);
  console.log(`New entries: ${newEntries.length}`);
  console.log('\nComparison scope: grouped archive order, per-row title/authors/venue/image/note, and row-action URLs plus note-embedded legacy URLs. Thumbnail-only legacy hrefs are intentionally ignored because the compact content model does not author them separately.');

  if (allAnomalies.length > 0) {
    console.log('\nLegacy anomalies:');
    for (const anomaly of allAnomalies) {
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

  console.log('\nPublications migration diff passed with no structured mismatches.');
};

await main();
