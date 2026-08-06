'use client';

import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, MeshTransmissionMaterial } from '@react-three/drei';
import { Color, MathUtils, type Group, type Mesh } from 'three';

/**
 * The logo itself: every mesh in the GLB re-materialised as glass, floating and
 * tracking the cursor.
 *
 * The GLB ships from Tripo3D at 759k triangles and 22 MB. It is decimated to
 * 45.5k triangles, stripped of its baked texture and UVs (a transmission
 * material samples neither), and Draco-compressed to ~121 KB — see
 * `public/models/logo.glb`. Regenerate with gltf-transform if the source
 * changes: weld -> simplify --ratio 0.06 -> strip textures -> draco.
 */

export const MODEL_URL = '/models/logo.glb';
/** Self-hosted decoder. drei defaults to a Google CDN; we do not want that origin. */
export const DRACO_PATH = '/draco/';

/**
 * The glass is colourless, by decision — clear crystal rather than a tinted
 * mark. Both constants are therefore pure white, which is not the same as
 * "unset": three needs real colours here, and white is the identity value for
 * both (a white `attenuationColor` absorbs nothing at any distance, so the body
 * stays clear however thick it is).
 *
 * They are kept as named constants rather than inlined because this is the one
 * place the mark's colour is decided, and it has moved twice — a cool blue
 * first, then the brand orange, now clear. Retinting means changing these two
 * and re-tuning `attenuationDistance` to match; see the note there, since the
 * right distance depends entirely on how saturated the tint is.
 *
 * Literals for the same reason `lib/og.tsx` repeats the palette: this is a
 * WebGL material and three cannot resolve CSS custom properties.
 */
const GLASS_TINT = '#ffffff';
const ATTENUATION_TINT = '#ffffff';

/**
 * The mark is thinnest on X, so its face points down the X axis and a camera on
 * +Z would otherwise stare at the edge. This quarter turn presents the face.
 *
 * Negative, not positive: turning the other way shows the *back* of the mark,
 * which mirrors it — the bars then descend left-to-right instead of ascending
 * like the wordmark in the header. Easy to miss on a symmetrical-looking shape.
 *
 * It also has to be the *base* every animated Y target is measured from —
 * damping straight toward the pointer offset would decay this away in the first
 * second and turn the logo back edge-on.
 */
const BASE_ROTATION_Y = -Math.PI / 2;

/**
 * Fills the frame at the camera distance set in GlassLogoCanvas.
 *
 * Sized against the actual frustum, not by eye. At z = 3.1 and fov 32 the
 * visible height is 2 * 3.1 * tan(16 deg) = 1.78 units and the 4:3 canvas is
 * 2.37 wide. The mark presents 0.788 tall x 0.98 wide, so 1.95 puts it at
 * ~86% of the height and ~81% of the width — large, with enough margin that
 * the pointer tilt and the float never clip a corner.
 */
const FIT_SCALE = 1.95;

/** Height of the mark in the GLB, from the POSITION accessor's min/max. */
const MODEL_HEIGHT = 0.788;
/** Peak of the idle float. Keep in step with the `floatY` term in useFrame. */
const FLOAT_AMPLITUDE = 0.035;

/**
 * Resting height of the mark, above the centre of its box.
 *
 * Purely compositional — it sits the mark a little higher in the column so it
 * reads against the headline rather than the buttons below it. It is the base
 * every vertical position is measured from, the same way `BASE_ROTATION_Y` is
 * for the turn: the idle float is added on top of this, not substituted for
 * it, or the damping would pull the mark back down to centre within a second.
 *
 * It also has to be in the group's initial `position`, not only in the frame
 * loop, because reduced-motion renders the scene still and never enters that
 * loop at all.
 */
const BASE_Y = 0.1;

