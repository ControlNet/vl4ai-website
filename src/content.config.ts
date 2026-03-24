import { defineCollection } from 'astro:content';
import { file, glob, type Loader } from 'astro/loaders';
import { z } from 'astro/zod';
import { contentAssetExists, isNormalizedContentAssetReference } from './lib/content-assets';

const canonicalIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const archiveGroupPattern = /^\d{4}(?:-\d{4})?$/;
const localAssetPattern = /^(?!new_design\/)(?:public\/.+|(?:images|img|files)\/.+)$/;
const legacyPathPattern = /^(?:\/|(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.(?:html|pdf))$/;
const canonicalSiteRoutePattern = /^\/(?:$|(?:[a-z0-9-]+\/)+)$/;

const trimmedString = () => z.string().trim().min(1);
const canonicalId = () =>
  trimmedString().regex(canonicalIdPattern, 'Use a lowercase kebab-case locale-neutral identifier.');
const positiveSortOrder = z.number().int().positive();
const pathBasedEntryId = ({ entry }: { entry: string }) => entry.replace(/\.[^.]+$/u, '');
const siteRoutePathSchema = trimmedString().regex(
  canonicalSiteRoutePattern,
  'Use a canonical slash route like /, /people/, or /research/.',
);

type LoadedCollectionEntry = {
  id: string;
  data: Record<string, unknown>;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const assertUniqueEditorialField = (
  collectionName: string,
  entries: LoadedCollectionEntry[],
  fieldName: 'localeKey' | 'slug' | 'route',
) => {
  const seen = new Map<string, string>();

  for (const entry of entries) {
    const fieldValue = entry.data[fieldName];
    if (typeof fieldValue !== 'string' || fieldValue.length === 0) {
      continue;
    }

    const firstEntryId = seen.get(fieldValue);
    if (firstEntryId) {
      throw new Error(
        `[content:${collectionName}] Duplicate ${fieldName} "${fieldValue}" found in entries ` +
          `"${firstEntryId}" and "${entry.id}". Each ${collectionName} entry must use a unique ${fieldName}.`,
      );
    }

    seen.set(fieldValue, entry.id);
  }
};

const withDuplicateIdentifierValidation = (
  loader: Loader,
  fieldNames: readonly ('localeKey' | 'slug' | 'route')[],
): Loader => ({
  name: `${loader.name}-duplicate-editorial-identifiers`,
  load: async (context) => {
    await loader.load(context);

    const loadedEntries = Array.from(context.store.entries(), ([id, entry]) => ({
      id,
      data: toRecord(entry.data),
    }));

    for (const fieldName of fieldNames) {
      assertUniqueEditorialField(context.collection, loadedEntries, fieldName);
    }
  },
});

const isAbsoluteHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const destinationSchema = trimmedString().refine((value) => {
  if (value.startsWith('mailto:')) {
    return /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(value);
  }

  return isAbsoluteHttpUrl(value) || legacyPathPattern.test(value);
}, 'Expected an absolute URL, mailto link, or local legacy path.');

const routeCopyActionSchema = z
  .object({
    label: trimmedString(),
    style: z.enum(['primary', 'secondary']),
    url: z.union([destinationSchema, siteRoutePathSchema]).optional(),
  })
  .strict();

const assetPathSchema = trimmedString()
  .regex(localAssetPattern, 'Use a local asset path rooted in images/, img/, public/, or files/.')
  .refine(
    isNormalizedContentAssetReference,
    'Use a normalized asset path with forward slashes and no relative segments.',
  )
  .refine(contentAssetExists, 'Referenced asset file does not exist in the public asset pipeline.');

const isoDateSchema = trimmedString()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, 'Use an ISO date string in YYYY-MM-DD format.')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Date value is not parseable.');

const nonNegativeIntegerSchema = z.number().int().nonnegative();
const peopleGroupSchema = z.enum([
  'director',
  'postdocs',
  'phd-students',
  'master-and-undergrad-students',
]);

const linkSchema = z
  .object({
    kind: z.enum([
      'email',
      'github',
      'linkedin',
      'pdf',
      'primary',
      'project',
      'scholar',
      'twitter',
      'video',
      'website',
      'external',
    ]),
    label: trimmedString(),
    url: destinationSchema,
  })
  .strict();

const enforceCanonicalSlug = (
  value: { localeKey: string; slug: string },
  ctx: z.RefinementCtx,
) => {
  if (value.localeKey !== value.slug) {
    ctx.addIssue({
      code: 'custom',
      message: 'slug must match localeKey to keep identifiers locale-neutral.',
      path: ['slug'],
    });
  }
};

const canonicalizeIdentifierSegment = (value: string) => {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/&/gu, ' and ')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');

  return slug.length > 0 ? slug : 'item';
};

