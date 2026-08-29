import { readFile } from 'node:fs/promises';
import { type NextRequest, NextResponse } from 'next/server';
import { CLIENT_COOKIE } from '@/lib/cookies';
import { verifyClientSessionToken } from '@/lib/auth';
import { getClient } from '@/lib/clients';
import { getProject } from '@/lib/portalProjects';
import { getAttachment, getTicket } from '@/lib/tickets';

export const dynamic = 'force-dynamic';

/**
 * Serves one ticket attachment to its owning client. The chain of checks
 * mirrors the page gates exactly: valid session → the client owns the
 * project in the URL → the ticket belongs to both → the attachment belongs
 * to the ticket. Anything else is a plain 404 — files never confirm their
 * own existence to the wrong account.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ projectId: string; id: string; attachmentId: string }> }
) {
  const { projectId, id, attachmentId } = await ctx.params;

  const clientId = verifyClientSessionToken(request.cookies.get(CLIENT_COOKIE)?.value);
  const client = clientId ? await getClient(clientId) : null;
  if (!client) return new NextResponse(null, { status: 404 });

  const project = await getProject(projectId);
  if (!project || project.clientId !== client.id) {
    return new NextResponse(null, { status: 404 });
  }
  const ticket = await getTicket(id);
  if (!ticket || ticket.projectId !== project.id || ticket.clientId !== client.id) {
    return new NextResponse(null, { status: 404 });
  }
  const attachment = await getAttachment(attachmentId);
  if (!attachment || attachment.ticketId !== ticket.id) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const data = await readFile(attachment.path);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': attachment.mime,
        'Content-Disposition': `inline; filename="${attachment.filename.replace(/[^\w. -]/g, '_')}"`,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
