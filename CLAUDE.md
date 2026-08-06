# Digi Hook — project instructions

Public marketing site for **Digi Hook**, an IT solutions and creative agency in Noida,
India, plus an internal proposal dashboard. Ported from a design prototype into Next.js.

Canonical domain: **`https://digihook.in`** (apex, no `www` — confirmed 2026-07-26).
Everything derives from `SITE_URL` in `lib/site.ts`.

## Start here

> ⚠️ **This project is not under version control.** `.gitignore` exists but
> `git init` was never run, so there is no history, no rollback and no way for a
> second person to work on it safely. Before scaling this further, that is the
> first thing to fix — everything below assumes you can undo a bad change.

Where the durable knowledge lives, in the order worth reading:

| Source | Holds |
|---|---|
| **This file** | Conventions, architecture, and the gotchas that cost real time. Authoritative — if code and this file disagree, one of them is a bug. |
| `memory/digihook-*.md` (in the Claude project memory) | Why decisions were made, what the client actually asked for, and what is still undecided. `digihook-open-decisions.md` is the pre-launch checklist. `digihook-proposal-roadmap.md` is the built-vs-not list. |
| `lib/enquiry.test.ts`, `lib/delivery.test.ts` | Behaviour that must not regress. 82 cases. They deliberately fail when the schema changes — that is the point. |
| `assets-source/README.md` | The originals the build derives from, and how to regenerate. |
| `design_handoff_digihook_website/` | The original design prototype. Still the spec for any page markup. |

Code comments carry the *local* reasoning; the tables above carry the reasoning
that spans files. When you change something documented here, change it here too
in the same pass — a stale instruction is worse than no instruction.

## Commands

```bash
npm run dev         # dev server; :3000, or an auto-assigned port if that is busy
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm test            # enquiry-schema + delivery regression tests (tsx)
npm run seo         # crawls sitemap.xml against a running server; exits 1 on failure
npx next lint
```

Run `npm test`, `npm run typecheck` and `npx next lint` before calling work done.
`npm run seo` needs the dev server up. It catches the things that rot silently: missing
`og:image`, over-length or duplicated titles/descriptions, heading-level skips, orphan
pages, wrong canonicals, and `noindex` leaking into the sitemap.

**Never run `npm run build` while the dev server is running** — it overwrites `.next`
and the dev server then throws `MODULE_NOT_FOUND` on stale chunks. Stop dev, build,
`rm -rf .next`, restart. A stale `.next` has also silently served a **sitemap missing
newly added routes**; if `npm run seo` reports fewer routes than `content/navigation.ts`
defines, clear `.next` before debugging anything else.

## The design prototype is the spec

`design_handoff_digihook_website/` holds the original: `README.md` (the brief),
`Digi Hook Site.dc.html` (every page, all final copy), and `_ds/modernist-*/` (the
design system). Read the relevant block there before changing a page's markup.
**Its `support.js` runtime is not ported and never should be.**

## Non-negotiable conventions

- **No hard-coded colour values.** Tokens are CSS variables in `app/globals.css :root`;
  `tailwind.config.ts` maps names onto `var(--…)`. Use `bg-bg`, `text-accent-700`,
  `border-neutral-300`, etc. Arbitrary values are for **sizes only** (`text-[15.5px]`).
  One deliberate exception: `lib/og.tsx` — Satori cannot resolve CSS custom properties,
  so it repeats the palette in one commented block that must be kept in sync.
- **No media queries, no `sm:`/`md:`/`lg:` prefixes.** Every responsive grid is
  `grid-cols-[repeat(auto-fit,minmax(min(100%,Npx),1fr))]`. Asymmetric layouts use
  `flex-wrap` + `flex-[1_1_Npx]`. Where behaviour must change with width, express it
  fluidly — `clamp()`, `flex-wrap`, `self-stretch` — never a breakpoint.
