import { formatWhatsappNumber, isReachable, toWhatsappNumber } from '@/lib/phone';
import {
  paymentDueWhatsapp,
  paymentReceivedWhatsapp,
  proposalReadyWhatsapp,
} from '@/lib/whatsappMessages';

/**
 * These decide who a WhatsApp message reaches. The property that matters is
 * that an ambiguous number produces nothing at all rather than a confident
 * wrong recipient — a client's project link sent to a stranger is worse than a
 * message never sent.
 *
 * The template-parameter tests exist because AiSensy fills placeholders
 * positionally. Nothing at runtime would catch a transposition, so the order
 * is pinned here instead.
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

console.log('\n— numbers people actually type —');

check('a plain ten-digit mobile gains the country code',
  toWhatsappNumber('9873674517') === '919873674517');
check('spaces and dashes are ignored',
  toWhatsappNumber('+91 98736-74517') === '919873674517');
check('the domestic trunk zero is dropped',
  toWhatsappNumber('09873674517') === '919873674517');
check('an already-complete number is kept',
  toWhatsappNumber('919873674517') === '919873674517');
check('a plus-prefixed number is trusted',
  toWhatsappNumber('+919873674517') === '919873674517');
check('a non-Indian number with a plus is kept',
  toWhatsappNumber('+14155552671') === '14155552671');

console.log('\n— anything ambiguous produces nothing —');

check('empty is nothing', toWhatsappNumber('') === null);
check('null is nothing', toWhatsappNumber(null) === null);
check('undefined is nothing', toWhatsappNumber(undefined) === null);
check('too short is nothing', toWhatsappNumber('98736') === null);
check('a landline without a country code is refused',
  toWhatsappNumber('01142345678') === null, toWhatsappNumber('01142345678'));
check('an Indian mobile cannot start with 5',
  toWhatsappNumber('5873674517') === null);
check('eleven digits with no leading zero is refused',
  toWhatsappNumber('19873674517') === null);
check('thirteen digits with no plus is refused',
  toWhatsappNumber('9198736745170') === null);
check('letters are nothing', toWhatsappNumber('call me') === null);
check('a plus with too few digits is refused', toWhatsappNumber('+9198') === null);

console.log('\n— reachability and display —');

check('a good number is reachable', isReachable('+91 98736 74517'));
check('a bad number is not', !isReachable('98'));
check('display groups it back',
  formatWhatsappNumber('919873674517') === '+91 98736 74517',
  formatWhatsappNumber('919873674517'));
check('an unusable number has no display form',
  formatWhatsappNumber('nope') === null);

console.log('\n— template parameters are positional, so pin the order —');

{
  const m = proposalReadyWhatsapp({
    name: 'Rajesh Kumar Sharma',
    phone: '9873674517',
    slug: '7d34593e-0000-4000-8000-000000000001',
    accessCode: '123456',
  });
  check('proposal ready sends three parameters', m.params.length === 3, m.params);
  check('  {{1}} is the first name only', m.params[0] === 'Rajesh');
  check('  {{2}} is the proposal link', m.params[1]?.includes('/proposals/') === true);
  check('  {{3}} is the access code', m.params[2] === '123456');
}

{
  const m = paymentDueWhatsapp({
    name: 'Rajesh',
    phone: '9873674517',
    slug: 'abc',
    milestoneLabel: 'Advance',
    payableInr: 7080,
  });
  check('payment due sends four parameters', m.params.length === 4, m.params);
  check('  {{2}} is the milestone', m.params[1] === 'Advance');
  check('  {{3}} is the GST-inclusive figure', m.params[2] === '₹7,080', m.params[2]);
  check('  {{4}} is the payment link', m.params[3]?.endsWith('/payment') === true);
}

{
  const m = paymentReceivedWhatsapp({
    name: 'Rajesh',
    phone: '9873674517',
    amountInr: 17700,
    invoiceNumber: 'DH/26-27/0001',
    slug: 'abc',
  });
  check('payment received sends three parameters', m.params.length === 3);
  check('  {{3}} is the invoice number', m.params[2] === 'DH/26-27/0001');

  const noInvoice = paymentReceivedWhatsapp({
    name: 'Rajesh',
    phone: '9873674517',
    amountInr: 17700,
    invoiceNumber: null,
    slug: '7d34593e-0000-4000-8000-000000000001',
  });
  check('  an uninvoiced payment falls back to the house reference format',
    noInvoice.params[2] === 'DH/7D34593E', noInvoice.params[2]);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
