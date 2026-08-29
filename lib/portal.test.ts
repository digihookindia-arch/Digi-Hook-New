/**
 * The portal's auth primitives and support-window arithmetic reach the public
 * internet, so these pin the properties that matter: a password hash cannot
 * be forged or crash the login page, a token minted for one purpose never
 * verifies as another, a set-password link dies the moment it is used, and
 * the days-remaining countdown is honest at its boundaries.
 */

// lib/auth reads AUTH_SECRET at call time, not import time, but set it first
// so the ordering can never matter.
process.env.AUTH_SECRET = 'x'.repeat(32);

import {
  hashPassword,
  verifyPassword,
  createClientSessionToken,
  verifyClientSessionToken,
  createSetPasswordToken,
  verifySetPasswordToken,
  createSessionToken,
  verifySessionToken,
  createOAuthStateToken,
  verifyOAuthStateToken,
} from '@/lib/auth';
import { validateGoogleClaims } from '@/lib/googleAuth';
import { supportState } from '@/lib/support';
import {
  parseKind,
  isTicketStatus,
  cleanSubject,
  cleanBody,
  parsePriority,
  cleanQuoteInr,
  attachmentProblem,
  ATTACHMENT_MAX_BYTES,
  TICKET_SUBJECT_MAX,
  TICKET_BODY_MAX,
} from '@/lib/tickets';
import {
  balanceInr,
  cleanSiteUrl,
  cleanStatsCode,
  type PortalProject,
} from '@/lib/portalProjects';
import { shapeStats } from '@/lib/stats';
import { classifyHealth, sslDaysLeft } from '@/lib/siteHealth';
import { dueThreshold } from '@/lib/renewals';

let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    pass++;
    console.log('  PASS  ' + name);
  } else {
    fail++;
    console.log('  FAIL  ' + name, detail === undefined ? '' : JSON.stringify(detail));
  }
}

console.log('\n— passwords hash and verify without ever throwing —');

const stored = hashPassword('correct horse battery staple');
check('a password verifies against its own hash', verifyPassword('correct horse battery staple', stored));
check('a wrong password fails', !verifyPassword('correct horse battery stable', stored));
check('an empty candidate fails', !verifyPassword('', stored));
check('an empty stored hash fails without throwing (invited, not activated)', !verifyPassword('anything', ''));
check('a malformed stored value fails without throwing', !verifyPassword('x', 'not-a-hash-at-all'));
check('a truncated stored value fails without throwing', !verifyPassword('x', 'scrypt:16384:8:1:abcd'));
check('corrupted hex fails without throwing', !verifyPassword('x', 'scrypt:16384:8:1:zz:zz'));
check('two hashes of one password differ (random salt)',
  hashPassword('same input') !== hashPassword('same input'));

console.log('\n— a session token is bound to one client and one purpose —');

const session = createClientSessionToken('client-a');
check('a session token round-trips to its clientId', verifyClientSessionToken(session) === 'client-a');
check('a missing token is null', verifyClientSessionToken(undefined) === null);
check('a truncated token is null', verifyClientSessionToken(session.slice(0, -2)) === null);
check('swapping the clientId breaks the signature',
  verifyClientSessionToken(session.replace('client-a', 'client-b')) === null);
check('a dashboard session token never verifies as a client token',
  verifyClientSessionToken(createSessionToken()) === null);
check('a client token never verifies as a dashboard session',
  !verifySessionToken(session));
check('a set-password token never verifies as a session token',
  verifyClientSessionToken(createSetPasswordToken('client-a', '', 60_000)) === null);

console.log('\n— a set-password link works exactly once —');

const inviteToken = createSetPasswordToken('client-a', '', 7 * 86_400_000);
check('a fresh invite token verifies against the empty hash',
  verifySetPasswordToken(inviteToken, '') === 'client-a');
check('the same link dies once a password is set (hash changed)',
  verifySetPasswordToken(inviteToken, stored) === null);
const resetToken = createSetPasswordToken('client-a', stored, 3_600_000);
check('a reset token verifies against the current hash',
  verifySetPasswordToken(resetToken, stored) === 'client-a');
check('a reset token dies when the password changes again',
  verifySetPasswordToken(resetToken, hashPassword('new password here')) === null);
check('an expired link is null',
  verifySetPasswordToken(createSetPasswordToken('client-a', '', -1000), '') === null);