const inferNewsEntryIdBase = (date: string, title: string) =>
  `${date.trim()}-${canonicalizeIdentifierSegment(title.trim())}`;

const inferPeopleEntryIdBase = (tableType: 'member' | 'alumni', name: string) =>
  `${tableType}-${canonicalizeIdentifierSegment(name.trim())}`;

const inferPublicationEntryIdBase = (year: number, title: string) => `${String(year)}-${canonicalizeIdentifierSegment(title.trim())}`;

const getCompactTomlNestingDepth = (value: string) => {
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

const parseCompactTomlValue = (collectionName: string, fieldName: string, rawValueLiteral: string, lineNumber: number): unknown => {
  if (/^"(?:[^"\\]|\\.)*"$/u.test(rawValueLiteral)) {
    try {
      return JSON.parse(rawValueLiteral) as string;
    } catch {
      throw new Error(`[content:${collectionName}] Invalid string value for ${fieldName} at line ${lineNumber}.`);
    }
  }

  if (/^-?\d+$/u.test(rawValueLiteral)) {
    return Number.parseInt(rawValueLiteral, 10);
  }

  if (rawValueLiteral.startsWith('[')) {
    const jsonLikeLiteral = rawValueLiteral
      .replace(/(^|[{,]\s*)([A-Za-z][A-Za-z0-9_-]*)\s*=/gmu, '$1"$2":')
      .replace(/,(\s*[\]}])/gu, '$1');

    try {
      return JSON.parse(jsonLikeLiteral) as unknown[];
    } catch {
      throw new Error(`[content:${collectionName}] Invalid array value for ${fieldName} at line ${lineNumber}.`);
    }
  }

  throw new Error(
    `[content:${collectionName}] Only quoted strings, integers, and arrays are supported for ${fieldName} at line ${lineNumber}.`,
  );
};

const inferCompactPeopleLink = (url: string) => ({
  kind: url.startsWith('mailto:') ? 'email' : 'external',
  label: url.startsWith('mailto:') ? 'Email' : 'External link',
  url,
});

const parseCompactNewsItems = (text: string): Record<string, Record<string, unknown>> => {
  const rawItems: Record<string, unknown>[] = [];
  let currentItem: Record<string, unknown> | undefined;

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
      throw new Error(`[content:news] Expected [[item]] before properties at line ${lineNumber}.`);
    }

    const fieldMatch = trimmedLine.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(.+)$/u);

    if (!fieldMatch) {
      throw new Error(`[content:news] Could not parse line ${lineNumber}: ${trimmedLine}`);
    }

    const [, fieldName, rawValueLiteral] = fieldMatch;

    if (!/^"(?:[^"\\]|\\.)*"$/u.test(rawValueLiteral)) {
      throw new Error(
        `[content:news] Only single-line quoted string values are supported for ${fieldName} at line ${lineNumber}.`,
      );
    }

    try {
      currentItem[fieldName] = JSON.parse(rawValueLiteral) as string;
    } catch {
      throw new Error(`[content:news] Invalid string value for ${fieldName} at line ${lineNumber}.`);
    }
  }

  if (rawItems.length === 0) {
    throw new Error('[content:news] Expected src/content/news/index.toml to define at least one [[item]] entry.');
  }

  const seenIds = new Map<string, number>();

  return Object.fromEntries(
    rawItems.map((rawItem, index) => {
      const item = toRecord(rawItem);
      const rawDate = item.date;
      const rawTitle = item.title;

      if (typeof rawDate !== 'string' || rawDate.trim().length === 0) {
        throw new Error(`[content:news] [[item]] #${index + 1} is missing a non-empty string date field.`);
      }

      if (typeof rawTitle !== 'string' || rawTitle.trim().length === 0) {
        throw new Error(`[content:news] [[item]] #${index + 1} is missing a non-empty string title field.`);
      }

      const baseId = inferNewsEntryIdBase(rawDate, rawTitle);
      const nextCollisionCount = (seenIds.get(baseId) ?? 0) + 1;
      seenIds.set(baseId, nextCollisionCount);

      const id = nextCollisionCount === 1 ? baseId : `${baseId}-${nextCollisionCount}`;

      return [
        id,
        {
          ...item,
          sequence: index,
        },
      ];
    }),
  );
};

