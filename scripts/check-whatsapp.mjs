/**
 * Confirms the WhatsApp Cloud API credentials in .env.local actually work,
 * without sending a message to anyone.
 *
 * Reads the token from .env.local rather than taking it as an argument, so it
 * never lands in shell history. Nothing is printed that identifies the token
 * beyond its length.
 *
 *   node scripts/check-whatsapp.mjs
 *
 * Two checks, because they fail for different reasons and the difference is
 * the whole diagnosis: reading the phone number needs
 * whatsapp_business_messaging, reading the account's templates needs
 * whatsapp_business_management. A token missing one scope passes the first
 * and fails the second.
 */

import { readFileSync } from 'fs';

function loadEnvLocal() {
  let text;
  try {
    text = readFileSync('.env.local', 'utf8');
  } catch {
    console.error('No .env.local found. Run this from the project root.');
    process.exit(1);
  }
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnvLocal();
const token = env.WHATSAPP_TOKEN;
const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
const wabaId = env.WHATSAPP_WABA_ID;
const version = env.WHATSAPP_API_VERSION || 'v21.0';

const missing = [
  !token && 'WHATSAPP_TOKEN',
  !phoneId && 'WHATSAPP_PHONE_NUMBER_ID',
  !wabaId && 'WHATSAPP_WABA_ID',
].filter(Boolean);

if (missing.length) {
  console.error(`Missing in .env.local: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`Token present (${token.length} characters), API ${version}.\n`);

async function get(path, label) {
  const response = await fetch(`https://graph.facebook.com/${version}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json();

  if (!response.ok) {
    const error = body?.error ?? {};
    console.error(`✗ ${label}`);
    console.error(`  ${error.message ?? response.statusText}`);
    if (error.code) console.error(`  code ${error.code}, type ${error.type ?? '—'}`);
    return null;
  }

  console.log(`✓ ${label}`);
  return body;
}

const number = await get(
  `${phoneId}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`,
  'Phone number readable (scope: whatsapp_business_messaging)'
);

if (number) {
  console.log(`  ${number.verified_name} · ${number.display_phone_number}`);
  console.log(`  quality: ${number.quality_rating ?? 'unknown'}`);
}

const templates = await get(
  `${wabaId}/message_templates?limit=50`,
  'Templates readable (scope: whatsapp_business_management)'
);

if (templates) {
  const list = templates.data ?? [];
  if (list.length === 0) {
    console.log('  No templates yet — nothing can be sent to a client who has');
    console.log('  not messaged you in the last 24 hours until one is approved.');
  } else {
    for (const t of list) {
      console.log(`  ${t.status.padEnd(9)} ${t.name} (${t.language}, ${t.category})`);
    }
  }
}

// A token that expires is the failure this script exists to catch early: it
// works today and stops overnight, with no code change to blame it on.
const debug = await get(
  `debug_token?input_token=${encodeURIComponent(token)}`,
  'Token inspected'
);

const expires = debug?.data?.expires_at;
if (expires === 0) {
  console.log('  Never expires — correct for a System User token.');
} else if (typeof expires === 'number') {
  console.log(`  EXPIRES ${new Date(expires * 1000).toISOString()}`);
  console.log('  This is a temporary token. Generate a System User token with');
  console.log('  expiration set to Never, or sending will break when it lapses.');
}
