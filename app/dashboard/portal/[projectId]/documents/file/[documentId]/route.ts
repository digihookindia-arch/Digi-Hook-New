import { readFile } from 'node:fs/promises';
import { type NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/cookies';
import { verifySessionToken } from '@/lib/auth';
import { getDocument } from '@/lib/documents';

export const dynamic = 'force-dynamic';

/** Serves a project document to a signed-in studio session. */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ projectId: string; documentId: string }> }
) {
  const { projectId, documentId } = await ctx.params;

  if (!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return new NextResponse(null, { status: 404 });
  }
  const document = await getDocument(documentId);
  if (!document || document.projectId !== projectId) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const data = await readFile(document.path);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': document.mime,
        'Content-Disposition': `inline; filename="${document.filename.replace(/[^\w. -]/g, '_')}"`,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