const compactPeopleFieldNames = {
  member: ['name', 'group', 'image', 'details', 'links'],
  alumni: ['name', 'group', 'details', 'link'],
} as const;

type CompactPeopleTableType = keyof typeof compactPeopleFieldNames;

type RawCompactPeopleEntry = {
  tableType: CompactPeopleTableType;
  lineNumber: number;
  fields: Record<string, unknown>;
};

const compactPublicationFieldNames = ['title', 'year', 'authors', 'venue', 'image', 'links', 'note', 'homeRank', 'archiveGroup'] as const;

type RawCompactPublicationEntry = {
  lineNumber: number;
  fields: Record<string, unknown>;
};

const parseCompactPublicationEntries = (text: string): Record<string, Record<string, unknown>> => {
  const rawEntries: RawCompactPublicationEntry[] = [];
  let currentEntry: RawCompactPublicationEntry | undefined;
  const lines = text.split(/\r?\n/u);

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index] ?? '';
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
      continue;
    }

    if (trimmedLine === '[[item]]') {
      currentEntry = {
        lineNumber,
        fields: {},
      };
      rawEntries.push(currentEntry);
      continue;
    }

    if (!currentEntry) {
      throw new Error(`[content:publications] Expected [[item]] before properties at line ${lineNumber}.`);
    }

    const fieldMatch = trimmedLine.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(.+)$/u);

    if (!fieldMatch) {
      throw new Error(`[content:publications] Could not parse line ${lineNumber}: ${trimmedLine}`);
    }

    const [, fieldName, initialRawValueLiteral] = fieldMatch;

    if (!(compactPublicationFieldNames as readonly string[]).includes(fieldName)) {
      throw new Error(
        `[content:publications] Unsupported field "${fieldName}" in [[item]] at line ${lineNumber}. ` +
          `Allowed fields: ${compactPublicationFieldNames.join(', ')}.`,
      );
    }

    if (fieldName in currentEntry.fields) {
      throw new Error(`[content:publications] Duplicate field "${fieldName}" in [[item]] at line ${lineNumber}.`);
    }

    let rawValueLiteral = initialRawValueLiteral;
    let nestingDepth = getCompactTomlNestingDepth(rawValueLiteral);

    while (nestingDepth > 0) {
      index += 1;
      const continuationLine = lines[index];

      if (continuationLine === undefined) {
        throw new Error(`[content:publications] Unterminated value for ${fieldName} in [[item]] starting at line ${lineNumber}.`);
      }

      rawValueLiteral += `\n${continuationLine.trim()}`;
      nestingDepth = getCompactTomlNestingDepth(rawValueLiteral);
    }

    currentEntry.fields[fieldName] = parseCompactTomlValue('publications', fieldName, rawValueLiteral, lineNumber);
  }

  if (rawEntries.length === 0) {
    throw new Error('[content:publications] Expected src/content/publications/index.toml to define at least one [[item]] entry.');
  }

  const seenIds = new Map<string, number>();

  return Object.fromEntries(
    rawEntries.map((rawEntry, sequence) => {
      const entry = toRecord(rawEntry.fields);
      const rawTitle = entry.title;
      const rawYear = entry.year;

      if (typeof rawTitle !== 'string' || rawTitle.trim().length === 0) {
        throw new Error(`[content:publications] [[item]] starting at line ${rawEntry.lineNumber} is missing a non-empty string title field.`);
      }

      if (typeof rawYear !== 'number' || !Number.isInteger(rawYear)) {
        throw new Error(`[content:publications] [[item]] "${rawTitle}" must include an integer year field.`);
      }

      const year = rawYear;
      const baseId = inferPublicationEntryIdBase(year, rawTitle);
      const nextCollisionCount = (seenIds.get(baseId) ?? 0) + 1;
      seenIds.set(baseId, nextCollisionCount);

      const id = nextCollisionCount === 1 ? baseId : `${baseId}-${nextCollisionCount}`;

      return [
        id,
        {
          ...entry,
          sequence,
          year,
          archiveGroup: typeof entry.archiveGroup === 'string' ? entry.archiveGroup : String(year),
        },
      ];
    }),
  );
};