/**
 * Where the ground plane sits, derived rather than eyeballed.
 *
 * The contact shadow itself lives in `HeroLights`, but its height depends on
 * values that live here, so it is computed here and imported there. Hard-coding
 * it is how it silently broke once already: `FIT_SCALE` was raised and the
 * plane stayed put, ending up *inside* the bottom of the mark.
 *
 * Half the scaled height, plus the float, plus clearance so the lowest corner
 * never punches through while the mark tilts — then offset by `BASE_Y`, so
 * raising the mark carries its shadow with it instead of leaving it stranded
 * at the old height with a visible gap.
 */
export const GROUND_Y =
  BASE_Y - ((MODEL_HEIGHT / 2) * FIT_SCALE + FLOAT_AMPLITUDE + 0.03);

/**
 * How far the shadow camera must see from that plane to reach the top of the
 * mark. Too short and the tallest bars cast nothing at all.
 */
export const GROUND_FAR = MODEL_HEIGHT * FIT_SCALE + FLOAT_AMPLITUDE * 2 + 0.2;

export type GlassQuality = 'high' | 'low';

type Props = {
  quality?: GlassQuality;
  tint?: string;
  /** Disables float, spin and cursor tracking for prefers-reduced-motion. */
  motion?: boolean;
  /** Cursor tracking. Off on touch, where float and drift carry the motion. */
  parallax?: boolean;
  /**
   * What the glass refracts. A transmission material samples whatever is behind
   * it; on a transparent canvas with an empty scene that is nothing at all, and
   * the mark renders as a black silhouette. Feeding it the page background is
   * what makes it read as clear glass sitting on the hero.
   */
  backdrop?: string;
};