- **Border radius is 0 everywhere**, on purpose. Never add `rounded-*`.
- **Contrast (measured, not guessed).** On the light ground: `accent` 3.76:1 and
  `neutral-600` 3.85:1 both **fail** AA for normal text; `accent-700` 6.41:1 and
  `neutral-700` 5.83:1 pass. White on `accent` is 4.20:1 and **fails**; white on
  `accent-600` is 4.74:1 and passes. So:
  - text under ~18px → `accent-700` / `neutral-700`, never `accent` / `neutral-600`
  - white text on a fill → `bg-accent-600` (hover `accent-700`), never `bg-accent`
  - bare `accent` is fine for **icons, ≥18.66px bold display type, and decorative
    fills with no text on them** (the scroll bar, the hero square, progress fills)
  - on the dark ground (`bg-text`) it inverts: use `neutral-400`/`neutral-500`,
    not `neutral-600`/`700`
  The site publishes "WCAG 2.2 AA" in its own hero, so this is a promise, not a
  preference. Target size minimum is 24px — inline links inside a sentence are exempt.
- **One `<h1>` per page**, and no heading-level skips (`h1 → h3` fails `npm run seo`).
  Question-shaped H2s are deliberate — they are the AEO surface.
- **Reduced motion** is honoured in CSS *and* via Framer's `useReducedMotion`.
- **CSS comments must be ASCII only** — Unicode box-drawing characters get mangled by
  the CSS loader and silently break the rule that follows.
- **The no-media-queries rule is about *width*.** `@media print` and
  `@media (prefers-reduced-motion)` are different output modes, cannot be expressed
  fluidly, and are both in `globals.css` on purpose. Never add a width breakpoint.

## Copy rules

- Marketing copy in `content/` was lifted verbatim from the prototype and is
  **client-approved. Do not rewrite, shorten or "improve" it.**
- **Never invent client names, testimonials, case studies, or performance statistics.**
  The studio has none, and the design is built around their absence. Where an article
  needs figures, it uses the studio's own published prices and says so.