const parseCompactPeopleEntries = (text: string): Record<string, Record<string, unknown>> => {
  const rawEntries: RawCompactPeopleEntry[] = [];
  let currentEntry: RawCompactPeopleEntry | undefined;
  const lines = text.split(/\r?\n/u);

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const line = lines[index] ?? '';
    const trimmedLine = line.trim();

    if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
      continue;
    }

    if (trimmedLine === '[[member]]' || trimmedLine === '[[alumni]]') {
      currentEntry = {
        tableType: trimmedLine === '[[member]]' ? 'member' : 'alumni',
        lineNumber,
        fields: {},
      };
      rawEntries.push(currentEntry);
      continue;
    }

    if (!currentEntry) {
      throw new Error(`[content:people] Expected [[member]] or [[alumni]] before properties at line ${lineNumber}.`);
    }

    const fieldMatch = trimmedLine.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(.+)$/u);

    if (!fieldMatch) {
      throw new Error(`[content:people] Could not parse line ${lineNumber}: ${trimmedLine}`);
    }

    const [, fieldName, initialRawValueLiteral] = fieldMatch;
    const allowedFieldNames: readonly string[] = compactPeopleFieldNames[currentEntry.tableType];

    if (!allowedFieldNames.includes(fieldName)) {
      throw new Error(
        `[content:people] Unsupported field "${fieldName}" in [[${currentEntry.tableType}]] at line ${lineNumber}. ` +
          `Allowed fields: ${allowedFieldNames.join(', ')}.`,
      );
    }

    if (fieldName in currentEntry.fields) {
      throw new Error(`[content:people] Duplicate field "${fieldName}" in [[${currentEntry.tableType}]] at line ${lineNumber}.`);
    }

    let rawValueLiteral = initialRawValueLiteral;
    let nestingDepth = getCompactTomlNestingDepth(rawValueLiteral);

    while (nestingDepth > 0) {
      index += 1;
      const continuationLine = lines[index];

      if (continuationLine === undefined) {
        throw new Error(
          `[content:people] Unterminated value for ${fieldName} in [[${currentEntry.tableType}]] starting at line ${lineNumber}.`,
        );
      }

      rawValueLiteral += `\n${continuationLine.trim()}`;
      nestingDepth = getCompactTomlNestingDepth(rawValueLiteral);
    }

    currentEntry.fields[fieldName] = parseCompactTomlValue('people', fieldName, rawValueLiteral, lineNumber);
  }

  if (rawEntries.length === 0) {
    throw new Error('[content:people] Expected src/content/people/index.toml to define at least one [[member]] or [[alumni]] entry.');
  }

  const seenIds = new Map<string, number>();

  return Object.fromEntries(
    rawEntries.map((rawEntry, sequence) => {
      const entry = toRecord(rawEntry.fields);
      const rawName = entry.name;
      const rawGroup = entry.group;
      const rawDetails = entry.details;

      if (typeof rawName !== 'string' || rawName.trim().length === 0) {
        throw new Error(
          `[content:people] [[${rawEntry.tableType}]] starting at line ${rawEntry.lineNumber} is missing a non-empty string name field.`,
        );
      }

      if (typeof rawGroup !== 'string' || rawGroup.trim().length === 0) {
        throw new Error(
          `[content:people] [[${rawEntry.tableType}]] "${rawName}" is missing a non-empty string group field.`,
        );
      }

      if (!Array.isArray(rawDetails) || rawDetails.length === 0) {
        throw new Error(`[content:people] [[${rawEntry.tableType}]] "${rawName}" must include a non-empty details array.`);
      }

      if (rawDetails.some((detail) => typeof detail !== 'string' || detail.trim().length === 0)) {
        throw new Error(`[content:people] [[${rawEntry.tableType}]] "${rawName}" details must contain only non-empty strings.`);
      }

      const baseId = inferPeopleEntryIdBase(rawEntry.tableType, rawName);
      const nextCollisionCount = (seenIds.get(baseId) ?? 0) + 1;
      seenIds.set(baseId, nextCollisionCount);

      const id = nextCollisionCount === 1 ? baseId : `${baseId}-${nextCollisionCount}`;

      if (rawEntry.tableType === 'member') {
        const rawImage = entry.image;
        const rawLinks = entry.links;

        if (typeof rawImage !== 'string' || rawImage.trim().length === 0) {
          throw new Error(`[content:people] [[member]] "${rawName}" must include a non-empty string image field.`);
        }

        if (!Array.isArray(rawLinks) || rawLinks.length === 0) {
          throw new Error(`[content:people] [[member]] "${rawName}" must include a non-empty links array.`);
        }

        return [
          id,
          {
            recordType: 'member',
            group: rawGroup,
            sequence,
            name: rawName,
            image: rawImage,
            details: rawDetails,
            links: rawLinks,
          },
        ];
      }

      const rawLink = entry.link;

      if (rawLink !== undefined && (typeof rawLink !== 'string' || rawLink.trim().length === 0)) {
        throw new Error(`[content:people] [[alumni]] "${rawName}" link must be a non-empty string when provided.`);
      }

      return [
        id,
        {
          recordType: 'alumni',
          group: rawGroup,
          sequence,
          name: rawName,
          details: rawDetails,
          links: typeof rawLink === 'string' ? [inferCompactPeopleLink(rawLink)] : [],
        },
      ];
    }),
  );
};

