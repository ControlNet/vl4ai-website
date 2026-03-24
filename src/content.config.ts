import { defineCollection } from 'astro:content';
import { file, glob, type Loader } from 'astro/loaders';
import { z } from 'astro/zod';
import { contentAssetExists, isNormalizedContentAssetReference } from './lib/content-assets';

const canonicalIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const yearBucketPattern = /^\d{4}(?:-\d{4})?$/;
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
        officeHours: trimmedString(),
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
  loader: withDuplicateIdentifierValidation(file('src/content/people/index.toml'), ['localeKey', 'slug']),
  schema: z
    .object({
      localeKey: canonicalId(),
      slug: canonicalId(),
      recordType: z.enum(['member', 'alumnus']),
      status: z.enum(['current', 'alumni']),
      group: z.enum([
        'director',
        'postdocs',
        'phd-students',
        'master-and-undergrad-students',
        'alumni-postdocs',
        'alumni-phd-students',
        'alumni-master-and-undergrad-students',
      ]),
      sortOrder: positiveSortOrder,
      name: trimmedString(),
      image: assetPathSchema.optional(),
      details: z.array(trimmedString()).min(1),
      links: z.array(linkSchema).min(1),
    })
    .strict()
    .superRefine((value, ctx) => {
      enforceCanonicalSlug(value, ctx);
      if (value.status === 'current' && !value.image) {
        ctx.addIssue({
          code: 'custom',
          message: 'Current members must include an image asset path.',
          path: ['image'],
        });
      }
    }),
});

const publications = defineCollection({
  loader: withDuplicateIdentifierValidation(file('src/content/publications/index.toml'), ['localeKey', 'slug']),
  schema: z
    .object({
      localeKey: canonicalId(),
      slug: canonicalId(),
      sortOrder: positiveSortOrder,
      year: z.number().int().min(2015).max(2030),
      yearBucket: trimmedString().regex(yearBucketPattern, 'Use a year bucket like 2025 or 2015-2018.'),
      title: trimmedString(),
      authors: z.array(trimmedString()).min(1),
      venue: trimmedString(),
      image: assetPathSchema,
      links: z.array(linkSchema).min(1),
      notes: z.array(trimmedString()).optional(),
      featuredOnHome: z.boolean().optional(),
      featuredOrder: positiveSortOrder.optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
      enforceCanonicalSlug(value, ctx);
      if (value.featuredOnHome && !value.featuredOrder) {
        ctx.addIssue({
          code: 'custom',
          message: 'Featured publications must declare a featuredOrder.',
          path: ['featuredOrder'],
        });
      }
      if (!value.featuredOnHome && value.featuredOrder) {
        ctx.addIssue({
          code: 'custom',
          message: 'featuredOrder is only valid when featuredOnHome is true.',
          path: ['featuredOrder'],
        });
      }
    }),
});

const news = defineCollection({
  loader: withDuplicateIdentifierValidation(file('src/content/news/index.toml'), ['localeKey', 'slug']),
  schema: z
    .object({
      localeKey: canonicalId(),
      slug: canonicalId(),
      sortOrder: positiveSortOrder,
      publishedAt: isoDateSchema,
      displayDate: trimmedString(),
      title: trimmedString(),
      summary: trimmedString(),
      image: assetPathSchema,
      links: z.array(linkSchema).min(1),
      primaryUrl: destinationSchema,
      featuredOnHome: z.boolean().optional(),
      featuredOrder: positiveSortOrder.optional(),
    })
    .strict()
    .superRefine((value, ctx) => {
      enforceCanonicalSlug(value, ctx);
      if (value.featuredOnHome && !value.featuredOrder) {
        ctx.addIssue({
          code: 'custom',
          message: 'Featured news entries must declare a featuredOrder.',
          path: ['featuredOrder'],
        });
      }
      if (!value.links.some((link) => link.url === value.primaryUrl)) {
        ctx.addIssue({
          code: 'custom',
          message: 'primaryUrl must also exist inside the links array.',
          path: ['primaryUrl'],
        });
      }
    }),
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
