import { existsSync, readdirSync } from 'node:fs';
import { posix, resolve } from 'node:path';

const publicAssetRoots = new Set(['images', 'img', 'files']);

const normalizeSlashes = (value: string) => value.replaceAll('\\', '/').trim();

export const normalizeContentAssetReference = (value: string) => {
  const normalizedCandidate = normalizeSlashes(value);

  if (normalizedCandidate.length === 0) {
    throw new Error('Asset path cannot be empty.');
  }

  if (normalizedCandidate.startsWith('/')) {
    throw new Error('Asset paths must be relative and must not start with /.');
  }

  if (normalizedCandidate.startsWith('new_design/')) {
    throw new Error('Asset paths must not resolve from new_design/.');
  }

  const normalizedPath = posix.normalize(normalizedCandidate);

  if (normalizedPath === '.' || normalizedPath.startsWith('../')) {
    throw new Error('Asset paths must stay within the implementation-owned asset pipeline.');
  }

  return normalizedPath;
};

export const isNormalizedContentAssetReference = (value: string) => {
  try {
    return normalizeContentAssetReference(value) === value;
  } catch {
    return false;
  }
};

export const toPublicAssetRelativePath = (value: string) => {
  const normalizedPath = normalizeContentAssetReference(value);

  if (normalizedPath.startsWith('public/')) {
    return normalizedPath.slice('public/'.length);
  }

  const [rootSegment] = normalizedPath.split('/');
  if (!rootSegment || !publicAssetRoots.has(rootSegment)) {
    throw new Error('Asset paths must be rooted in images/, img/, files/, or public/.');
  }

  return normalizedPath;
};

export const resolveContentAssetFilePath = (value: string) =>
  resolve(process.cwd(), 'public', toPublicAssetRelativePath(value));

export const toContentAssetUrl = (value: string) => `/${encodeURI(toPublicAssetRelativePath(value))}`;

const pathExistsWithExactCase = (baseDirectory: string, relativePath: string) => {
  let currentDirectory = baseDirectory;

  for (const segment of relativePath.split('/')) {
    if (segment.length === 0 || !existsSync(currentDirectory)) {
      return false;
    }

    try {
      const directoryEntries = readdirSync(currentDirectory);
      if (!directoryEntries.includes(segment)) {
        return false;
      }
    } catch {
      return false;
    }

    currentDirectory = resolve(currentDirectory, segment);
  }

  return existsSync(currentDirectory);
};

export const contentAssetExists = (value: string) =>
  pathExistsWithExactCase(resolve(process.cwd(), 'public'), toPublicAssetRelativePath(value));
