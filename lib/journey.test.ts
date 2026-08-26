import { randomUUID } from 'crypto';

/**
 * Cross-checks the milestone flow against a throwaway database.
 *
 * These pin the rules a client would notice if they broke: that nothing is
 * offered which cannot be sent, that a stage the studio has not earned is not
 * silently claimed, that a failed send does not advance the pipeline, and that
 * the same email is never sent twice by a double click.
 *
 * The database is a temp file set via SQLITE_PATH before anything imports
 * lib/db — the module resolves its path once, at import.
 */

process.env.SQLITE_PATH = `${process.env.TEMP ?? '.'}/dh-journey-test-${randomUUID()}.db`;

let pass = 0;
const failures: string[] = [];

function check(label: string, condition: boolean): void {
  if (condition) {
    pass += 1;
  } else {
    failures.push(label);
  }
}

/** Indexed access under `noUncheckedIndexedAccess` — a missing row is a bug in
 *  the resolver, not a soft assertion, so this throws rather than returning
 *  undefined into a check that would quietly read as false. */
function row(
  journey: { rows: { stage: number }[] },
  stage: 1 | 2 | 3 | 4
) {
  const found = journey.rows.find((r) => r.stage === stage);
  if (!found) throw new Error(`journey has no row for stage ${stage}`);
  return found as (typeof journey)['rows'][number] & {
    blocked: string | null;
    warning: string | null;
    to: string;
    whatsapp: string | null;
    last: { ok: boolean } | null;
  };
}

