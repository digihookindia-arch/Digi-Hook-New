import { readFile } from 'node:fs/promises';
import { type NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/cookies';
import { verifySessionToken } from '@/lib/auth';
import { getAttachment, getTicket } from '@/lib/tickets';

export const dynamic = 'force-dynamic';

/** Serves a ticket attachment to a signed-in studio session. */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { id, attachmentId } = await ctx.params;

  if (!verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return new NextResponse(null, { status: 404 });
  }
  const ticket = await getTicket(id);
  const attachment = await getAttachment(attachmentId);
  if (!ticket || !attachment || attachment.ticketId !== ticket.id) {
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
