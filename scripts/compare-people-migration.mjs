import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const repoRoot = process.cwd();
const oldPeopleHtmlPath = resolve(repoRoot, '../vl4ai-website-old/people.html');
const newPeopleTomlPath = resolve(repoRoot, 'src/content/people/index.toml');

const currentSectionMap = new Map([
  ['principalinvestigator', 'director'],
  ['postdoc', 'postdocs'],
  ['phd', 'phd-students'],
  ['master&undergrad', 'master-and-undergrad-students'],
]);

const alumniSectionMap = new Map([
  ['alumni-postdoc', 'postdocs'],
  ['alumni-phd', 'phd-students'],
  ['alumni-master&undergrad', 'master-and-undergrad-students'],
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

const normalizeHref = (href) => {
  const normalized = normalizeWhitespace(href);
  if (normalized.length === 0) {
    return '';
  }

  if (normalized.startsWith('mailto:')) {
    return normalized;
  }

  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(normalized)) {
    return `mailto:${normalized}`;
  }

  if (normalized.startsWith('www.')) {
    return `https://${normalized}`;
  }

  if (normalized.startsWith('linkedin.com/')) {
    return `https://${normalized}`;
  }

  return normalized;
};

const inferLinkKind = (href, iconHtml) => {
  const normalizedHref = normalizeHref(href);
  const iconLower = iconHtml.toLowerCase();
  if (normalizedHref.startsWith('mailto:') || /title="email"/u.test(iconLower)) {
    return 'email';
  }
  if (/github/iu.test(iconLower)) {
    return 'github';
  }
  if (/twitter/iu.test(iconLower)) {
    return 'twitter';
  }
  if (/scholar/iu.test(iconLower)) {
    return 'scholar';
  }
  if (/website|language/iu.test(iconLower)) {
    return 'website';
  }
  if (/linkedin|link/iu.test(iconLower)) {
    return 'linkedin';
  }
  return 'external';
};

const splitLegacyDetailLines = (htmlFragment) =>
  htmlFragment
    .replace(/<style[\s\S]*?<\/style>/gu, ' ')
    .replace(/<h4>[\s\S]*?<\/h4>/gu, ' ')
    .replace(/<p><b>[\s\S]*$/u, ' ')
    .replace(/<\/p>/gu, '<br/>')
    .replace(/<\/?br\s*\/?\s*>/giu, '<br/>')
    .split(/<br\s*\/?\s*>/iu)
    .map(stripTags)
    .filter(Boolean);

const extractCurrentDetails = (span9Html) => {
  return splitLegacyDetailLines(span9Html);
};

const currentSectionOrder = ['principalinvestigator', 'postdoc', 'phd', 'master&undergrad', 'alumni'];
const alumniSectionOrder = ['alumni-postdoc', 'alumni-phd', 'alumni-master&undergrad'];

const sectionSlice = (html, startId, nextIds) => {
  const startMarker = `<section id="${startId}">`;
  const startIndex = html.indexOf(startMarker);
  if (startIndex === -1) {
    return '';
  }

  const candidateEndIndexes = nextIds
    .map((id) => html.indexOf(`<section id="${id}">`, startIndex + startMarker.length))
    .filter((index) => index !== -1);

  const endIndex = candidateEndIndexes.length > 0 ? Math.min(...candidateEndIndexes) : html.length;
  return html.slice(startIndex, endIndex);
};

const extractAlumniDetails = (rowHtml) => {
  const afterHeading = rowHtml.replace(/^[\s\S]*?<\/h4>/u, '');
  return splitLegacyDetailLines(afterHeading);
};

const extractCurrentEntries = (html) => {
  const entries = [];

  for (const [index, sectionId] of currentSectionOrder.entries()) {
    const group = currentSectionMap.get(sectionId);
    if (!group) {
      continue;
    }

    const sectionHtml = sectionSlice(html, sectionId, currentSectionOrder.slice(index + 1));
    if (sectionHtml.length === 0) {
      continue;
    }

    const rowBlocks = sectionHtml
      .split('<div class="row-fluid">')
      .slice(1)
      .map((block) => block.split('<hr>')[0] ?? '')
      .filter((block) => /<img\s+src=/u.test(block) && /<h4>/u.test(block));

    for (const rowHtml of rowBlocks) {
      const imageMatch = rowHtml.match(/<img\s+src="([^"]+)"[^>]*alt="([^"]*)"/u);
      const span9Match = rowHtml.match(/<div class="span9">([\s\S]*?)$/u);
      if (!imageMatch || !span9Match) {
        continue;
      }

      const span9Html = span9Match[1] ?? '';
      const nameMatch = span9Html.match(/<h4>([\s\S]*?)<\/h4>/u);
      if (!nameMatch) {
        continue;
      }

      const iconLinks = [...span9Html.matchAll(/<a href="([^"]*)">([\s\S]*?)<\/a>/gu)].map((match) => ({
        url: normalizeHref(match[1] ?? ''),
        kind: inferLinkKind(match[1] ?? '', match[2] ?? ''),
      }));

      entries.push({
        recordType: 'member',
        group,
        name: stripTags(nameMatch[1] ?? ''),
        image: imageMatch[1] ?? '',
        details: extractCurrentDetails(span9Html),
        linkUrls: [...new Set(iconLinks.map((link) => link.url).filter(Boolean))],
      });
    }
  }

  return entries;
};