check('a token for the wrong account fails',
  verifySetPasswordToken(createSetPasswordToken('client-b', '', 60_000).replace('client-b', 'client-a'), '') === null);

console.log('\n— the support countdown is honest at its boundaries —');

const jan = (day: number, hour = 0) => new Date(Date.UTC(2026, 0, day, hour));

check('no live date means support has not started',
  supportState(null, 180, jan(1)).state === 'not_live');
check('a future live date means support has not started',
  supportState('2026-01-10', 180, jan(1)).state === 'not_live');
check('an unparsable live date degrades to not_live rather than throwing',
  supportState('01/05/2026', 180, jan(1)).state === 'not_live');
const dayOne = supportState('2026-01-01', 180, jan(1));
check('day one of a 180-day window has 180 days left',
  dayOne.state === 'active' && dayOne.daysLeft === 180);
const lastDay = supportState('2026-01-01', 10, jan(10));
check('the final covered day has 1 day left',
  lastDay.state === 'active' && lastDay.daysLeft === 1, lastDay);
check('midway through the final day still counts as 1 day left',
  (() => { const s = supportState('2026-01-01', 10, jan(10, 12)); return s.state === 'active' && s.daysLeft === 1; })());
const boundary = supportState('2026-01-01', 10, jan(11));
check('the day the window closes reads as ended', boundary.state === 'ended');
check('the ended state names the end date',
  boundary.state === 'ended' && boundary.endedOn === '2026-01-11', boundary);
const active = supportState('2026-01-01', 10, jan(5));
check('the active state names the end date',
  active.state === 'active' && active.endsOn === '2026-01-11', active);
check('a zero-day window is ended from its live date',
  supportState('2026-01-01', 0, jan(1)).state === 'ended');

console.log('\n— ticket input cannot smuggle values past the schema —');

check('an unknown kind falls back to support', parseKind('billing') === 'support');
check('a known kind passes through', parseKind('feature') === 'feature');
check('an unknown status is rejected', !isTicketStatus('reopened'));
check('a known status is accepted', isTicketStatus('waiting_client'));
check('a subject is trimmed', cleanSubject('  hello  ') === 'hello');
check('an empty-after-trim subject is null', cleanSubject('   ') === null);
check('an overlong subject is capped',
  cleanSubject('s'.repeat(9999))?.length === TICKET_SUBJECT_MAX);
check('an overlong body is capped', cleanBody('b'.repeat(99999))?.length === TICKET_BODY_MAX);
check('a null body is null, not the string "null"', cleanBody(null) === null);
check('an unknown priority falls back to normal', parsePriority('critical') === 'normal');
check('a known priority passes through', parsePriority('urgent') === 'urgent');
check('a quote parses to whole rupees', cleanQuoteInr('45000.9') === 45000);
check('a zero quote is rejected', cleanQuoteInr(0) === null);
check('an absurd quote is rejected', cleanQuoteInr(9e9) === null);
check('a prose quote is rejected', cleanQuoteInr('call us') === null);
check('an allowed image within size passes', attachmentProblem('image/png', 1024) === null);
check('a disallowed mime is refused', attachmentProblem('application/zip', 1024) !== null);
check('an oversize file is refused', attachmentProblem('image/png', ATTACHMENT_MAX_BYTES + 1) !== null);
check('an empty file is refused', attachmentProblem('image/png', 0) !== null);

console.log('\n— the payment summary never shows a negative balance —');

const project = (totalInr: number | null, paidInr: number): PortalProject => ({
  id: 'p', clientId: 'c', businessName: 'B', liveAt: null, supportDays: 180,
  totalInr, paidInr, siteUrl: null, serverAt: null, serverDays: 365,
  statsCode: null, statsToken: null, seoActive: false, gscProperty: null,
  rankLocation: null, createdAt: '', updatedAt: '',
});
check('no total means no balance', balanceInr(project(null, 500)) === null);
check('balance is total minus paid', balanceInr(project(100000, 20000)) === 80000);
check('overpayment clamps to zero', balanceInr(project(100000, 120000)) === 0);

console.log('\n— Google sign-in trusts only what it minted and what Google verified —');

check('an OAuth state token round-trips', verifyOAuthStateToken(createOAuthStateToken()));
check('a missing state is rejected', !verifyOAuthStateToken(undefined));
check('a tampered state is rejected',
  !verifyOAuthStateToken(createOAuthStateToken().slice(0, -2) + 'xx'));
