# Digi Hook

The public marketing site for Digi Hook — an IT solutions and creative agency in Noida — plus
an internal dashboard for drafting client proposals with Claude.

Built with Next.js 15 (App Router), TypeScript (strict), Tailwind CSS and Framer Motion.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill it in — see below
npm run dev
```

The site runs at http://localhost:3000. Only `NEXT_PUBLIC_SITE_URL` is needed for the
public pages; the rest is for the dashboard.

## Environment

| Variable | Needed for | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Public site | Canonical URLs, OpenGraph, sitemap, JSON-LD |
| `SQLITE_PATH` | Dashboard | Optional. Database file; defaults to `data/digihook.db` |
| `DASHBOARD_PASSWORD` | Dashboard | Shared team password. Rotate when someone leaves. |
| `AUTH_SECRET` | Dashboard | 32+ random chars. Signs session and proposal cookies. |
| `ANTHROPIC_API_KEY` | Dashboard | Server-side only. Drafts and revises proposals. |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Proposals are stored in SQLite via Node's built-in `node:sqlite` — no server to run and
nothing to install, but it does require Node 24. The database file is created on first
use and is gitignored.

Without `ANTHROPIC_API_KEY`, or if the database file cannot be opened, the dashboard
still loads and tells you what is missing rather than crashing.

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm start           # serve the production build
npm run typecheck   # tsc --noEmit
npm test            # enquiry-schema regression tests
npm run lint
```

## Structure

```
app/          routes — 13 public pages, /dashboard (internal), /proposals (client-facing)
content/      all copy, as typed modules — edit copy here, not in components
components/   shared chrome and page layouts
lib/          company facts, SEO helpers, JSON-LD, enquiry logic, db, auth, Claude
public/       logo and the self-hosted Archivo subset
design_handoff_digihook_website/   the original design prototype (the spec)
```

## How it works

**The public site** is statically prerendered. Copy lives in `content/` as typed
modules, so pages are thin renderers. Design tokens come from the Modernist design
system in the handoff — no colour value is hard-coded, there are no media queries
(every grid uses `auto-fit` + `minmax`), and border radius is 0 throughout.

**The enquiry form** at `/contact` is schema-driven: pick a service and the questions
change, with follow-ups that branch up to three levels deep. The schema in
`content/enquiry.ts` drives the rendering, the validation and the server action alike.

**The dashboard** at `/dashboard` lets the team give Claude a client brief, get a drafted
proposal back, revise it in plain English, and publish it at an unguessable URL gated by
a 6-digit access code. Proposal pages are kept out of search entirely.

## Deploying

Any Node host works; Vercel is the straightforward option. Set the environment
variables above in the host's dashboard. The public routes are static, and
`/dashboard` + `/proposals` render per request.

Before going live, read `memory/digihook-open-decisions.md` — the production domain,
the logo SVG, and contact-form delivery are still open.
