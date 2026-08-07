import { site, SITE_URL } from './site';

/**
 * The shared HTML shell for client-facing milestone emails (enquiry received,
 * scheduling call, proposal created, proposal accepted). One table-based
 * layout, styled to match the site's own design tokens (accent #ec3013, ink
 * #201e1d, flat 2px rules) — built from the client-supplied design in
 * "Enquiry confirmation email.zip". Each milestone calls this with its own
 * copy and highlighted step; nothing about the shell itself changes.
 *
 * Table layout + inline styles + MSO conditionals are deliberate, not legacy
 * habit — this is what actually renders consistently across Outlook, Gmail
 * and mobile mail clients. Do not "modernise" to flexbox/grid or a <style>
 * block full of classes; most clients strip or mis-render both.
 */

const STEP_LABELS = [
  'Enquiry received',
  'Scheduling call',
  'Proposal created',
  'Proposal accepted',
] as const;

export type MilestoneStep = 1 | 2 | 3 | 4;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type MilestoneEmailInput = {
  /** Hidden preview text shown next to the subject line in inbox lists. */
  preheader: string;
  /** Small uppercase label on the accent poster block, e.g. "Enquiry received". */
  kicker: string;
  /** Big bold statement on the poster block. Caller-authored copy — may contain <br>. */
  headline: string;
  /** Heading directly under the poster block. */
  leadHeading: string;
  /** Supporting paragraph under leadHeading. Plain text — will be escaped. */
  leadBody: string;
  detailLeftLabel: string;
  detailLeftValue: string;
  detailRightLabel: string;
  detailRightValue: string;
  /** Which of the 4 milestones this email represents — highlights that step in the track. */
  step: MilestoneStep;
  ctaText: string;
  ctaHref: string;
  /** Rendered under the CTA button. Caller-authored HTML (like `headline`) —
   *  not escaped, so it can carry an inline mailto/tel link. Never pass
   *  unescaped user input here. */
  secondaryLine: string;
};