check('a client session token is not a valid state',
  !verifyOAuthStateToken(createClientSessionToken('client-a')));

const CID = 'test-client-id.apps.googleusercontent.com';
const goodClaims = {
  aud: CID,
  iss: 'https://accounts.google.com',
  email: 'Client@Example.com',
  email_verified: 'true',
};
check('valid claims yield the normalised email',
  validateGoogleClaims(goodClaims, CID) === 'client@example.com');
check('the short issuer form is accepted',
  validateGoogleClaims({ ...goodClaims, iss: 'accounts.google.com' }, CID) === 'client@example.com');
check('a token minted for another app is rejected',
  validateGoogleClaims({ ...goodClaims, aud: 'someone-else' }, CID) === null);
check('a non-Google issuer is rejected',
  validateGoogleClaims({ ...goodClaims, iss: 'https://evil.example' }, CID) === null);
check('an unverified email is rejected',
  validateGoogleClaims({ ...goodClaims, email_verified: 'false' }, CID) === null);
check('a boolean email_verified is accepted',
  validateGoogleClaims({ ...goodClaims, email_verified: true }, CID) === 'client@example.com');
check('a missing email is rejected',
  validateGoogleClaims({ ...goodClaims, email: undefined }, CID) === null);
check('an empty configured client id rejects everything',
  validateGoogleClaims(goodClaims, '') === null);

console.log('\n— overview inputs are validated, never trusted —');

check('a bare domain becomes a normalised https URL',
  cleanSiteUrl('client-site.in/') === 'https://client-site.in');
check('an http URL passes through', cleanSiteUrl('http://old.example') === 'http://old.example');
check('a javascript: URL is rejected', cleanSiteUrl('javascript:alert(1)') === null);
check('an empty site URL is null', cleanSiteUrl('   ') === null);
check('a stats code is lowercased', cleanStatsCode('  Sharma-Legal ') === 'sharma-legal');
check('a stats code with a dot is rejected (it enters a Host header)',
  cleanStatsCode('evil.example') === null);
check('a stats code with a slash is rejected', cleanStatsCode('a/b') === null);

console.log('\n— traffic numbers degrade to null, never to a broken chart —');

const gcPayload = {
  total: 12,
  stats: [{ daily: 3 }, { daily: -1 }, { daily: 'x' }, { daily: 9 }],
};
const shaped = shapeStats(gcPayload, '2026-08-01', '2026-08-04');
check('a GoatCounter payload shapes into the panel model', shaped?.pageviews === 12);
check('negative and junk day counts read as 0',
  JSON.stringify(shaped?.daily) === '[3,0,0,9]');
check('a missing total falls back to the daily sum',
  shapeStats({ stats: [{ daily: 2 }, { daily: 5 }] }, 'a', 'b')?.pageviews === 7);
check('a malformed payload is null', shapeStats({ nope: true }, 'a', 'b') === null);
check('a null payload is null', shapeStats(null, 'a', 'b') === null);
check('the cap trims the extra boundary day off the sparkline',
  JSON.stringify(shapeStats({ stats: [{ daily: 4 }, { daily: 2 }, { daily: 0 }] }, 'a', 'b', 2)?.daily) === '[4,2]');

console.log('\n— the status card never alarms without a signal —');

check('a 200 is operational', classifyHealth(200) === 'operational');
check('a 301 family is operational', classifyHealth(302) === 'operational');
check('a 404 is a problem', classifyHealth(404) === 'problem');
check('a 500 is a problem', classifyHealth(500) === 'problem');
check('no status at all is unknown', classifyHealth(null) === 'unknown');
check('ssl days floor at zero', sslDaysLeft(0, 86_400_000) === 0);
check('a cert expiring tomorrow shows 1 day', sslDaysLeft(86_400_000, 0) === 1);

console.log('\n— renewal reminders fire once per band, never a backlog —');

check('more than 30 days out is quiet', dueThreshold(45) === null);
check('day 30 lands in the 30-day band', dueThreshold(30) === 30);
check('day 29 still lands in the 30-day band (cron catch-up)', dueThreshold(29) === 30);
check('day 12 lands in the 15-day band', dueThreshold(12) === 15);
check('day 7 lands in the 7-day band', dueThreshold(7) === 7);
check('day 5 lands in the 7-day band, not several at once', dueThreshold(5) === 7);
check('the final day lands in the 1-day band', dueThreshold(1) === 1);

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exitCode = 1;