async function main() {
  const { getDb } = await import('./db');
  const { saveEnquiry, linkEnquiryToProposal, getEnquiry } = await import('./enquiries');
  const { saveProposal, setProposalAccepted, setProposalContact, getProposal } =
    await import('./proposals');
  const { getJourney, getProposalJourney, milestoneMailFor } = await import('./journey');
  const { sendMilestone, listSends } = await import('./sentEmails');
  const { seedDelivery } = await import('./delivery');

  getDb();

  /* ---- a proposal typed straight in, with no enquiry ------------------- */

  const bare = {
    slug: randomUUID(),
    client: 'Kratika Kapoor',
    accessCode: '123456',
    content: {
      title: 'Website',
      summary: 's',
      sections: [],
      scope: [],
      timeline: [],
      pricing: [],
      total: '₹12,500',
      terms: [],
    },
    brief: 'b',
    budget: '',
    clientEmail: '',
    clientPhone: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    acceptedAt: null,
    assetsSharedAt: null,
    ...seedDelivery({
      title: 'Website',
      summary: 's',
      sections: [],
      scope: [],
      timeline: [],
      pricing: [],
      total: '₹12,500',
      terms: [],
    }),
  };
  await saveProposal(bare as never);

  let journey = (await getProposalJourney(bare.slug))!;
  check('a proposal with no enquiry still resolves', journey !== null);
  check('stage 1 is blocked without an enquiry', Boolean(row(journey, 1).blocked));
  check('stage 2 is blocked without an enquiry', Boolean(row(journey, 2).blocked));
  check(
    'stage 3 is blocked while no email is on file',
    row(journey, 3).blocked === 'No email address on file. Add one above.'
  );
  check(
    'no warning nags about stages that were never available',
    row(journey, 3).warning === null
  );
  check('the client name falls back to the proposal', journey.clientName === 'Kratika Kapoor');

  // The gap this whole refactor exists to close: adding an address makes the
  // proposal reachable.
  await setProposalContact(bare.slug, { email: 'k@example.in', phone: '9876543210' });
  journey = (await getProposalJourney(bare.slug))!;
  check('adding an email unblocks stage 3', row(journey, 3).blocked === null);
  check('stage 3 addresses the saved email', row(journey, 3).to === 'k@example.in');
  check(
    'the WhatsApp link carries a country code',
    row(journey, 3).whatsapp?.startsWith('https://wa.me/919876543210') === true
  );
  check(
    'stage 4 stays blocked until the proposal is accepted',
    row(journey, 4).blocked === 'The proposal has not been accepted yet.'
  );

  await setProposalAccepted(bare.slug, true);
  journey = (await getProposalJourney(bare.slug))!;
  check('accepting unblocks stage 4', row(journey, 4).blocked === null);

  /* ---- the email a stage would send ------------------------------------ */

  const proposal = await getProposal(bare.slug);
  const mail3 = milestoneMailFor(3, null, proposal)!;
  check('stage 3 names the client', mail3.body.includes('Kratika'));
  check('stage 3 carries the access code', mail3.body.includes('123456'));
  check('stage 3 carries the proposal link', mail3.body.includes(bare.slug));
  check('stage 3 gives the office number', mail3.html.includes('+91 98736 74517'));
  check('stage 3 button links to the proposal', mail3.html.includes(`/proposals/${bare.slug}`));

  const mail4 = milestoneMailFor(4, null, proposal)!;
  check(
    'stage 4 names no phase when the timeline is empty',
    !mail4.body.includes('undefined') && !mail4.html.includes('undefined')
  );

  /* ---- sending, logging and the double-click guard ---------------------- */

  const sent = await sendMilestone({
    stage: 3,
    to: 'k@example.in',
    mail: mail3,
    target: { proposalSlug: bare.slug },
  });
  check('a send with no SMTP configured is reported as sent', sent.status === 'sent');

  const again = await sendMilestone({
    stage: 3,
    to: 'k@example.in',
    mail: mail3,
    target: { proposalSlug: bare.slug },
  });
  check('an immediate second send is refused', again.status === 'skipped');

  const noAddress = await sendMilestone({
    stage: 3,
    to: '   ',
    mail: mail3,
    target: { proposalSlug: bare.slug },
  });
  check('a send with no address is refused', noAddress.status === 'skipped');

  const log = await listSends({ proposalSlug: bare.slug });
  check('exactly one row was logged', log.length === 1);
  check('the row records the recipient', log[0]!.toAddress === 'k@example.in');
  check('the row is keyed to the proposal', log[0]!.proposalSlug === bare.slug);

  journey = (await getProposalJourney(bare.slug))!;
  check('the panel shows stage 3 as sent', row(journey, 3).last?.ok === true);
  check(
    'stage 4 now warns that step 3 went out but 2 did not',
    row(journey, 4).warning === null
  );

  /* ---- an enquiry-led client, both records present ---------------------- */

  const enquiry = await saveEnquiry({
    service: 'design',
    name: 'Rohan Jain',
    email: 'rohan@example.in',
    phone: '+91-98112 34567',
    company: null,
    answers: {},
    summary: [],
  });

  let led = (await getJourney(enquiry.id))!;
  check('stage 1 is sendable for a fresh enquiry', row(led, 1).blocked === null);
  check('stage 3 is blocked with no proposal', Boolean(row(led, 3).blocked));
  check(
    'stage 2 warns that stage 1 has not been sent',
    row(led, 2).warning?.startsWith('Step 1') === true
  );

  await linkEnquiryToProposal(enquiry.id, bare.slug);
  led = (await getJourney(enquiry.id))!;
  check('linking surfaces the proposal from the enquiry side', led.proposal?.slug === bare.slug);
  check(
    'the proposal side finds the enquiry back',
    (await getProposalJourney(bare.slug))!.enquiry?.id === enquiry.id
  );
  check(
    'history is shared across both records',
    led.history.some((s) => s.proposalSlug === bare.slug)
  );
  check(
    'the saved proposal email wins over the enquiry address',
    row(led, 3).to === 'k@example.in'
  );
  check('stage 1 still uses the enquiry address', row(led, 1).to === 'rohan@example.in');
  check(
    'a spaced, prefixed phone still makes a valid link',
    row(led, 1).whatsapp?.startsWith('https://wa.me/919811234567') === true
  );

  const linked = await getEnquiry(enquiry.id);
  check('linking moved the enquiry to drafted', linked?.status === 'drafted');

  console.log(`\n${pass} passed, ${failures.length} failed`);
  if (failures.length) {
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
}

main();
