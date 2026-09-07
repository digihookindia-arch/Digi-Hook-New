'use client';

import { useState } from 'react';
import { Copy, Mail, MessageCircle, Check } from 'lucide-react';
import {
  followUps,
  mailtoLink,
  whatsappLink,
  type LeadContext,
} from '@/lib/leadTemplates';

/**
 * The follow-up templates for one lead, with the message shown before it is
 * sent.
 *
 * **The preview is the message.** The same builder produces what is on screen
 * and what the link carries, so there is no version the studio reads and a
 * different one the client receives — which is the failure worth engineering
 * against here, because nobody proof-reads a message they have already
 * approved once.
 *
 * Both buttons hand off to an app rather than sending anything: WhatsApp opens
 * the studio's own chat with the text typed, and the mail client opens a
 * draft. Nothing leaves until a person presses send there. See
 * `lib/leadTemplates.ts` for why this is not automated.
 */
export function FollowUpPicker({
  lead,
  phone,
  email,
}: {
  lead: LeadContext;
  phone: string;
  email: string;
}) {
  const templates = followUps(lead);
  const [key, setKey] = useState(templates[0]?.key ?? 'first-touch');
  const [copied, setCopied] = useState<'whatsapp' | 'email' | null>(null);

  const chosen = templates.find((t) => t.key === key) ?? templates[0];
  if (!chosen) return null;

  const wa = whatsappLink(phone, chosen.whatsapp);
  const mail = mailtoLink(email, chosen.emailSubject, chosen.emailBody);

  async function copy(what: 'whatsapp' | 'email', text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // A blocked clipboard is not worth an error state — the text is on
      // screen and selectable, which is the fallback anyway.
    }
  }

  return (
    <section className="mb-9">
      <h2 className="m-0 mb-1.5 font-heading text-[22px] font-bold leading-[1.2] tracking-[-0.025em]">
        Follow up
      </h2>
      <p className="m-0 mb-5 text-[14px] leading-[1.55] text-neutral-700">
        Opens WhatsApp or your mail client with the message ready. Nothing is sent
        from here — read it, change what needs changing, then send it yourself.
      </p>

      <div className="border-2 border-text">
        <div className="flex flex-wrap gap-0 border-b-2 border-text">
          {templates.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setKey(t.key)}
              aria-pressed={t.key === key}
              className={`flex-[1_1_180px] border-r border-neutral-300 px-4 py-3.5 text-left text-[13.5px] font-semibold leading-[1.35] transition-colors last:border-r-0 ${
                t.key === key
                  ? 'bg-text text-bg'
                  : 'bg-bg text-neutral-800 hover:bg-neutral-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          <p className="m-0 mb-5 text-[13.5px] leading-[1.5] text-neutral-700">
            {chosen.when}
          </p>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-6">
            <Channel
              icon={<MessageCircle size={15} aria-hidden="true" />}
              title="WhatsApp"
              body={chosen.whatsapp}
              href={wa}
              openLabel="Open in WhatsApp"
              blocked={
                phone.trim()
                  ? 'This number cannot be read as a WhatsApp number. Correct it on the lead first.'
                  : 'No phone number on this lead.'
              }
              copied={copied === 'whatsapp'}
              onCopy={() => copy('whatsapp', chosen.whatsapp)}
            />

            <Channel
              icon={<Mail size={15} aria-hidden="true" />}
              title="Email"
              subject={chosen.emailSubject}
              body={chosen.emailBody}
              href={mail}
              openLabel="Open in mail"
              blocked="No email address on this lead."
              copied={copied === 'email'}
              onCopy={() =>
                copy('email', `${chosen.emailSubject}\n\n${chosen.emailBody}`)
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Channel({
  icon,
  title,
  subject,
  body,
  href,
  openLabel,
  blocked,
  copied,
  onCopy,
}: {
  icon: React.ReactNode;
  title: string;
  subject?: string;
  body: string;
  href: string | null;
  openLabel: string;
  blocked: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase leading-none tracking-[0.12em] text-neutral-700">
        {icon}
        {title}
      </div>

      {subject ? (
        <div className="mb-2 border-b border-neutral-300 pb-2 text-[14px] font-semibold leading-[1.4] text-text">
          {subject}
        </div>
      ) : null}

      <div className="mb-4 flex-1 whitespace-pre-wrap bg-neutral-100 p-4 text-[14px] leading-[1.6] text-text">
        {body}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border-2 border-accent-600 bg-accent-600 px-4 py-3 text-[14px] font-semibold leading-none text-white transition-colors hover:border-accent-700 hover:bg-accent-700"
          >
            {openLabel}
          </a>
        ) : (
          <span className="border-2 border-neutral-400 px-4 py-3 text-[13.5px] leading-[1.3] text-neutral-700">
            {blocked}
          </span>
        )}

        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-2 border-2 border-neutral-400 px-4 py-3 text-[13.5px] font-medium leading-none text-neutral-800 transition-colors hover:border-text hover:text-text"
        >
          {copied ? (
            <Check size={14} aria-hidden="true" />
          ) : (
            <Copy size={14} aria-hidden="true" />
          )}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
