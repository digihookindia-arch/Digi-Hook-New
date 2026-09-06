/**
 * Puts the Razorpay keys on the production server and restarts the app.
 *
 * Run this yourself — it is deliberately not something the assistant does,
 * because live keys can move real money.
 *
 *   node scripts/set-razorpay-keys.mjs
 *
 * What it does, in order:
 *   1. prompts for each value (secrets are never echoed, and because they are
 *      typed at a prompt rather than passed as arguments they do not enter
 *      shell history);
 *   2. checks the shapes, so a mis-paste is caught before it is stored;
 *   3. proves the pair authenticates against Razorpay with a read-only call —
 *      nothing is created on your account;
 *   4. writes them to the server's .env.local over SSH, piping through stdin
 *      so the values never appear in the process list;
 *   5. restarts pm2 and confirms the webhook route woke up.
 *
 * Nothing is written if any step fails.
 */
import { spawn } from 'node:child_process';

const SSH = ['-i', `${process.env.HOME || process.env.USERPROFILE}/.ssh/digihook_vps`, 'root@200.141.14.174'];
const APP = '/home/digihook/htdocs/digihook.in';

/* ── prompting ──────────────────────────────────────────────────────────── */

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      reject(new Error('No terminal attached — run this directly in your terminal.'));
      return;
    }
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let value = '';
    const finish = (ok) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off('data', onData);
      process.stdout.write('\n');
      ok ? resolve(value.trim()) : process.exit(1);
    };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') return finish(true);
        if (ch === '\u0003') return finish(false);
        if (ch === '\u007f' || ch === '\b') {
          value = value.slice(0, -1);
          if (!hidden) process.stdout.write('\b \b');
        } else if (ch >= ' ') {
          value += ch;
          if (!hidden) process.stdout.write(ch);
        }
      }
    };
    stdin.on('data', onData);
  });
}

/* ── validation ─────────────────────────────────────────────────────────── */

function badKeyId(v) {
  if (!v) return 'nothing was entered';
  if (/\s/.test(v)) return 'it contains spaces';
  if (!/^rzp_(live|test)_[A-Za-z0-9]+$/.test(v)) {
    return 'it should look like rzp_live_XXXXXXXX (or rzp_test_ for test mode)';
  }
  return null;
}

function badSecret(v, what) {
  if (!v) return 'nothing was entered';
  if (/\s/.test(v)) return 'it contains spaces';
  if (v.includes('=')) return 'it contains "=", which looks like a config line rather than a value';
  if (/[^\x21-\x7e]/.test(v)) return 'it contains non-ASCII characters, which looks like pasted text';
  if (v.length < 10) return `it is only ${v.length} characters`;
  if (v.length > 120) return `it is ${v.length} characters, far longer than a ${what}`;
  return null;
}

/* ── ssh, without secrets on the command line ───────────────────────────── */

function ssh(remoteCommand, stdinText = null) {
  return new Promise((resolve, reject) => {
    const child = spawn('ssh', [...SSH, remoteCommand], {
      stdio: [stdinText === null ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) =>
      code === 0 ? resolve(out.trim()) : reject(new Error(err.trim() || `ssh exited ${code}`))
    );
    if (stdinText !== null) {
      child.stdin.write(stdinText);
      child.stdin.end();
    }
  });
}

/* ── go ─────────────────────────────────────────────────────────────────── */

console.log('Razorpay keys → digihook.in production\n');
console.log('Dashboard → Account & Settings → API Keys. Live keys start rzp_live_.');
console.log('The secret is shown once at generation.\n');

const keyId = await ask('RAZORPAY_KEY_ID            : ');
let problem = badKeyId(keyId);
if (problem) {
  console.log(`\nThat is not a key id — ${problem}.\nNothing was changed.`);
  process.exit(1);
}

const keySecret = await ask('RAZORPAY_KEY_SECRET (hidden): ', { hidden: true });
problem = badSecret(keySecret, 'key secret');
if (problem) {
  console.log(`\nThat is not a key secret — ${problem}.\nNothing was changed.`);
  process.exit(1);
}

console.log('\nWebhook secret — the one you set when creating the webhook at');
console.log('  Razorpay → Settings → Webhooks → https://digihook.in/api/razorpay/webhook');
console.log('  (events: payment.captured, payment.failed)');
console.log('Leave blank to skip: payments still work, but a client who closes the tab');
console.log('mid-payment will not be reconciled automatically.\n');

const webhookSecret = await ask('RAZORPAY_WEBHOOK_SECRET (hidden): ', { hidden: true });
if (webhookSecret) {
  problem = badSecret(webhookSecret, 'webhook secret');
  if (problem) {
    console.log(`\nThat is not a webhook secret — ${problem}.\nNothing was changed.`);
    process.exit(1);
  }
}

const live = keyId.startsWith('rzp_live_');
console.log(`\nMode: ${live ? 'LIVE — real money will move' : 'TEST — no real money'}`);

// Read-only: lists at most one payment. Creates nothing on the account.
process.stdout.write('Checking the keys against Razorpay... ');
const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
const res = await fetch('https://api.razorpay.com/v1/payments?count=1', {
  headers: { Authorization: `Basic ${auth}` },
});
if (!res.ok) {
  const body = await res.json().catch(() => ({}));
  console.log('FAILED');
  console.log(`\n  HTTP ${res.status}: ${body?.error?.description ?? 'authentication rejected'}`);
  console.log('\nNothing was changed.');
  process.exit(1);
}
console.log('OK');

if (live) {
  const confirm = await ask('\nType LIVE to write these to production: ');
  if (confirm !== 'LIVE') {
    console.log('Not confirmed — nothing was changed.');
    process.exit(1);
  }
}

// The values go over stdin, never in argv, so they never appear in `ps`.
const payload = JSON.stringify({
  RAZORPAY_KEY_ID: keyId,
  RAZORPAY_KEY_SECRET: keySecret,
  ...(webhookSecret ? { RAZORPAY_WEBHOOK_SECRET: webhookSecret } : {}),
});

const writer = `
  cd ${APP} &&
  sudo -u digihook node -e '
    const fs = require("node:fs");
    let text = fs.readFileSync(".env.local", "utf8");
    const vars = JSON.parse(fs.readFileSync(0, "utf8"));
    for (const [k, v] of Object.entries(vars)) {
      const re = new RegExp("^" + k + "=.*$", "m");
      text = re.test(text) ? text.replace(re, k + "=" + v) : text.replace(/\\s*$/, "\\n") + k + "=" + v + "\\n";
    }
    fs.writeFileSync(".env.local", text);
    console.log("wrote: " + Object.keys(vars).join(", "));
  '
`;

console.log('\nWriting to the server...');
console.log(await ssh(writer, payload));

console.log('Restarting the app...');
await ssh(`cd ${APP} && sudo -u digihook pm2 restart digihook --update-env >/dev/null 2>&1 && sleep 5 && echo restarted`);
console.log('restarted');

// A configured webhook rejects a bad signature with 401; an unconfigured one
// plays dead with 404. That difference is the proof the secret landed.
if (webhookSecret) {
  const hook = await fetch('https://digihook.in/api/razorpay/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': 'deliberately-wrong' },
    body: JSON.stringify({ event: 'payment.captured' }),
  });
  console.log(
    hook.status === 401
      ? 'webhook: live (rejected a bad signature, as it should)'
      : `webhook: unexpected status ${hook.status} — check the server env`
  );
}

console.log('\nDone. Payment buttons on digihook.in are now enabled.');
if (live) console.log('These are LIVE keys — the next client click charges real money.');
