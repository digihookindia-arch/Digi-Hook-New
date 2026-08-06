/**
 * SEO regression check. Crawls every URL in sitemap.xml against a running dev
 * or production server and asserts the things that silently rot: missing
 * og:image, over-length titles and descriptions, duplicate metadata, heading
 * level skips, orphaned pages, wrong canonicals, noindex leaking into the
 * sitemap.
 *
 *   npm run dev            # in one terminal
 *   npm run seo            # in another
 *
 * Exits non-zero on any FAIL so it can gate a deploy. WARNs are advisory.
 * Point it elsewhere with:  SEO_BASE=https://www.digihook.in npm run seo
 */

const BASE = process.env.SEO_BASE ?? 'http://localhost:3000';

const pick = (html, re) => { const m = html.match(re); return m ? m[1].trim() : null; };
const all = (html, re) => [...html.matchAll(re)].map((m) => m[1]);

let sitemap;
try {
  sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
} catch {
  console.error(`Could not reach ${BASE}. Is the server running?`);
  process.exit(2);
}
const routes = all(sitemap, /<loc>([^<]+)<\/loc>/g).map((u) => new URL(u).pathname);

const pages = [];
for (const path of routes) {
  const res = await fetch(BASE + path);
  const html = await res.text();
  const jsonld = all(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
    .flatMap((s) => {
      try { const p = JSON.parse(s); return Array.isArray(p) ? p : [p]; } catch { return ['PARSE-ERROR']; }
    });

  pages.push({
    path,
    status: res.status,
    title: pick(html, /<title>([^<]*)<\/title>/),
    desc: pick(html, /<meta name="description" content="([^"]*)"/),
    canonical: pick(html, /<link rel="canonical" href="([^"]*)"/),
    ogImage: pick(html, /<meta property="og:image" content="([^"]*)"/),
    robots: pick(html, /<meta name="robots" content="([^"]*)"/),
    h1: all(html, /<h1[^>]*>([\s\S]*?)<\/h1>/g),
    headings: all(html, /<(h[1-6])[^>]*>/g),
    schemas: jsonld.map((o) => (o === 'PARSE-ERROR' ? o : o['@type'])),
    words: html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length,
    links: [...new Set(all(html, /href="(\/[^"#?]*)"/g))],
    imgsNoAlt: (html.match(/<img(?![^>]*\salt=)[^>]*>/g) || []).length,
    lang: pick(html, /<html lang="([^"]*)"/),
  });
}

const fail = [], warn = [];
const F = (m) => fail.push(m);
const W = (m) => warn.push(m);

for (const p of pages) {
  if (p.status !== 200) F(`${p.path} returned ${p.status}`);
  if (!p.title) F(`${p.path} has no <title>`);
  else if (p.title.length > 60) W(`${p.path} title ${p.title.length} chars (>60 truncates): "${p.title}"`);
  if (!p.desc) F(`${p.path} has no meta description`);
  else if (p.desc.length > 160) W(`${p.path} description ${p.desc.length} chars (>160 truncates)`);
  else if (p.desc.length < 70) W(`${p.path} description only ${p.desc.length} chars`);
  if (!p.canonical) F(`${p.path} has no canonical`);
  else if (new URL(p.canonical).pathname !== p.path) F(`${p.path} canonical points to ${p.canonical}`);
  if (!p.ogImage) F(`${p.path} has no og:image`);
  if (p.h1.length !== 1) F(`${p.path} has ${p.h1.length} <h1> (must be exactly 1)`);
  if (p.imgsNoAlt) F(`${p.path} has ${p.imgsNoAlt} <img> without alt`);
  if (p.schemas.includes('PARSE-ERROR')) F(`${p.path} has invalid JSON-LD`);
  if (p.robots && /noindex/.test(p.robots)) F(`${p.path} is noindex but listed in sitemap.xml`);
  if (p.lang !== 'en') W(`${p.path} lang="${p.lang}"`);
  if (p.words < 300) W(`${p.path} only ~${p.words} words (thin)`);

  let prev = 0;
  for (const h of p.headings) {
    const lvl = +h[1];
    if (prev && lvl > prev + 1) { F(`${p.path} heading level jumps h${prev} -> h${lvl}`); break; }
    prev = lvl;
  }
}

for (const [key, label] of [['title', 'title'], ['desc', 'meta description'], ['canonical', 'canonical']]) {
  const seen = new Map();
  for (const p of pages) { const v = p[key]; if (v) seen.set(v, [...(seen.get(v) || []), p.path]); }
  for (const [v, paths] of seen) {
    if (paths.length > 1) F(`duplicate ${label} across ${paths.join(', ')}: "${String(v).slice(0, 60)}"`);
  }
}

const linked = new Set(pages.flatMap((p) => p.links));
for (const p of pages) {
  if (p.path !== '/' && !linked.has(p.path)) F(`${p.path} is orphaned — nothing links to it`);
}

console.log(`SEO check — ${pages.length} routes from sitemap.xml at ${BASE}\n`);
if (fail.length) { console.log(`FAIL (${fail.length})`); fail.forEach((m) => console.log('  x ' + m)); }
if (warn.length) { console.log(`\nWARN (${warn.length})`); warn.forEach((m) => console.log('  ! ' + m)); }
if (!fail.length) console.log(`PASS — no failures${warn.length ? `, ${warn.length} advisory warning(s)` : ''}`);

process.exit(fail.length ? 1 : 0);
