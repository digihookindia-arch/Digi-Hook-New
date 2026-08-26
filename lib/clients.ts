import { randomUUID } from 'crypto';
import { getDb } from './db';

/**
 * Client portal accounts — auth identity only. Everything a client *sees*
 * (business name, payments, support window) lives on portal_projects; this
 * table is just who can log in. Deliberately unrelated to proposals.
 */

export type Client = {
  id: string;
  email: string;
  name: string;
  /** '' until the client sets a password from the invite link. */
  passwordHash: string;
  createdAt: string;
};

type Row = {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
};

function toClient(row: Row): Client {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

/** One normalisation, applied at every entry point, so lookups never miss on case. */
function normalise(email: string): string {
  return email.trim().toLowerCase();
}

export async function getClient(id: string): Promise<Client | null> {
  const row = getDb()
    .prepare('SELECT * FROM clients WHERE id = ?')
    .get(id) as Row | undefined;
  return row ? toClient(row) : null;
}

export async function getClientByEmail(email: string): Promise<Client | null> {
  const row = getDb()
    .prepare('SELECT * FROM clients WHERE email = ?')
    .get(normalise(email)) as Row | undefined;
  return row ? toClient(row) : null;
}

/**
 * Inviting an email that already has an account must reuse it — one login per
 * client, however many projects. The name only lands on first creation.
 */
export async function createOrGetClientByEmail(
  email: string,
  name: string
): Promise<Client> {
  const existing = await getClientByEmail(email);
  if (existing) return existing;

  const client: Client = {
    id: randomUUID(),
    email: normalise(email),
    name: name.trim(),
    passwordHash: '',
    createdAt: new Date().toISOString(),
  };
  getDb()
    .prepare(
      `INSERT INTO clients (id, email, name, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(client.id, client.email, client.name, client.passwordHash, client.createdAt);
  return client;
}

export async function setClientPassword(id: string, passwordHash: string): Promise<void> {
  getDb().prepare('UPDATE clients SET password_hash = ? WHERE id = ?').run(passwordHash, id);
}

/** True once the client has set a password from the invite link. */
export function isActivated(client: Client): boolean {
  return client.passwordHash !== '';
}
