/**
 * Puts the AiSensy API key and campaign names on the production server.
 *
 * Run it yourself:
 *
 *   node scripts/set-aisensy-keys.mjs
 *
 * The key is read at a hidden prompt, so it stays out of shell history, and it
 * travels to the server over stdin rather than as an argument, so it never
 * appears in the process list on a box shared with other sites.
 *
 * Campaign names are visible as you type — they are not secret, and seeing
 * them is how you catch a typo before it becomes a message that never sends.
 *
 * Nothing is written unless the key authenticates. AiSensy has no "verify"
 * endpoint, so the check is a deliberately invalid send: a bad key answers
 * 401/403, while a good key gets far enough to complain about the campaign or
 * the number instead. That difference is what tells the two apart.
 */
import { spawn } from 'node:child_process';

const SSH = [
  '-i',
  `${process.env.HOME || process.env.USERPROFILE}/.ssh/digihook_vps`,
  'root@200.141.14.174',
];
const APP = '/home/digihook/htdocs/digihook.in';

const CAMPAIGNS = [
  ['AISENSY_CAMPAIGN_NEW_LEAD', 'New lead auto-reply', 'digihook_new_lead'],
  ['AISENSY_CAMPAIGN_PROPOSAL_READY', 'Proposal ready', 'digihook_proposal_ready'],
  ['AISENSY_CAMPAIGN_PROPOSAL_ACCEPTED', 'Proposal accepted', 'digihook_proposal_accepted'],
  ['AISENSY_CAMPAIGN_PAYMENT_DUE', 'Payment due', 'digihook_payment_due'],
  ['AISENSY_CAMPAIGN_PAYMENT_RECEIVED', 'Payment received', 'digihook_payment_received'],
];

function ask(question, { hidden = false, fallback = '' } = {}) {
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
      ok ? resolve(value.trim() || fallback) : process.exit(1);
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

console.log('AiSensy → digihook.in production\n');
console.log('AiSensy → your project → Manage → API Campaign Key.');
console.log('The key is shown once; regenerate if you no longer have it.\n');

const apiKey = await ask('AISENSY_API_KEY (hidden): ', { hidden: true });
if (!apiKey || /\s/.test(apiKey) || apiKey.length < 20) {
  console.log('\nThat does not look like an API key. Nothing was changed.');
  process.exit(1);
}

console.log('\nCampaign names — the API campaign, not the template.');
console.log('Press Enter to accept the suggested name in brackets.\n');

const vars = { AISENSY_API_KEY: apiKey };
for (const [key, label, suggested] of CAMPAIGNS) {
  const value = await ask(`${label.padEnd(22)} [${suggested}]: `, { fallback: suggested });
  if (value) vars[key] = value;
}

// No verify endpoint exists, so this is a send that cannot succeed: an
// obviously invalid destination. A bad key is rejected outright; a good one
// gets past authentication and objects to the number or the campaign instead.
process.stdout.write('\nChecking the key against AiSensy... ');
const res = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    apiKey,
    campaignName: '__connectivity_check__',
    destination: '+910000000000',
    userName: 'check',
    templateParams: [],
  }),
});
const body = await res.text().catch(() => '');
if (res.status === 401 || res.status === 403 || /invalid.*(api ?key|token)/i.test(body)) {
  console.log('REJECTED');
  console.log(`\n  HTTP ${res.status}: ${body.slice(0, 200)}`);
  console.log('\nNothing was changed. Regenerate the key in AiSensy and try again.');
  process.exit(1);
}
console.log('accepted');
console.log(`  (AiSensy answered ${res.status} to a deliberately invalid send, which is`);
console.log('   what a working key does — it got past authentication.)');

const payload = JSON.stringify(vars);
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
await ssh(`cd ${APP} && sudo -u digihook pm2 restart digihook --update-env >/dev/null 2>&1 && sleep 6 && echo ok`);
console.log('restarted');

console.log('\nDone. WhatsApp is live for every campaign you named.');
console.log('Nothing sends to a client until the next real acceptance or payment.');
