import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { getDb } from './db';
import { ATTACHMENT_TYPES, attachmentProblem } from './ticketRules';

/**
 * Project documents the studio shares with a client — invoices, scope,
 * agreements, handover papers. Same storage split and validation as ticket
 * attachments: the allow-list and size cap are one policy, not two.
 */

const UPLOADS_DIR = resolve(process.env.UPLOADS_PATH ?? 'data/uploads');

export type ProjectDocument = {
  id: string;
  projectId: string;
  title: string;
  filename: string;
  mime: string;
  size: number;
  /** Absolute path on disk — server-side only. */
  path: string;
  createdAt: string;
};

type Row = {
  id: string;
  project_id: string;
  title: string;
  filename: string;
  mime: string;
  size: number;
  path: string;
  created_at: string;
};

function toDocument(row: Row): ProjectDocument {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    filename: row.filename,
    mime: row.mime,
    size: row.size,
    path: row.path,
    createdAt: row.created_at,
  };
}

export async function saveDocument(
  projectId: string,
  title: string,
  file: File
): Promise<{ document: ProjectDocument | null; problem: string | null }> {
  const cleanTitle = title.trim().slice(0, 120);
  if (!cleanTitle) return { document: null, problem: 'Give the document a title.' };
  const problem = attachmentProblem(file.type, file.size);
  if (problem) return { document: null, problem };

  const id = randomUUID();
  const ext = ATTACHMENT_TYPES[file.type];
  const dir = join(UPLOADS_DIR, 'documents', projectId);
  const path = join(dir, `${id}.${ext}`);

  await mkdir(dir, { recursive: true });
  await writeFile(path, Buffer.from(await file.arrayBuffer()));

  const document: ProjectDocument = {
    id,
    projectId,
    title: cleanTitle,
    filename: (file.name || `${cleanTitle}.${ext}`).slice(0, 120),
    mime: file.type,
    size: file.size,
    path,
    createdAt: new Date().toISOString(),
  };
  getDb()
    .prepare(
      `INSERT INTO documents (id, project_id, title, filename, mime, size, path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      document.id,
      document.projectId,
      document.title,
      document.filename,
      document.mime,
      document.size,
      document.path,
      document.createdAt
    );
  return { document, problem: null };
}

export async function listDocuments(projectId: string): Promise<ProjectDocument[]> {
  const rows = getDb()
    .prepare('SELECT * FROM documents WHERE project_id = ? ORDER BY created_at DESC')
    .all(projectId) as Row[];
  return rows.map(toDocument);
}

export async function getDocument(id: string): Promise<ProjectDocument | null> {
  const row = getDb()
    .prepare('SELECT * FROM documents WHERE id = ?')
    .get(id) as Row | undefined;
  return row ? toDocument(row) : null;
}

/** Removes the record and, best-effort, the file behind it. */
export async function deleteDocument(id: string): Promise<void> {
  const document = await getDocument(id);
  getDb().prepare('DELETE FROM documents WHERE id = ?').run(id);
  if (document) {
    try {
      await unlink(document.path);
    } catch {
      // The record is gone either way; an orphaned file is a cleanup chore,
      // not an error worth failing the action over.
    }
  }
}
