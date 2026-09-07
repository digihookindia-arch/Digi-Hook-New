import {
  followUp,
  followUps,
  mailtoLink,
  whatsappLink,
  TEMPLATE_KEYS,
} from '@/lib/leadTemplates';

/**
 * These messages are sent to strangers who filled in an ad form, by a person
 * pressing send on a phone. What matters is that the text is always something
 * a person could have written: no empty variable, no "your undefined website",
 * no figure the studio has not agreed to.
 */

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

console.log('\n— how a message opens —');
{
  const t = followUp('busy', { name: 'Ketan Shah', wants: 'Business website' });
  check('it opens with the first name only', t.whatsapp.startsWith('Hi Ketan,'), t.whatsapp);
  check('the email opens the same way', t.emailBody.startsWith('Hi Ketan,'), t.emailBody.slice(0, 40));
  check('a one-word name still works',
    followUp('busy', { name: 'Meera' }).whatsapp.startsWith('Hi Meera,'));
  check('and a blank name does not produce "Hi ,"',
    followUp('busy', { name: '   ' }).whatsapp.startsWith('Hi there,'),
    followUp('busy', { name: '   ' }).whatsapp);
}

console.log('\n— naming what they asked for —');
{
  // The form's answers are already humanised, so "E commerce website" arrives
  // with the word website in it and must not gain a second one.
  const e = followUp('need-detail', { name: 'A', wants: 'E commerce website' });
  check('an answer containing "website" is not doubled',
    e.whatsapp.includes('your e commerce website') && !e.whatsapp.includes('website website'),
    e.whatsapp);

  const p = followUp('need-detail', { name: 'A', wants: 'Portfolio' });
  check('an answer that does not is completed',
    p.whatsapp.includes('your portfolio website'), p.whatsapp);

  const none = followUp('need-detail', { name: 'A' });
  check('no answer falls back to "your website"',
    none.whatsapp.includes('your website'), none.whatsapp);
}

console.log('\n— the proposal nudge —');
{
  const withUrl = followUp('proposal-sent', {
    name: 'Ketan',
    proposalUrl: 'https://digihook.in/proposals/acme',
  });
  check('the link is in the WhatsApp message',
    withUrl.whatsapp.includes('https://digihook.in/proposals/acme'), withUrl.whatsapp);
  check('and in the email', withUrl.emailBody.includes('https://digihook.in/proposals/acme'));

  const without = followUp('proposal-sent', { name: 'Ketan' });
  check('with no link it still reads as a sentence',
    !without.whatsapp.includes('http') && without.whatsapp.includes('did the proposal'),
    without.whatsapp);
  check('and the email drops the link line entirely',
    !without.emailBody.includes('read it here'), without.emailBody);
}

console.log('\n— every template, for a lead with nothing filled in —');
{
  const all = followUps({ name: '' });
  check('there is one per key', all.length === TEMPLATE_KEYS.length, all.length);

  for (const t of all) {
    // The failure this guards against is a template literal whose variable
    // was absent — which reads as a robot, on a channel where that is fatal.
    const text = `${t.whatsapp} ${t.emailSubject} ${t.emailBody}`;
    check(`  ${t.key}: no empty variable leaks through`,
      !/undefined|null|NaN|\{\{/.test(text), t.key);
    check(`  ${t.key}: it says who is writing`, text.includes('Digi Hook'), t.key);
    check(`  ${t.key}: it carries a subject and a body`,
      t.emailSubject.length > 10 && t.emailBody.length > 60, t.key);
    // The studio has no agreed follow-up price or turnaround, and a template
    // is the easiest place for one to appear and never be noticed.
    check(`  ${t.key}: it quotes no price and promises no date`,
      !/₹|\bRs\.?\b|\d+\s*(days?|weeks?)\b/i.test(text), t.key);
    check(`  ${t.key}: it is short enough to read on a phone`,
      t.whatsapp.length <= 400, t.whatsapp.length);
  }
}

console.log('\n— the WhatsApp link —');
{
  const link = whatsappLink('9873674517', 'Hi Ketan, how are you?');
  check('a bare Indian mobile gets its country code',
    link?.startsWith('https://wa.me/919873674517?text=') === true, link);
  check('the message is percent-encoded, not left raw',
    link?.includes('Hi%20Ketan') === true && link?.includes(' ') === false, link);

  check('a number that cannot be resolved gives no link',
    whatsappLink('12345', 'hi') === null);
  check('and neither does an absent one', whatsappLink(null, 'hi') === null);

  // & and # both terminate a URL if they survive unencoded.
  const tricky = whatsappLink('9873674517', 'Rates & terms #1');
  check('ampersands and hashes are encoded',
    tricky?.includes('%26') === true && tricky?.includes('%231') === true, tricky);
}

console.log('\n— the mailto —');
{
  const link = mailtoLink('ketan@example.com', 'Hello there', 'Line one\nLine two');
  check('the address is kept', link?.startsWith('mailto:ketan%40example.com?') === true, link);
  check('the subject is carried', link?.includes('subject=Hello%20there') === true, link);
  check('newlines in the body survive as encoded breaks',
    link?.includes('%0A') === true, link);

  check('no address gives no link', mailtoLink('', 's', 'b') === null);
  check('nor does something that is not one', mailtoLink('not-an-address', 's', 'b') === null);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