const site = defineCollection({
  loader: withDuplicateIdentifierValidation(
    glob({ pattern: '**/*.{md,toml}', base: './src/content/site' }),
    ['localeKey', 'route'],
  ),
  schema: z.discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('lab'),
        localeKey: canonicalId(),
        sortOrder: positiveSortOrder,
        shortName: trimmedString(),
        fullName: trimmedString(),
        description: trimmedString(),
        institution: trimmedString(),
        department: trimmedString(),
        primaryLocation: trimmedString(),
        logo: assetPathSchema,
        alternateNames: z.array(trimmedString()).default([]),
      })
      .strict(),
    z
      .object({
        kind: z.literal('contact'),
        localeKey: canonicalId(),
        sortOrder: positiveSortOrder,
        phone: trimmedString(),
        email: trimmedString().email('Use a standard email address without mailto:.'),
        addressLines: z.array(trimmedString()).min(1),
        mapUrl: destinationSchema,
        mapEmbedUrl: trimmedString().refine(isAbsoluteHttpUrl, 'Expected an absolute https:// map embed URL.'),
      })
      .strict(),
    z
      .object({
        kind: z.literal('route-copy'),
        localeKey: canonicalId(),
        sortOrder: positiveSortOrder,
        route: siteRoutePathSchema,
        eyebrow: trimmedString().optional(),
        title: trimmedString(),
        highlight: trimmedString().optional(),
        lede: trimmedString(),
        actions: z.array(routeCopyActionSchema).max(2).default([]),
      })
      .strict(),
    z
      .object({
        kind: z.literal('home-copy'),
        localeKey: canonicalId(),
        sortOrder: positiveSortOrder,
        title: trimmedString(),
        lede: trimmedString(),
      })
      .strict(),
  ]),
});

const people = defineCollection({
  loader: file('src/content/people/index.toml', {
    parser: parseCompactPeopleEntries,
  }),
  schema: z
    .object({
      recordType: z.enum(['member', 'alumni']),
      group: peopleGroupSchema,
      sequence: nonNegativeIntegerSchema,
      name: trimmedString(),
      image: assetPathSchema.optional(),
      details: z.array(trimmedString()).min(1),
      links: z.array(linkSchema).default([]),
    })
    .strict()
    .superRefine((value, ctx) => {
      if (value.recordType === 'member' && !value.image) {
        ctx.addIssue({
          code: 'custom',
          message: 'Members must include an image asset path.',
          path: ['image'],
        });
      }

      if (value.recordType === 'member' && value.links.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'Members must include at least one link.',
          path: ['links'],
        });
      }
    }),
});