export function GlassLogo({
  quality = 'high',
  tint = GLASS_TINT,
  motion = true,
  parallax = true,
  backdrop,
}: Props) {
  const group = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const { scene } = useGLTF(MODEL_URL, DRACO_PATH);

  /**
   * Every mesh in the file, whatever its nesting. Cloning is deliberate:
   * `useGLTF` caches one scene graph per URL, and mutating it would leak across
   * remounts. We only read geometry, so the clone is cheap.
   */
  const meshes = useMemo(() => {
    const found: Mesh[] = [];
    scene.traverse((child) => {
      if ((child as Mesh).isMesh) found.push(child as Mesh);
    });
    return found;
  }, [scene]);

  useFrame((state, rawDelta) => {
    const g = group.current;
    if (!g) return;

    // A backgrounded tab hands back a huge first delta; damping with it makes
    // the mark snap. Clamp to ~3 frames.
    const dt = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;

    if (motion) {
      // Idle float and slow turn.
      const floatY = BASE_Y + Math.sin(t * 0.55) * 0.035;
      const drift = Math.sin(t * 0.22) * 0.18;

      // Cursor parallax. state.pointer is -1..1 across the canvas, and stays at
      // the origin on touch — so zeroing these leaves the float and drift to
      // carry the motion rather than freezing the mark.
      const px = parallax ? state.pointer.x : 0;
      const py = parallax ? state.pointer.y : 0;

      g.position.y = MathUtils.damp(g.position.y, floatY, 4, dt);
      g.position.x = MathUtils.damp(g.position.x, px * 0.06, 3, dt);

      g.rotation.y = MathUtils.damp(
        g.rotation.y,
        BASE_ROTATION_Y + drift + px * 0.35,
        3,
        dt
      );
      g.rotation.x = MathUtils.damp(g.rotation.x, -py * 0.22, 3, dt);
      g.rotation.z = MathUtils.damp(g.rotation.z, px * 0.05, 3, dt);
    }

    // Hover lift. Small on purpose — the brief asked for restraint.
    const targetScale = FIT_SCALE * (hovered ? 1.045 : 1);
    const s = MathUtils.damp(g.scale.x, targetScale, 5, dt);
    g.scale.setScalar(s);
  });

  const high = quality === 'high';

  // three wants a Color instance, and rebuilding one every frame would thrash.
  const backdropColor = useMemo(
    () => (backdrop ? new Color(backdrop) : undefined),
    [backdrop]
  );

  return (
    <group
      ref={group}
      position={[0, BASE_Y, 0]}
      rotation={[0, BASE_ROTATION_Y, 0]}
      scale={FIT_SCALE}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {meshes.map((mesh) => (
        <mesh
          key={mesh.uuid}
          geometry={mesh.geometry}
          castShadow={high}
          receiveShadow={high}
        >
          {/*
            One material instance per mesh. Each transmission material allocates
            its own back buffer and renders the scene into it every frame, so
            this only stays cheap because the file is a single mesh — if the GLB
            ever gains more, hoist a shared material instead of mapping.
          */}
          <MeshTransmissionMaterial
            transmission={1}
            thickness={0.95}
            // Near-mirror. Roughness is the single biggest lever on how
            // polished the mark reads: at 0.05 the reflections were already
            // softening into a sheen, and a real cast-glass object holds them
            // sharp. Costs nothing.
            roughness={0.015}
            // 1.52 is soda-lime glass. The old 1.5 was a round number; this is
            // the measured one, and the extra bend widens the caustic edges.
            ior={1.52}
            clearcoat={1}
            clearcoatRoughness={0.02}
            // Prism split at the edges. Up from 0.08 — with the sharper
            // surface there is now enough definition for it to register as
            // dispersion rather than a colour fringe.
            chromaticAberration={hovered ? 0.15 : 0.11}
            // Down from 0.12. This blurs what the glass transmits; lowering it
            // is what turns a frosted look into a clear one, and it is the
            // other half of the roughness change.
            anisotropicBlur={0.05}
            distortion={0.1}
            distortionScale={0.18}
            temporalDistortion={0.06}
            // How hard the lightformer rig shows up in the surface. This is
            // the "lustre" knob proper: the environment is already rendered,
            // so scaling its contribution is free.
            envMapIntensity={1.7}
            specularIntensity={1}
            color={tint}
            attenuationColor={ATTENUATION_TINT}
            // Inert while `ATTENUATION_TINT` is white — a colourless body
            // absorbs nothing at any distance. Left in place because it is
            // half of the tinting story and the value is not obvious: this is
            // how far light travels through the mark before the tint fully
            // absorbs it, so it has to be re-tuned against the saturation of
            // whatever colour goes in. History, since it was got wrong once:
            // 1.1 suited the original pale blue; reusing it for a saturated
            // orange saturated inside the thinnest bar and turned the whole
            // mark flat opaque, killing the refraction. 6 kept that same
            // orange translucent. Below ~2.5 anything saturated reads solid.
            attenuationDistance={6}
            // Cost knobs, and the whole reason phones get a separate tier.
            // `samples` drives the blur quality of the refraction and
            // `resolution` sizes the extra render target the material fills
            // every frame — on mobile GPUs that fill rate is the bottleneck,
            // not the 45k triangles.
            //
            // 8 rather than 6 on the high tier: the sharper surface exposes
            // banding in the refraction that the old blur was hiding. The low
            // tier is untouched — it never gets close enough to show it.
            samples={high ? 8 : 2}
            resolution={high ? 512 : 160}
            // Refracts the far wall of the mark as well as the near one, so
            // each bar shows its own back faces through the body instead of
            // reading as a slab. This was off, on the grounds that the
            // difference did not survive at hero size. That call was made
            // against a much softer surface; with the roughness down at 0.015
            // there is enough definition for the internal structure to show,
            // and on colourless glass it is doing most of the work — there is
            // no tint left to give the body shape, so the back faces and the
            // speculars are the whole read. Costs a second render pass, hence
            // high tier only; the low tier keeps the cheap single pass.
            // Measured 60 fps on desktop with it on.
            backside={high}
            backsideThickness={0.4}
            background={backdropColor}
          />
        </mesh>
      ))}
    </group>
  );
}

// Warm the cache as soon as this chunk evaluates — by which point the mount has
// already decided the 3D path is appropriate, so nothing is wasted.
useGLTF.preload(MODEL_URL, DRACO_PATH);