const extractAlumniEntries = (html) => {
  const entries = [];

  for (const [index, sectionId] of alumniSectionOrder.entries()) {
    const group = alumniSectionMap.get(sectionId);
    if (!group) {
      continue;
    }

    const sectionHtml = sectionSlice(html, sectionId, alumniSectionOrder.slice(index + 1));
    if (sectionHtml.length === 0) {
      continue;
    }

    const rowMatches = [...sectionHtml.matchAll(/<div class="row-fluid">([\s\S]*?)<\/div>\s*(?=<div class="row-fluid">|<section|<footer|$)/gu)];

    for (const rowMatch of rowMatches) {
      const rowHtml = rowMatch[1] ?? '';
      const nameMatch = rowHtml.match(/<h4>\s*<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>\s*<\/h4>/u);
      if (!nameMatch) {
        continue;
      }

      entries.push({
        recordType: 'alumni',
        group,
        name: stripTags(nameMatch[2] ?? ''),
        details: extractAlumniDetails(rowHtml),
        linkUrls: [normalizeHref(nameMatch[1] ?? '')].filter(Boolean),
      });
    }
  }

  return entries;
};

const parseOldPeopleHtml = (html) => {
  const cleanedHtml = html.replace(/<!--[\s\S]*?-->/gu, ' ');
  const currentEntries = extractCurrentEntries(cleanedHtml);
  const alumniEntries = extractAlumniEntries(cleanedHtml);
  return [...currentEntries, ...alumniEntries];
};

const parseNewPeopleToml = (text) => {
  const entries = [];
  let currentEntry = undefined;
  let currentTable = undefined;
  const lines = text.split(/\r?\n/u);

  const parseValue = (rawLiteral) => {
    if (/^"(?:[^"\\]|\\.)*"$/u.test(rawLiteral)) {
      return JSON.parse(rawLiteral);
    }
    const jsonLikeLiteral = rawLiteral
      .replace(/(^|[{,]\s*)([A-Za-z][A-Za-z0-9_-]*)\s*=/gmu, '$1"$2":')
      .replace(/,(\s*[\]}])/gu, '$1');
    return JSON.parse(jsonLikeLiteral);
  };

  const nestingDepth = (value) => {
    let square = 0;
    let curly = 0;
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
      if (character === '[') square += 1;
      if (character === ']') square -= 1;
      if (character === '{') curly += 1;
      if (character === '}') curly -= 1;
    }
    return square + curly;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const trimmedLine = (lines[index] ?? '').trim();
    if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
      continue;
    }
    if (trimmedLine === '[[member]]' || trimmedLine === '[[alumni]]') {
      currentTable = trimmedLine === '[[member]]' ? 'member' : 'alumni';
      currentEntry = { tableType: currentTable, fields: {} };
      entries.push(currentEntry);
      continue;
    }
    if (!currentEntry) {
      throw new Error(`Expected table header before line: ${trimmedLine}`);
    }
    const fieldMatch = trimmedLine.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(.+)$/u);
    if (!fieldMatch) {
      throw new Error(`Could not parse line: ${trimmedLine}`);
    }
    const [, fieldName, initialRawValue] = fieldMatch;
    let rawValue = initialRawValue;
    while (nestingDepth(rawValue) > 0) {
      index += 1;
      rawValue += `\n${(lines[index] ?? '').trim()}`;
    }
    currentEntry.fields[fieldName] = parseValue(rawValue);
  }

  return entries.map((entry) => {
    if (entry.tableType === 'member') {
      return {
        recordType: 'member',
        group: entry.fields.group,
        name: entry.fields.name,
        image: entry.fields.image,
        details: entry.fields.details,
        linkUrls: entry.fields.links.map((link) => link.url),
      };
    }
    return {
      recordType: 'alumni',
      group: entry.fields.group,
      name: entry.fields.name,
      details: entry.fields.details,
      linkUrls: typeof entry.fields.link === 'string' ? [entry.fields.link] : [],
    };
  });
};