- Copy that is **new and not client-approved**: `content/enquiry.ts` (questions and
  options), `content/pricing.ts` (wording around the client's figures), `homeHero` in
  `content/home.ts` (rewritten 2026-07-26 at the client's direction), the three
  Knowledge Hub articles, and `content/meta.ts`.
- `content/meta.ts` holds **search-result snippets, not page copy** — nothing in it
  appears on the site. Keep each description under 160 characters and unique.

## Architecture

| Path | What |
|---|---|
| `app/` | 16 public routes + `sitemap.ts` / `robots.ts` / `opengraph-image.tsx` per segment; `dashboard/`, `proposals/` |
| `content/` | All copy as typed modules. Edit copy here, never in JSX. |
| `components/` | Shared chrome + `ServicePage` / `DeepPage` / `PageHero` / `Accordion` / `CtaBand` / `ArticleLayout` |
| `lib/` | `site.ts` (company facts), `seo.ts`, `jsonld.tsx`, `og.tsx`, `enquiry.ts`, `enquiries.ts`, `proposals.ts`, `db.ts`, `email.ts`, `auth.ts`, `claude.ts` |
| `scripts/` | `seo-check.mjs` — the crawler behind `npm run seo` |

Shared page layouts exist — check `components/` before hand-rolling new page markup.
`ServicePage` drives ecommerce/marketing/creative; `DeepPage` drives medical/real-estate;
`ArticleLayout` drives the two newer Knowledge Hub articles. **The flagship article
(`why-your-website-is-slow`) predates `ArticleLayout` and still carries its own copy of
that markup** — a layout fix there must be made twice until it is migrated.

### Storage — SQLite, not MongoDB

`lib/db.ts` uses Node's built-in `node:sqlite` (needs Node 24). No dependency, no server,
one file at `data/digihook.db` (`SQLITE_PATH` overrides; `/data` is gitignored). Two
tables: `proposals` and `enquiries`. **`content/technology.ts` still lists MongoDB — that
is marketing copy about the stack offered to clients, not this app. Leave it.**

SQLite writes to local disk, so this will not survive on Vercel or any serverless host —
the filesystem is ephemeral and per-instance. Fine on a VPS. Decide before launch.

**`CREATE TABLE IF NOT EXISTS` is a no-op on a table that already exists**, so a column
added to `SCHEMA` never reaches a database created before it. Add it to `SCHEMA` *and*
call `addColumnIfMissing()` in `getDb()` — that pair is the whole migration story, and
columns are only ever added, never dropped or retyped.

**Migrations run once per process, on the first `getDb()`.** The handle is cached on
`globalThis`, so a dev server that was already running when you added a column keeps the
old handle and never migrates — queries then fail with `no such column`. Restart the dev
server after any schema change; don't debug the SQL first.

### Enquiry form (`/contact`)
Schema-driven and branching. `content/enquiry.ts` is the single source of truth;
`lib/enquiry.ts` holds the pure logic, imported by **both** the client renderer and the
server action. **The server re-derives visibility and prunes answers to questions the
visitor never saw** — never make it trust the posted field list. Tests in
`lib/enquiry.test.ts` pin behaviour, so changing questions fails a test until you update
it. That is intentional.

`email` and `phone` are **separate and both required** (they were one either/or field).
On submit the action saves an `enquiries` row **first**, then emails — email failure is
caught and logged, never surfaced, because losing the lead is worse than a missing
acknowledgement.

### Email
`lib/email.ts`, provider-agnostic and dependency-free (Resend is a single JSON POST).
With no `RESEND_API_KEY` it logs instead of sending and `isEmailConfigured()` returns
false so the dashboard says so plainly — **it never pretends to have sent anything**.
The one address is `sales@digihook.in` (sender, notification inbox, and the published
`site.email`). Needs the domain verified with the provider before it will send.

### Proposal dashboard (`/dashboard`)
Shared team password → HMAC session cookie. `middleware.ts` only checks a cookie
*exists* (edge runtime has no Node crypto); the real check is `requireSession()` in every
page and action — **do not move it into middleware**. Claude drafts proposals via
structured outputs (typed objects, not markdown). Proposal pages are excluded from
search three ways: `noindex`, `robots.ts` disallow, and absence from the sitemap.

`/dashboard/enquiries` lists submitted briefs; "Draft proposal" opens `/dashboard/new`
prefilled from the enquiry and links the two on save.

### Client-facing proposal tabs
`/proposals/<slug>` has three tabs — the proposal, `/assets` ("what we need from you")
and `/status` (work stages + payment schedule). The access-code gate lives in
`app/proposals/[slug]/layout.tsx` and covers all three.

**Acceptance gates the second and third tabs.** The flow is proposal → accept →
the rest unlocks. `accepted_at` is set by the client's Accept button (guarded by
the access cookie) or by the studio from the dashboard ("agreed on a call"); the
client's button is one-way — only the dashboard can un-accept. The greyed tabs
are chrome; the load-bearing check is `if (!proposal.acceptedAt)` in each
sub-page, same pattern as the unlock re-check.

**"What we need" has three states, not two** — locked (not accepted) → a
thank-you notice promising the list within 24 hours (accepted, `assets_shared_at`
null) → the real checklist. Publishing is a deliberate studio action
(`setAssetsShared`), separate from saving the list, because the seeded checklist
is a prompt for the studio's own edit: showing it the instant a client accepts
would be handing them a list nobody reviewed for their project. Any copy change
to the 24-hour promise has to match what the studio can actually deliver.

**The proposal renders as a formal numbered document** (`ProposalView`), modelled
on the client's Galaxy Super Speciality reference: a Prepared for / Prepared by /
Date header in the layout, then top-level sections numbered `01…N` **at render
time, not stored** — `annexure` and `support` are optional and older proposals
lack them, so numbering only what actually renders keeps the sequence unbroken.
Section numbers are 15px, so they use `accent-700`; the timeline's own 20px bold
numerals are large text and may stay bare `accent`.

**The payment schedule renders from `proposal.milestones`, not from `content`.**
One source of truth with the `/status` tab — the schedule the client agrees to
and the schedule the studio bills against cannot drift. It is deliberately in
the proposal *above* the acceptance block: `/status` is locked until after
acceptance, so without this the client would be agreeing to a payment plan they
could not see. Claude is instructed never to state a payment split anywhere in
`content` (a generated draft once put "50% upfront" in `terms` while the
milestones said 20/30/50).

**`content.technology` names the stack** (Next.js / Node.js / MongoDB / TypeScript /
Tailwind / edge hosting) with a per-project "what it means for you" line. The
permitted technologies are listed in the `lib/claude.ts` system prompt, lifted from
the approved copy in `content/technology.ts` — **keep the two in sync**, and never
let a proposal name a technology the studio does not build with.

**Proposals carry an optional technical annexure** (`content.annexure`) —
plain-language tables of feature / what it is / why it matters, modelled on the
client's Galaxy Super Speciality reference proposal. Claude generates 2–4 tables
relevant to the project; proposals stored before 2026-07-26 have none and must
keep rendering (hence optional everywhere).

**A layout that declines to render `children` does not stop those child pages
executing** — so every page behind the gate calls `unlockedProposal()` itself and returns
`null` when locked. The layout's check is for the visitor; the per-page check is the one
that is load bearing. Same rule as `requireSession()` — do not remove it as redundant.

`assets` / `milestones` / `stages` are studio-edited columns beside the Claude-generated
`content`, and `saveDelivery()` writes only those — so the delivery editor cannot clobber
a proposal, and a revision cannot reset what has been paid. Work stages seed from
`content.timeline` once, then diverge on purpose. Milestone amounts derive from
`content.total`; when that total is a range or prose, `parseAmount` returns null and the
page shows percentages only rather than a confidently wrong rupee figure.

Before touching anything Claude-related, load the **`claude-api` skill** — model IDs and
parameters drift. The proposal model is set by `PROPOSAL_MODEL` (default
`claude-haiku-4-5`, chosen for cost); `lib/claude.ts` carries the per-tier costs and the
parameters each tier accepts. Not every tier takes the same options — **Haiku rejects
`output_config.effort`**, so guard anything tier-specific rather than sending it blindly.
Revisions return only the fields they change and are merged over the existing proposal —
regenerating the whole document to move one date cost twice as much for no benefit.

## SEO is a functional requirement

Server-render everything. Per-route metadata, JSON-LD (Organization, WebSite,
LocalBusiness, Service, FAQPage, Article, BreadcrumbList, Offer), real sitemap and robots.
Performance budget the site publishes about itself: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.10
on throttled mobile — which is also the reason to refuse heavyweight hero effects.

**A page that exports its own `metadata` with an `openGraph` block replaces the inherited
one wholesale**, so a root `opengraph-image.tsx` does *not* reach child segments. Every
route needs its own four-line `opengraph-image.tsx`.

`lib/og.tsx` renders the cards. Satori (behind `next/og`) accepts TTF/OTF/WOFF but
**not WOFF2 and not variable fonts** — a variable build fails deep in its parser with
`Cannot read properties of undefined`. `public/fonts/Archivo-og.ttf` is a static
ExtraBold instance kept specifically for this; the site's own WOFF2 will not work.

### Hero glass logo (WebGL)

`components/hero/` — `HeroGlassLogo` (mount + capability gate) → `GlassLogoCanvas`
(lazy chunk) → `GlassLogo` + `HeroLights`. `HeroLogoFallback` is the CSS mark that
renders server-side and stays put on mobile, coarse pointers, reduced motion and
no-WebGL. **The hero prints the studio's own LCP/INP/CLS budget a few hundred
pixels away**, so the rules here are not stylistic:

- three/fiber/drei must stay out of the initial bundle: four lazy chunks,
  **276 KB gzipped**, plus 118 KB model and 73 KB decoder. Home is 149 kB
  first-load; if that jumps, the dynamic import broke.
- **Below 900px there is no canvas at all** — hard gate, not a quality tier, so
  phones fetch none of the above. The `low` tier applies to touch/low-core
  devices *above* that width. Mobile 3D was tried and pulled back out.
- **There is no placeholder, and there must not be one.** The column is empty
  until the canvas mounts, and empty forever where it cannot run. Two earlier
  versions put something there — a CSS glass slab, then a flat `logo.png` — and
  both read as a *second logo* appearing in the hero, because it is the same
  artwork. Anything that occupies this box before the glass does will look like
  a bug. Reduced-motion users get the canvas rendered still (`motion={false}`),
  not a substitute image.
- `HeroGlassLogo` wraps its own `Reveal`. Do not wrap it in one from
  `app/page.tsx` — `Reveal` renders a div unconditionally, which would leave an
  empty grid item and its row gap on mobile when the component returns null.
- **The contact shadow's height is derived, not tuned.** `GROUND_Y` and
  `GROUND_FAR` are exported from `GlassLogo` and computed from the model height
  and `FIT_SCALE`; `HeroLights` imports them. They were hard-coded once, and
  raising `FIT_SCALE` silently put the shadow plane *inside* the bottom of the
  mark while `far` stopped short of its top. Never inline those numbers again.
  The shadow also has no `frames` cap — the mark moves continuously, so a baked
  shadow sits still under a moving object.
- The width decision re-runs on a debounced resize, and the IntersectionObserver
  effect depends on it. Both are needed: without the listener a tablet rotation
  keeps the wrong tree, and without the dep the canvas never mounts after a
  phone-to-desktop resize because the host element did not exist first time.
- The box is a fixed `aspect-[4/3]`, and the fallback and canvas are both
  `absolute inset-0` inside it. That is what keeps the swap off the CLS budget
  (measured 0.005).
- **`public/models/logo.glb` is derived, not source.** The Tripo3D original is
  759k tris / 22 MB; shipped is 45.5k tris / 121 KB via gltf-transform
  `weld → simplify --ratio 0.06 → strip textures+UVs → draco`. A transmission
  material samples neither texture nor UVs, which is why both are dropped.
- Draco decoder is self-hosted in `public/draco/`; drei otherwise fetches it from
  a Google CDN.
- `useFrame` damps rotation toward a target that **must** include
  `BASE_ROTATION_Y`. The mark is thinnest on X, so without it the quarter-turn
  decays and the logo turns edge-on within a second.
- A transmission material with nothing behind it renders black. It is fed the
  `--color-bg` token as `background` so refraction has something to sample.
- **The glass is colourless on purpose** (2026-07-26, client's call), so the
  mark carries no brand colour and the speculars, edges and back-face
  refraction are the entire read. That is why `backside` is on and `roughness`
  is down at 0.015 — with no tint to give the body shape, those are load
  bearing rather than polish, and softening them empties the mark out.
- **If it is ever retinted, `color` and `attenuationColor` are not
  interchangeable and `attenuationDistance` must be re-tuned with them.**
  `color` tints the whole surface and has to stay near-white or it reads as
  plastic; body colour comes from `attenuationColor` accumulating through the
  thickness. The distance depends on how saturated that colour is — `1.1`
  suited the original pale blue, and reusing it for a saturated orange
  saturated inside the thinnest bar and killed the refraction outright.
  Anything saturated needs ~2.5 minimum; the orange sat at 6.

## Gotchas that cost real time

- **Never render page content at `opacity: 0` from the server.** `PageTransition` used
  to, and any hydration that was slow or mismatched left the entire page blank between a
  visible header and footer, with no error anywhere. It now animates only on client-side
  route changes and always renders the same tree shape server and client.
- **`position: sticky` on a grid item** is resolved by Chrome against the whole grid, not
  its own row — a sticky `<aside>` keeps floating over the content once the grid collapses
  to one column. Put `sticky` on an inner wrapper and let the item `self-stretch`.
- **Backticks inside a template literal** terminate it — do not use them in the SQL
  comments in `lib/db.ts`.

## Verifying UI changes

Use `preview_start` (`.claude/launch.json` → `npm run dev`; `autoPort` is on, so it may
land somewhere other than :3000 — check the returned port). Note that Fast Refresh can
make React state look like it is resetting between tool calls — restart the server before
concluding a bug is real. Measure geometry and contrast in the browser rather than judging
from screenshots; several "misalignments" this project has chased were pixel-identical.

## Regenerating derived assets

`public/models/logo.glb` is **derived**, not source. To rebuild it from the
client's original after new artwork arrives:

```bash
node scripts/optimise-model.mjs assets-source/logo-source.glb
```

The dev database (`data/digihook.db`) is gitignored and currently holds **test
data**, not real leads: two dummy enquiries and three proposals, including a
"Sharma Legal Associates" law-firm brief and its generated proposal. Delete the
file to start clean — the schema rebuilds itself on first `getDb()`.

## Before launch

See `memory/digihook-open-decisions.md` for unresolved items.
