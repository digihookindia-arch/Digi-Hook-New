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
} from '@/lib/auth';
import { supportState } from '@/lib/support';
import {
  parseKind,
  isTicketStatus,
  cleanSubject,
  cleanBody,
  TICKET_SUBJECT_MAX,
  TICKET_BODY_MAX,
} from '@/lib/tickets';
import { balanceInr, type PortalProject } from '@/lib/portalProjects';

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

console.log('\n— the payment summary never shows a negative balance —');

const project = (totalInr: number | null, paidInr: number): PortalProject => ({
  id: 'p', clientId: 'c', businessName: 'B', liveAt: null, supportDays: 180,
  totalInr, paidInr, createdAt: '', updatedAt: '',
});
check('no total means no balance', balanceInr(project(null, 500)) === null);
check('balance is total minus paid', balanceInr(project(100000, 20000)) === 80000);
check('overpayment clamps to zero', balanceInr(project(100000, 120000)) === 0);

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exitCode = 1;
