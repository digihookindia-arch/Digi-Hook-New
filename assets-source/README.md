# Source assets

Originals the build derives from. **Nothing here is served** — these are the
inputs, kept because the shipped versions cannot be reversed back into them.

| File | What it is | What derives from it |
|---|---|---|
| `logo-source.glb` | Tripo3D export of the 3D logo. 759,260 tris, 21.5 MB, with a baked colour texture. | `public/models/logo.glb` (121 KB) via `scripts/optimise-model.mjs` |
| `proposal-reference-galaxy.pdf` | The client's own Galaxy Super Speciality proposal, 23 July 2026. Fully rasterised — no text layer, read it as images. | The shape of the proposal document: numbered sections, prepared-for/by header, and the feature / what-it-is / why-it-matters annexure tables in `ProposalView`. |
| `logo-mark-source.svg` | The client's vector "bars" mark (no wordmark), supplied 2026-08-07. Original coordinate space, no background. | `app/icon.svg` (mark centred with padding on a `#f3f2f2` square, 0 border-radius per the flat-design rule) and `app/apple-icon.png` (180×180, rasterised from `app/icon.svg` with a one-off `sharp` install — not a project dependency). Background is `#f3f2f2` rather than transparent so the icon stays visible against both light and dark browser chrome — see the site's own contrast rules for why bare black-on-nothing doesn't survive dark mode. |

## Why these are here

Both arrived as one-off attachments and existed nowhere else. The GLB in
particular is unrecoverable — the shipped model is decimated to 6% of its
triangles with textures and UVs stripped, so it cannot be re-optimised at
different settings without this file.

## A note on size

`logo-source.glb` is 21.5 MB. If you would rather not carry that in git history,
either add `/assets-source` to `.gitignore` and back it up separately, or use
Git LFS. Do **not** simply delete it.

## Regenerating the shipped model

```bash
node scripts/optimise-model.mjs assets-source/logo-source.glb
```

The reference PDF is guidance the client asked us to follow for *structure and
technical depth only* — they were explicit that its contents are not to be
copied wholesale, and its 20/40/40 payment split contradicts the 20/30/50 they
stated verbally (see the open-decisions memory).
