import { readFile } from 'node:fs/promises';
import { type NextRequest, NextResponse } from 'next/server';
import { CLIENT_COOKIE } from '@/lib/cookies';
import { verifyClientSessionToken } from '@/lib/auth';
import { getClient } from '@/lib/clients';
import { getProject } from '@/lib/portalProjects';
import { getDocument } from '@/lib/documents';

export const dynamic = 'force-dynamic';

/** Serves one project document to its owning client — the tickets-file gate, same chain. */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ projectId: string; documentId: string }> }
) {
  const { projectId, documentId } = await ctx.params;

  const clientId = verifyClientSessionToken(request.cookies.get(CLIENT_COOKIE)?.value);
  const client = clientId ? await getClient(clientId) : null;
  if (!client) return new NextResponse(null, { status: 404 });

  const project = await getProject(projectId);
  if (!project || project.clientId !== client.id) {
    return new NextResponse(null, { status: 404 });
  }
  const document = await getDocument(documentId);
  if (!document || document.projectId !== project.id) {
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
