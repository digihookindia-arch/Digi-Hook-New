import { toWhatsappNumber } from './phone';

/**
 * WhatsApp via AiSensy, over plain `fetch` — no SDK.
 *
 * Dormant until `AISENSY_API_KEY` is set, and dormant *per message* until that
 * message's campaign name is set too. Same rule as SMTP and Razorpay: with
 * nothing configured it logs what it would have sent and reports false, so the
 * dashboard can say so plainly. It never pretends a message went out.
 *
 * **AiSensy sends campaigns, not templates.** You do not hand it message text.
 * A template is written in AiSensy, approved by Meta, attached to an API
 * campaign, and the campaign is set live; this then names that campaign and
 * supplies the variables. So the campaign names live in the environment rather
 * than in code — only the studio knows what they called them, and a name that
 * does not exist fails at send time with no way for this file to know sooner.
 *
 * `templateParams` fills the template's `{{1}} {{2}} {{3}}` **positionally**.
 * There is no naming, no keys, nothing to catch a mistake: swap two and a
 * client gets an amount where their name should be. The builders in
 * `lib/whatsappMessages.ts` are the only place that order is written down, and
 * each one documents the template it matches.
 *
 * Every send here is best-effort and happens after the write it accompanies.
 * A WhatsApp outage must never fail a payment, an acceptance or a proposal.
 */

const ENDPOINT = 'https://backend.aisensy.com/campaign/t1/api/v2';

const API_KEY = process.env.AISENSY_API_KEY ?? '';

/** Which campaign carries which message. Unset = that message does not send. */
export const CAMPAIGNS = {
  proposalReady: process.env.AISENSY_CAMPAIGN_PROPOSAL_READY ?? '',
  proposalAccepted: process.env.AISENSY_CAMPAIGN_PROPOSAL_ACCEPTED ?? '',
  paymentDue: process.env.AISENSY_CAMPAIGN_PAYMENT_DUE ?? '',
  paymentReceived: process.env.AISENSY_CAMPAIGN_PAYMENT_RECEIVED ?? '',
} as const;

export type CampaignKey = keyof typeof CAMPAIGNS;

export function isWhatsappConfigured(): boolean {
  return Boolean(API_KEY);
}

/** True when this particular message can actually be sent. */
export function isCampaignLive(key: CampaignKey): boolean {
  return Boolean(API_KEY && CAMPAIGNS[key]);
}

/** Which campaigns are missing a name, for the dashboard to report. */
export function dormantCampaigns(): CampaignKey[] {
  return (Object.keys(CAMPAIGNS) as CampaignKey[]).filter((k) => !CAMPAIGNS[k]);
}

export type WhatsappMessage = {
  campaign: CampaignKey;
  /** As stored on the proposal — normalised here, not by the caller. */
  phone: string | null | undefined;
  /** The client's name, which AiSensy records against the contact. */
  name: string;
  /** Fills {{1}}, {{2}}, … in that order. Must match the approved template. */
  params: string[];
};

export type SendResult =
  | { sent: true }
  | { sent: false; reason: 'not-configured' | 'no-campaign' | 'bad-number' | 'failed' };

/**
 * Sends one templated message. Never throws — the caller is always in the
 * middle of something more important than a notification.
 */
export async function sendWhatsapp(message: WhatsappMessage): Promise<SendResult> {
  const campaignName = CAMPAIGNS[message.campaign];

  if (!API_KEY) {
    console.info(
      `[whatsapp] NOT SENT (AISENSY_API_KEY not set) campaign=${message.campaign} params=${JSON.stringify(message.params)}`
    );
    return { sent: false, reason: 'not-configured' };
  }
  if (!campaignName) {
    console.info(
      `[whatsapp] NOT SENT (no campaign name for ${message.campaign}) — set AISENSY_CAMPAIGN_${message.campaign.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`
    );
    return { sent: false, reason: 'no-campaign' };
  }

  // A number we cannot resolve is skipped, never guessed at: sending a
  // client's project details to a stranger is worse than sending nothing.
  const destination = toWhatsappNumber(message.phone);
  if (!destination) {
    console.info(`[whatsapp] skipped ${message.campaign}: no usable phone number`);
    return { sent: false, reason: 'bad-number' };
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: API_KEY,
        campaignName,
        destination: `+${destination}`,
        userName: message.name.slice(0, 100),
        source: 'digihook.in',
        templateParams: message.params,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      // The body can echo the API key back in some error shapes, so it goes to
      // the server log and never near a client-facing surface.
      const detail = await response.text().catch(() => '');
      console.error(
        `[whatsapp] ${message.campaign} failed`,
        response.status,
        detail.slice(0, 300)
      );
      return { sent: false, reason: 'failed' };
    }
    return { sent: true };
  } catch (e) {
    console.error(`[whatsapp] ${message.campaign} threw`, e);
    return { sent: false, reason: 'failed' };
  }
}
