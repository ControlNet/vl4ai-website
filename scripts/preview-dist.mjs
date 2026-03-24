import { createReadStream } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const distRoot = resolve('dist');

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

const getFlagValue = (flag) => {
  const exactFlagIndex = process.argv.indexOf(flag);

  if (exactFlagIndex >= 0) {
    return process.argv[exactFlagIndex + 1];
  }

  const inlineFlag = process.argv.find((argument) => argument.startsWith(`${flag}=`));
  return inlineFlag?.slice(flag.length + 1);
};

const host = getFlagValue('--host') ?? '127.0.0.1';
const port = Number(getFlagValue('--port') ?? '4321');

if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`Invalid --port value: ${String(getFlagValue('--port'))}`);
}

const toSafeFilePath = (pathname) => {
  const decodedPath = decodeURIComponent(pathname);
  const normalizedPath = normalize(decodedPath).replace(/^([/\\])+/, '');
  const resolvedPath = resolve(distRoot, normalizedPath);

  if (resolvedPath !== distRoot && !resolvedPath.startsWith(`${distRoot}${sep}`)) {
    return null;
  }

  return resolvedPath;
};

const fileExists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const resolveRequestFile = async (pathname) => {
  if (pathname === '/') {
    return { filePath: join(distRoot, 'index.html'), statusCode: 200 };
  }

  const safePath = toSafeFilePath(pathname);

  if (!safePath) {
    return { filePath: join(distRoot, '404.html'), statusCode: 404 };
  }

  if (await fileExists(safePath)) {
    const safePathStats = await stat(safePath);

    if (safePathStats.isFile()) {
      return { filePath: safePath, statusCode: pathname === '/404.html' ? 200 : 200 };
    }

    if (safePathStats.isDirectory()) {
      const directoryIndexPath = join(safePath, 'index.html');

      if (await fileExists(directoryIndexPath)) {
        return { filePath: directoryIndexPath, statusCode: 200 };
      }
    }
  }

  const directoryStylePath = pathname.endsWith('/')
    ? join(distRoot, pathname.slice(1), 'index.html')
    : join(distRoot, pathname.slice(1), 'index.html');

  if (await fileExists(directoryStylePath)) {
    return { filePath: directoryStylePath, statusCode: 200 };
  }

  return { filePath: join(distRoot, '404.html'), statusCode: pathname === '/404.html' ? 200 : 404 };
};

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);
    const { filePath, statusCode } = await resolveRequestFile(requestUrl.pathname);
    const contentType = mimeTypes.get(extname(filePath).toLowerCase()) ?? 'application/octet-stream';

    response.statusCode = statusCode;
    response.setHeader('Content-Type', contentType);
    response.setHeader('Cache-Control', 'no-cache');

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    if (extname(filePath).toLowerCase() === '.html') {
      response.end(await readFile(filePath));
      return;
    }

    createReadStream(filePath)
      .on('error', (error) => {
        response.statusCode = 500;
        response.end(`Failed to read ${filePath}: ${error.message}`);
      })
      .pipe(response);
  } catch (error) {
    response.statusCode = 500;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end(error instanceof Error ? error.message : 'Unknown preview server error');
  }
});

server.listen(port, host, () => {
  console.log(`> dist preview ready at http://${host}:${port}`);
});

const shutdown = () => {
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