export function milestoneEmailHtml(input: MilestoneEmailInput): string {
  const leadBody = escapeHtml(input.leadBody);

  const steps = STEP_LABELS.map((label, i) => {
    const n = i + 1;
    const active = n === input.step;
    const barColor = active ? '#ec3013' : '#c9c6c4';
    const numColor = active ? '#ec3013' : '#b3afac';
    const textColor = active ? '#201e1d' : '#6b6764';
    const weight = active ? 'bold' : 'normal';
    const [line1, line2] = label.split(' ');
    return `
        <td class="step" width="25%" valign="top" style="width:25%;padding:0 10px 0 0;font-family:Arial,Helvetica,sans-serif;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
            <tr><td height="6" style="height:6px;line-height:6px;font-size:0;background-color:${barColor};">&nbsp;</td></tr>
            <tr><td style="padding-top:12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:14px;mso-line-height-rule:exactly;letter-spacing:1.5px;color:${numColor};font-weight:bold;">0${n}</td></tr>
            <tr><td style="padding-top:8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:19px;mso-line-height-rule:exactly;color:${textColor};font-weight:${weight};">${line1}<br>${line2}</td></tr>
          </table>
        </td>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(input.kicker)}</title>
<!--[if mso]>
<style>body,table,td,a{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
<style>
  @media only screen and (max-width:620px){
    .px{padding-left:24px !important;padding-right:24px !important;}
    .h1{font-size:32px !important;line-height:34px !important;}
    .poster{font-size:26px !important;line-height:30px !important;}
    .stack{display:block !important;width:100% !important;border-right:0 !important;border-bottom:2px solid #201e1d !important;}
    .stack-last{border-bottom:0 !important;}
    .step{display:block !important;width:100% !important;padding:0 0 16px 0 !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#dedcdb;">
<span style="display:none;font-size:1px;color:#dedcdb;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(input.preheader)}</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#dedcdb;">
<tr>
<td align="center" style="padding:36px 12px;">

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#f3f2f2;border:2px solid #201e1d;">

  <!-- masthead -->
  <tr>
    <td class="px" style="padding:0 40px;border-bottom:2px solid #201e1d;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td valign="middle" style="padding:18px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:18px;mso-line-height-rule:exactly;letter-spacing:2px;text-transform:uppercase;color:#201e1d;font-weight:bold;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="14" style="width:14px;height:14px;line-height:14px;font-size:0;background-color:#ec3013;">&nbsp;</td>
            <td style="padding-left:10px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:18px;letter-spacing:2px;text-transform:uppercase;color:#201e1d;font-weight:bold;">Digi Hook</td>
          </tr></table>
        </td>
        <td valign="middle" align="right" style="padding:18px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;mso-line-height-rule:exactly;letter-spacing:1.5px;text-transform:uppercase;color:#6b6764;">
          ${escapeHtml(input.kicker)}
        </td>
      </tr>
      </table>
    </td>
  </tr>

  <!-- accent poster statement -->
  <tr>
    <td class="px" bgcolor="#ec3013" style="background-color:#ec3013;padding:46px 40px 44px 40px;border-bottom:2px solid #201e1d;">
      <p style="margin:0 0 22px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:14px;mso-line-height-rule:exactly;letter-spacing:2.5px;text-transform:uppercase;color:#ffffff;font-weight:bold;">${escapeHtml(input.kicker)}</p>
      <p class="poster" style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:40px;line-height:44px;mso-line-height-rule:exactly;letter-spacing:-1.2px;color:#ffffff;font-weight:bold;">
        ${input.headline}
      </p>
    </td>
  </tr>

  <!-- lede -->
  <tr>
    <td class="px" style="padding:36px 40px 34px 40px;border-bottom:2px solid #201e1d;">
      <h1 class="h1" style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:32px;mso-line-height-rule:exactly;letter-spacing:-0.5px;color:#201e1d;font-weight:bold;">
        ${escapeHtml(input.leadHeading)}
      </h1>
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:27px;mso-line-height-rule:exactly;color:#3d3a38;">
        ${leadBody}
      </p>
    </td>
  </tr>

  <!-- detail grid -->
  <tr>
    <td style="padding:0;border-bottom:2px solid #201e1d;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
      <tr>
        <td class="stack" width="50%" valign="top" style="width:50%;padding:24px 40px;border-right:2px solid #201e1d;font-family:Arial,Helvetica,sans-serif;">
          <p style="margin:0 0 8px 0;font-size:10px;line-height:14px;mso-line-height-rule:exactly;letter-spacing:1.8px;text-transform:uppercase;color:#6b6764;font-weight:bold;">${escapeHtml(input.detailLeftLabel)}</p>
          <p style="margin:0;font-size:24px;line-height:28px;mso-line-height-rule:exactly;letter-spacing:-0.4px;color:#201e1d;font-weight:bold;">${escapeHtml(input.detailLeftValue)}</p>
        </td>
        <td class="stack stack-last" width="50%" valign="top" style="width:50%;padding:24px 40px;font-family:Arial,Helvetica,sans-serif;">
          <p style="margin:0 0 8px 0;font-size:10px;line-height:14px;mso-line-height-rule:exactly;letter-spacing:1.8px;text-transform:uppercase;color:#6b6764;font-weight:bold;">${escapeHtml(input.detailRightLabel)}</p>
          <p style="margin:0;font-size:24px;line-height:28px;mso-line-height-rule:exactly;letter-spacing:-0.4px;color:#201e1d;font-weight:bold;">${escapeHtml(input.detailRightValue)}</p>
        </td>
      </tr>
      </table>
    </td>
  </tr>

  <!-- milestone track -->
  <tr>
    <td class="px" style="padding:34px 40px 36px 40px;border-bottom:2px solid #201e1d;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
      <tr>
        <td valign="middle" style="padding-bottom:22px;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:14px;mso-line-height-rule:exactly;letter-spacing:1.8px;text-transform:uppercase;color:#6b6764;font-weight:bold;">How this moves forward</td>
        <td valign="middle" align="right" style="padding-bottom:22px;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:14px;mso-line-height-rule:exactly;letter-spacing:1.8px;text-transform:uppercase;color:#ec3013;font-weight:bold;">Step ${input.step} of 4</td>
      </tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
      <tr>${steps}
      </tr>
      </table>
    </td>
  </tr>

  <!-- action -->
  <tr>
    <td class="px" style="padding:32px 40px 34px 40px;border-bottom:2px solid #201e1d;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
        <tr>
          <td bgcolor="#ec3013" style="background-color:#ec3013;border-radius:0;padding:0;">
            <a href="${input.ctaHref}" style="display:block;padding:17px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:18px;mso-line-height-rule:exactly;letter-spacing:1.2px;text-transform:uppercase;font-weight:bold;color:#ffffff;text-decoration:none;text-align:left;">${escapeHtml(input.ctaText)}&nbsp;&nbsp;&rarr;</a>
          </td>
        </tr>
      </table>
      <p style="margin:18px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;mso-line-height-rule:exactly;color:#6b6764;">
        ${input.secondaryLine}
      </p>
    </td>
  </tr>

  <!-- footer -->
  <tr>
    <td class="px" bgcolor="#201e1d" style="background-color:#201e1d;padding:28px 40px 30px 40px;font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0 0 6px 0;font-size:12px;line-height:20px;mso-line-height-rule:exactly;letter-spacing:1.8px;text-transform:uppercase;color:#f3f2f2;font-weight:bold;">Digi Hook</p>
      <p style="margin:0 0 14px 0;font-size:12px;line-height:20px;mso-line-height-rule:exactly;color:#9d9896;">${escapeHtml(site.addressLine)}</p>
      <p style="margin:0;font-size:12px;line-height:20px;mso-line-height-rule:exactly;color:#9d9896;">
        This message confirms an update on a project enquiry with Digi Hook. No action is needed if this wasn't you — write to
        <a href="mailto:${site.email}" style="color:#f3f2f2;text-decoration:underline;">${site.email}</a>.
      </p>
    </td>
  </tr>

</table>

</td>
</tr>
</table>
</body>
</html>`;
}

/** Short, human-readable reference derived from a record id — for display only, not stored. */
export function shortReference(id: string): string {
  return 'DH-' + id.replace(/-/g, '').slice(0, 6).toUpperCase();
}

export { SITE_URL };