const publications = defineCollection({
  loader: file('src/content/publications/index.toml', {
    parser: parseCompactPublicationEntries,
  }),
  schema: z
    .object({
      year: z.number().int().min(2015).max(2030),
      sequence: nonNegativeIntegerSchema,
      title: trimmedString(),
      authors: z.array(trimmedString()).min(1),
      venue: trimmedString(),
      image: assetPathSchema,
      links: z.array(linkSchema).min(1),
      note: trimmedString().optional(),
      homeRank: positiveSortOrder.optional(),
      archiveGroup: trimmedString().regex(archiveGroupPattern, 'Use an archive group like 2025 or 2015-2018.'),
    })
    .strict(),
});

const news = defineCollection({
  loader: file('src/content/news/index.toml', {
    parser: parseCompactNewsItems,
  }),
  schema: z
    .object({
      date: isoDateSchema,
      sequence: nonNegativeIntegerSchema,
      title: trimmedString(),
      summary: trimmedString(),
      image: assetPathSchema,
      link: destinationSchema,
    })
    .strict(),
});

const research = defineCollection({
  loader: withDuplicateIdentifierValidation(
    glob({ pattern: '**/*.md', base: './src/content/research', generateId: pathBasedEntryId }),
    ['localeKey', 'slug'],
  ),
  schema: z.discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('overview'),
        localeKey: canonicalId(),
        sortOrder: positiveSortOrder,
        title: trimmedString(),
      })
      .strict(),
    z
      .object({
        kind: z.literal('topic'),
        localeKey: canonicalId(),
        slug: canonicalId(),
        sortOrder: positiveSortOrder,
        title: trimmedString(),
        category: z.enum(['perception', 'forecasting', 'navigation']),
        highlightLabel: trimmedString(),
        image: assetPathSchema,
      })
      .strict()
      .superRefine(enforceCanonicalSlug),
    z
      .object({
        kind: z.literal('benchmark'),
        localeKey: canonicalId(),
        slug: canonicalId(),
        sortOrder: positiveSortOrder,
        title: trimmedString(),
        image: assetPathSchema,
        primaryUrl: destinationSchema,
      })
      .strict()
      .superRefine(enforceCanonicalSlug),
  ]),
});

const positions = defineCollection({
  loader: withDuplicateIdentifierValidation(
    glob({ pattern: '**/*.{md,toml}', base: './src/content/positions', generateId: pathBasedEntryId }),
    ['localeKey', 'slug'],
  ),
  schema: z.discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('overview'),
        localeKey: canonicalId(),
        sortOrder: positiveSortOrder,
        title: trimmedString(),
        essentialSkills: z.array(trimmedString()).min(1),
        desirableSkills: z.array(trimmedString()).default([]),
        importantLinks: z.array(linkSchema).default([]),
      })
      .strict(),
    z
      .object({
        kind: z.literal('opening'),
        localeKey: canonicalId(),
        slug: canonicalId(),
        sortOrder: positiveSortOrder,
        title: trimmedString(),
        positionType: z.enum(['phd', 'research-fellow', 'research-assistant', 'research-engineer']),
        status: z.enum(['open', 'closed', 'archived']),
        shortDescription: trimmedString(),
        employmentType: trimmedString().optional(),
        location: trimmedString().optional(),
        duration: trimmedString().optional(),
        heroImage: assetPathSchema.optional(),
        primaryUrl: destinationSchema.optional(),
        legacyPaths: z.array(trimmedString()).default([]),
        links: z.array(linkSchema).default([]),
      })
      .strict()
      .superRefine((value, ctx) => {
        enforceCanonicalSlug(value, ctx);
        if (value.status === 'open' && !value.primaryUrl && value.links.length === 0) {
          ctx.addIssue({
            code: 'custom',
            message: 'Open positions must expose a primaryUrl or at least one link.',
            path: ['primaryUrl'],
          });
        }
      }),
  ]),
});

export const collections = {
  site,
  people,
  publications,
  news,
  research,
  positions,
};
