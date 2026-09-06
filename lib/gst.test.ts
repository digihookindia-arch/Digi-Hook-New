import {
  amountInWords,
  cleanGstin,
  cleanStateCode,
  financialYear,
  gstinState,
  invoiceBlocks,
  invoiceNumber,
  stateName,
  taxSplit,
} from '@/lib/gst';

/**
 * These reach a document a client's accountant files. The properties that
 * matter: the tax halves add up to the whole tax, the intra/inter decision is
 * made on state codes and nothing else, and an invoice that cannot be issued
 * correctly is refused rather than guessed at.
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

const UP = '09';

console.log('\ntaxSplit');
{
  const intra = taxSplit({
    taxableValue: 6000,
    gstPercent: 18,
    supplierStateCode: UP,
    placeOfSupplyCode: UP,
  });
  check('same state is CGST + SGST', intra.kind === 'intra');
  check('each half is half the rate', intra.kind === 'intra' && intra.cgstPercent === 9);
  check('halves add to the whole tax', intra.cgst + intra.sgst === 1080, intra);
  check('no IGST on an intra-state supply', intra.igst === 0);

  const inter = taxSplit({
    taxableValue: 6000,
    gstPercent: 18,
    supplierStateCode: UP,
    placeOfSupplyCode: '27',
  });
  check('a different state is IGST', inter.kind === 'inter');
  check('IGST carries the whole tax', inter.igst === 1080, inter);
  check('no CGST/SGST on an inter-state supply', inter.cgst === 0 && inter.sgst === 0);

  // 8333 * 18% = 1499.94 -> 1500, which does not halve evenly.
  const odd = taxSplit({
    taxableValue: 8333,
    gstPercent: 18,
    supplierStateCode: UP,
    placeOfSupplyCode: UP,
  });
  check('an odd tax still splits exactly', odd.cgst + odd.sgst === odd.total, odd);
  check('the odd rupee lands on SGST', odd.sgst >= odd.cgst, odd);
}

console.log('\nstate codes and GSTIN');
{
  check('a real code passes', cleanStateCode('09') === '09');
  check('an unassigned code is refused', cleanStateCode('25') === null);
  check('junk is refused', cleanStateCode('lots') === null);
  check('null is refused', cleanStateCode(null) === null);
  check('Uttar Pradesh resolves', stateName('09') === 'Uttar Pradesh');
  check('an unknown code has no name', stateName('99') === null);

  check(
    'a well-formed GSTIN passes',
    cleanGstin('09ABCDE1234F1Z5') === '09ABCDE1234F1Z5'
  );
  check('spaces and case are tolerated', cleanGstin(' 09abcde1234f1z5 ') === '09ABCDE1234F1Z5');
  check('a short GSTIN is refused', cleanGstin('09ABCDE1234F1Z') === null);
  check('a GSTIN with no state code is refused', cleanGstin('XXABCDE1234F1Z5') === null);
  check('the state comes out of the GSTIN', gstinState('27ABCDE1234F1Z5') === '27');
  check('a bad GSTIN yields no state', gstinState('nonsense') === null);
}

console.log('\ninvoice numbering');
{
  check('April starts the new year', financialYear(new Date('2026-04-01T00:00:00Z')) === '26-27');
  check('March is still the old year', financialYear(new Date('2026-03-31T00:00:00Z')) === '25-26');
  check('September sits mid-year', financialYear(new Date('2026-09-06T00:00:00Z')) === '26-27');
  check('the number is padded', invoiceNumber('26-27', 7) === 'DH/26-27/0007');
  check('a big sequence is not truncated', invoiceNumber('26-27', 12345) === 'DH/26-27/12345');
}

console.log('\namountInWords');
{
  check('zero', amountInWords(0) === 'Zero rupees only');
  check('a simple figure', amountInWords(7080) === 'Seven thousand and eighty rupees only', amountInWords(7080));
  check('lakh, not million', amountInWords(185000).startsWith('One lakh'), amountInWords(185000));
  check('crore', amountInWords(12000000).startsWith('One crore'), amountInWords(12000000));
  check('rounds to whole rupees', amountInWords(99.6) === 'One hundred rupees only', amountInWords(99.6));
}

console.log('\ninvoiceBlocks');
{
  const ok = invoiceBlocks({
    supplierGstin: '09ABCDE1234F1Z5',
    placeOfSupplyCode: '09',
    clientAddress: 'A211, Golden I, Noida',
  });
  check('a complete set has no blocks', ok.length === 0, ok);

  const none = invoiceBlocks({
    supplierGstin: null,
    placeOfSupplyCode: null,
    clientAddress: '',
  });
  check('everything missing is reported', none.length === 3, none);
  check('the supplier GSTIN is named first', none[0] === 'supplier-gstin', none);

  const noState = invoiceBlocks({
    supplierGstin: '09ABCDE1234F1Z5',
    placeOfSupplyCode: null,
    clientAddress: 'A211, Golden I, Noida',
  });
  check('a missing state blocks on its own', noState.length === 1 && noState[0] === 'place-of-supply', noState);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
