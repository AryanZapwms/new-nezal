import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Only these top-level public subfolders may be served through this route
const ALLOWED_FOLDERS = new Set([
  'arrivals',
  'blogs',
  'carousel',
  'ingredients',
  'oldlogo',
  'products',
  'shop-by-concern',
  'uploads',
  'fonts',
]);

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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const params = await context.params;
    const folder = params.path[0];
    const filePath = params.path.slice(1).map(segment => decodeURIComponent(segment)).join('/');

    // 1. Folder must be an explicitly allowed one
    if (!folder || !ALLOWED_FOLDERS.has(folder)) {
      return new NextResponse('Not found', { status: 404 });
    }

    const publicRoot = path.join(process.cwd(), 'public');
    const baseDir = path.join(publicRoot, folder);
    const fullPath = path.normalize(path.join(baseDir, filePath));

    // 2. Resolved path must stay inside baseDir — this is what blocks ../ traversal
    if (fullPath !== baseDir && !fullPath.startsWith(baseDir + path.sep)) {
      return new NextResponse('Not found', { status: 404 });
    }

    // 3. Extension must be a known-safe type — never serve .php, .env, etc.
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = CONTENT_TYPES[ext];
    if (!contentType) {
      return new NextResponse('Not found', { status: 404 });
    }

    if (!existsSync(fullPath)) {
      return new NextResponse('File not found', { status: 404 });
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