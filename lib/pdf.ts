/**
 * A minimal PDF writer — enough for a one-page tax invoice, and nothing more.
 *
 * No dependency, for the same reason `lib/razorpay.ts` has no SDK and
 * `lib/searchConsole.ts` signs its own JWT: the surface actually needed here is
 * text, rules and filled rectangles on a single A4 page, and a PDF library
 * brings a font pipeline and a dependency tree to do it.
 *
 * Two constraints shape every decision below, and both are worth knowing
 * before changing anything:
 *
 *  1. **Only the base-14 fonts are used** (Helvetica, Helvetica-Bold), which
 *     every reader has built in, so nothing has to be embedded. The price is
 *     WinAnsi encoding: it has no rupee sign. Money is therefore printed as
 *     plain digits with the currency named in the column header — "Amount
 *     (INR)" — which is standard on an Indian invoice anyway. Writing a bare
 *     `₹` here produces a wrong glyph, not an error, so it is stripped.
 *  2. **Right-alignment needs glyph widths**, and rather than carry a full AFM
 *     table this only right-aligns numeric strings, whose widths in Helvetica
 *     are a handful of known values (every digit is 556/1000 in both weights).
 *     `textRight` throws on anything else, so a future caller finds out at once
 *     instead of shipping a misaligned column.
 */

const A4 = { width: 595.28, height: 841.89 };

/** Helvetica and Helvetica-Bold agree on all of these. Units are 1/1000 em. */
const NUMERIC_WIDTHS: Record<string, number> = {
  '0': 556, '1': 556, '2': 556, '3': 556, '4': 556,
  '5': 556, '6': 556, '7': 556, '8': 556, '9': 556,
  ' ': 278, ',': 278, '.': 278, '-': 333, '/': 278,
  '(': 333, ')': 333, '%': 889,
};

export type Font = 'regular' | 'bold';

type Op = string;

/**
 * The handful of non-ASCII characters this project's copy actually produces,
 * mapped to something WinAnsi can show. Written as escapes rather than as the
 * characters themselves: invisible or look-alike characters in source are
 * exactly the trap CLAUDE.md warns about for the CSS comments.
 */
const NON_ASCII: Record<string, string> = {
  '\u20b9': 'INR ', // rupee sign - not in WinAnsi, hence the whole convention
  '\u2014': '-', // em dash
  '\u2013': '-', // en dash
  '\u2018': "'",
  '\u2019': "'",
  '\u201c': '"',
  '\u201d': '"',
  '\u00b7': '-', // middle dot
  '\u00a0': ' ', // non-breaking space
};

/**
 * Escapes a string for a PDF literal and drops anything WinAnsi cannot show.
 * Silently losing a character is bad, but printing a *wrong* glyph on an
 * invoice is worse, and the callers here only ever pass text they control.
 */
function literal(text: string): string {
  let out = '';
  for (const ch of text) {
    out += ch.charCodeAt(0) < 0x80 ? ch : (NON_ASCII[ch] ?? '');
  }
  return out
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export class Pdf {
  private ops: Op[] = [];
  readonly width = A4.width;
  readonly height = A4.height;

  /** Text at (x, y) measured from the top-left, which is how people think. */
  text(
    x: number,
    y: number,
    value: string,
    options: { font?: Font; size?: number; grey?: number } = {}
  ): void {
    const { font = 'regular', size = 10, grey = 0 } = options;
    this.ops.push(
      `BT ${grey} g /F${font === 'bold' ? '2' : '1'} ${size} Tf ` +
        `1 0 0 1 ${x.toFixed(2)} ${(this.height - y).toFixed(2)} Tm ` +
        `(${literal(value)}) Tj ET`
    );
  }

  /**
   * Numeric text whose right edge sits at `x`. Refuses anything it cannot
   * measure — see the note at the top of the file.
   */
  textRight(
    x: number,
    y: number,
    value: string,
    options: { font?: Font; size?: number; grey?: number } = {}
  ): void {
    const size = options.size ?? 10;
    let width = 0;
    for (const ch of value) {
      const w = NUMERIC_WIDTHS[ch];
      if (w === undefined) {
        throw new Error(
          `textRight can only measure numeric text; got ${JSON.stringify(value)}`
        );
      }
      width += w;
    }
    this.text(x - (width * size) / 1000, y, value, options);
  }

  /** A horizontal rule. The only line this document needs. */
  rule(x: number, y: number, length: number, options: { grey?: number; weight?: number } = {}): void {
    const { grey = 0.75, weight = 0.5 } = options;
    const top = this.height - y;
    this.ops.push(
      `${grey} G ${weight} w ${x.toFixed(2)} ${top.toFixed(2)} m ` +
        `${(x + length).toFixed(2)} ${top.toFixed(2)} l S`
    );
  }

  /** A filled band, for the one dark strip at the head of the document. */
  fill(
    x: number,
    y: number,
    width: number,
    height: number,
    grey: number
  ): void {
    const top = this.height - y - height;
    this.ops.push(
      `${grey} g ${x.toFixed(2)} ${top.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`
    );
  }

  /**
   * Lays out a paragraph, breaking on width. Measured crudely at 0.5 em per
   * character, which under-fills a line rather than over-running it — the only
   * failure mode that matters when the alternative is text off the page edge.
   */
  paragraph(
    x: number,
    y: number,
    value: string,
    options: { width: number; size?: number; leading?: number; grey?: number; font?: Font }
  ): number {
    const size = options.size ?? 9;
    const leading = options.leading ?? size * 1.45;
    const perLine = Math.max(8, Math.floor(options.width / (size * 0.5)));

    const words = value.split(/\s+/).filter(Boolean);
    let line = '';
    let cursor = y;

    const flush = () => {
      if (!line) return;
      this.text(x, cursor, line, { size, grey: options.grey, font: options.font });
      cursor += leading;
      line = '';
    };

    for (const word of words) {
      if (line.length + word.length + 1 > perLine) flush();
      line = line ? `${line} ${word}` : word;
    }
    flush();
    return cursor;
  }

  /** Serialises everything written so far into a complete one-page PDF. */
  toBuffer(): Buffer {
    const content = this.ops.join('\n');
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] ` +
        '/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
      `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];
    objects.forEach((body, i) => {
      offsets.push(Buffer.byteLength(pdf, 'latin1'));
      pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });

    const xrefAt = Buffer.byteLength(pdf, 'latin1');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    }
    pdf +=
      `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
      `startxref\n${xrefAt}\n%%EOF\n`;

    // latin1 throughout: `literal` has already reduced every string to
    // WinAnsi-safe bytes, and the byte offsets in the xref table must match
    // what is actually written.
    return Buffer.from(pdf, 'latin1');
  }
}
