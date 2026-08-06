/**
 * Turns a raw 3D logo export into the file the hero actually ships.
 *
 * The client's source is a Tripo3D export: 759,260 triangles, ~22 MB, with a
 * baked colour texture. That is unusable on a page that publishes an LCP
 * budget. This produces ~121 KB at 45.5k triangles — a 99.4% reduction — with
 * no visible difference at hero size.
 *
 * The big win is not the decimation, it is dropping the texture and UV set:
 * `MeshTransmissionMaterial` replaces every material on load and samples
 * neither, so ~686 KB of the original file is pure download weight.
 *
 *   Usage:  node scripts/optimise-model.mjs <source.glb> [out.glb]
 *   Needs:  npx --yes @gltf-transform/cli  (fetched on demand, not a dependency)
 *
 * Re-run this whenever the client sends new logo artwork. Never ship a raw
 * Tripo3D file.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync, copyFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';

const source = process.argv[2];
const outPath = resolve(process.argv[3] ?? 'public/models/logo.glb');

if (!source) {
  console.error('usage: node scripts/optimise-model.mjs <source.glb> [out.glb]');
  process.exit(1);
}

/**
 * Fraction of triangles to keep. 0.06 lands ~45k from ~759k, which is smooth
 * enough that the refraction shows no faceting at hero size. Raise it if a
 * future logo has finer detail; check the result visually, not just the size.
 */
const SIMPLIFY_RATIO = 0.06;
/** Max positional error the simplifier may introduce, in model units. */
const SIMPLIFY_ERROR = 0.002;

const kb = (p) => (statSync(p).size / 1024).toFixed(1);
const work = mkdtempSync(join(tmpdir(), 'glb-'));
const step = (n) => join(work, `step${n}.glb`);

const gltf = (...args) =>
  execFileSync('npx', ['--yes', '@gltf-transform/cli', ...args], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

try {
  console.log(`source: ${kb(source)} KB`);

  // 1. Merge coincident vertices so the simplifier has clean topology.
  gltf('weld', source, step(1));

  // 2. Decimate. This is where the 22 MB goes.
  gltf(
    'simplify',
    step(1),
    step(2),
    '--ratio',
    String(SIMPLIFY_RATIO),
    '--error',
    String(SIMPLIFY_ERROR)
  );

  // 3. Drop textures and UVs. Done through the API rather than the CLI because
  //    prune() only removes a texture once nothing references it.
  const { NodeIO } = await import('@gltf-transform/core');
  const { prune, dedup } = await import('@gltf-transform/functions');
  const io = new NodeIO();
  const doc = await io.read(step(2));

  for (const mat of doc.getRoot().listMaterials()) {
    mat.setBaseColorTexture(null);
    mat.setNormalTexture(null);
    mat.setEmissiveTexture(null);
    mat.setOcclusionTexture(null);
    mat.setMetallicRoughnessTexture(null);
  }
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      for (const semantic of prim.listSemantics()) {
        if (semantic.startsWith('TEXCOORD')) prim.setAttribute(semantic, null);
      }
    }
  }
  await doc.transform(prune(), dedup());
  await io.write(step(3), doc);

  // 4. Draco. The decoder is self-hosted in public/draco — see GlassLogo.tsx.
  mkdirSync(dirname(outPath), { recursive: true });
  gltf('draco', step(3), outPath);

  console.log(`\nwrote ${outPath}  ${kb(outPath)} KB`);
  console.log(
    'Remember: public/draco/ must contain the matching decoder, and the hero ' +
      'reads GROUND_Y/GROUND_FAR from the model height — re-check those if the ' +
      'new artwork is a different shape.'
  );
} finally {
  rmSync(work, { recursive: true, force: true });
}
