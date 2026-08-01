// app/api/[...path]/route.ts  (and identically for app/api/serve-upload/[...path]/route.ts)
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const SEARCH_FOLDERS = [
  'uploads',
  'arrivals',
  'blogs',
  'carousel',
  'fonts',
  'shop-by-concern',
  '', // root of public
];

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain',
};

// Resolves candidate + segment safely; returns null if it would escape base
function safeResolve(baseDir: string, relPath: string): string | null {
  const resolved = path.normalize(path.join(baseDir, relPath));
  if (resolved !== baseDir && !resolved.startsWith(baseDir + path.sep)) {
    return null; // traversal attempt
  }
  return resolved;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const params = await context.params;
    const filePath = params.path.map(segment => decodeURIComponent(segment)).join('/');

    // Reject anything containing traversal sequences outright
    if (filePath.includes('..') || path.isAbsolute(filePath)) {
      return new NextResponse('Not found', { status: 404 });
    }

    const publicRoot = path.join(process.cwd(), 'public');
    let fullPath: string | null = null;

    for (const folder of SEARCH_FOLDERS) {
      const baseDir = folder ? path.join(publicRoot, folder) : publicRoot;
      const candidate = safeResolve(baseDir, filePath);
      if (candidate && existsSync(candidate)) {
        fullPath = candidate;
        break;
      }
    }

    if (!fullPath) {
      return new NextResponse('File not found', { status: 404 });
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = CONTENT_TYPES[ext];
    if (!contentType) {
      // Only ever serve known-safe file types
      return new NextResponse('Not found', { status: 404 });
    }

    const fileBuffer = await readFile(fullPath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}