const compareEntries = (oldEntries, newEntries) => {
  const mismatches = [];
  const anomalies = [];
  const oldMap = new Map(oldEntries.map((entry) => [`${entry.recordType}:${entry.name}`, entry]));
  const newMap = new Map(newEntries.map((entry) => [`${entry.recordType}:${entry.name}`, entry]));
  const allKeys = [...new Set([...oldMap.keys(), ...newMap.keys()])];

  for (const [index, key] of allKeys.entries()) {
    const oldEntry = oldMap.get(key);
    const newEntry = newMap.get(key);
    const humanIndex = index + 1;
    if (!oldEntry) {
      mismatches.push(`extra new entry #${humanIndex}: ${JSON.stringify(newEntry)}`);
      continue;
    }
    if (!newEntry) {
      mismatches.push(`missing new entry for old entry #${humanIndex}: ${oldEntry.recordType} ${oldEntry.group} ${oldEntry.name}`);
      continue;
    }

    for (const field of ['recordType', 'group', 'name']) {
      if (oldEntry[field] !== newEntry[field]) {
        mismatches.push(`entry #${humanIndex} ${field} mismatch\n  old: ${oldEntry[field]}\n  new: ${newEntry[field]}`);
      }
    }

    if (JSON.stringify(oldEntry.details) !== JSON.stringify(newEntry.details)) {
      mismatches.push(
        `entry #${humanIndex} details mismatch\n  old: ${JSON.stringify(oldEntry.details)}\n  new: ${JSON.stringify(newEntry.details)}`,
      );
    }

    if (oldEntry.recordType === 'member' && oldEntry.image !== newEntry.image) {
      mismatches.push(`entry #${humanIndex} image mismatch\n  old: ${oldEntry.image}\n  new: ${newEntry.image}`);
    }

    const oldLinks = [...new Set(oldEntry.linkUrls.map((link) => normalizeHref(link)).filter(Boolean))];
    const newLinks = [...new Set(newEntry.linkUrls.map((link) => normalizeHref(link)).filter(Boolean))];
    const missingFromNew = oldLinks.filter((link) => !newLinks.includes(link));
    if (missingFromNew.length > 0) {
      mismatches.push(`entry #${humanIndex} missing legacy links in new data\n  old-only: ${missingFromNew.join(' | ')}`);
    }

    const extraInNew = newLinks.filter((link) => !oldLinks.includes(link));
    if (extraInNew.length > 0) {
      anomalies.push(`entry #${humanIndex} has extra new links not directly visible in old HTML: ${extraInNew.join(' | ')}`);
    }
  }

  return { mismatches, anomalies };
};

const main = async () => {
  const [oldHtml, newToml] = await Promise.all([
    readFile(oldPeopleHtmlPath, 'utf8'),
    readFile(newPeopleTomlPath, 'utf8'),
  ]);

  const oldEntries = parseOldPeopleHtml(oldHtml);
  const newEntries = parseNewPeopleToml(newToml);
  const { mismatches, anomalies } = compareEntries(oldEntries, newEntries);

  console.log(`Old entries: ${oldEntries.length}`);
  console.log(`New entries: ${newEntries.length}`);

  if (anomalies.length > 0) {
    console.log('\nLegacy anomalies / richer new data:');
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

  console.log('\nPeople migration diff passed with no structured mismatches.');
};

await main();
