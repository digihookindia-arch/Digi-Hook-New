import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  ATTACHMENT_TYPES,
  ATTACHMENTS_PER_MESSAGE,
  attachmentProblem,
} from './ticketRules';
import { insertAttachment, type TicketAttachment } from './tickets';

/**
 * The file-IO half of ticket attachments. Binaries live on disk under
 * data/uploads (gitignored, beside the SQLite file — same backup story);
 * the database holds metadata only. Files are stored under a random id and
 * an extension derived from the *validated* mime type — the client's
 * filename is display text, never a path.
 */

const UPLOADS_DIR = resolve(process.env.UPLOADS_PATH ?? 'data/uploads');

export type SaveResult = { saved: number; problem: string | null };

/**
 * Validates and stores a message's attachments. Stops at the first
 * problem file and reports it; earlier files in the batch stay saved —
 * the message itself has already been persisted by the caller.
 */
export async function saveMessageAttachments(
  ticketId: string,
  messageId: string,
  files: File[]
): Promise<SaveResult> {
  const usable = files.filter((f) => f && typeof f.size === 'number' && f.size > 0);
  if (usable.length === 0) return { saved: 0, problem: null };
  if (usable.length > ATTACHMENTS_PER_MESSAGE) {
    return { saved: 0, problem: `Up to ${ATTACHMENTS_PER_MESSAGE} files per message.` };
  }

  let saved = 0;
  for (const file of usable) {
    const problem = attachmentProblem(file.type, file.size);
    if (problem) return { saved, problem };

    const id = randomUUID();
    const ext = ATTACHMENT_TYPES[file.type];
    const dir = join(UPLOADS_DIR, 'tickets', ticketId);
    const path = join(dir, `${id}.${ext}`);

    await mkdir(dir, { recursive: true });
    await writeFile(path, Buffer.from(await file.arrayBuffer()));

    const record: TicketAttachment = {
      id,
      ticketId,
      messageId,
      filename: (file.name || `attachment.${ext}`).slice(0, 120),
      mime: file.type,
      size: file.size,
      path,
      createdAt: new Date().toISOString(),
    };
    await insertAttachment(record);
    saved++;
  }
  return { saved, problem: null };
}
