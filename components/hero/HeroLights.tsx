'use client';

import { Environment, Lightformer, ContactShadows } from '@react-three/drei';
import { GROUND_Y, GROUND_FAR } from './GlassLogo';

/**
 * Lighting rig for the hero glass logo.
 *
 * The environment is built from `Lightformer` planes rather than a downloaded
 * HDRI. drei's `preset="city"` and friends fetch 1–2 MB of .hdr from a third
 * party CDN on first paint; these lightformers render to the same cubemap the
 * transmission material samples, so the refraction reads identically while
 * costing zero bytes and adding no third-party origin. That matters on a page
 * that publishes its own LCP budget.
 *
 * The soft "area" lights are the large low-intensity formers; the small bright
 * one is the specular streak that gives the edges definition.
 */

export type LightQuality = 'high' | 'low';

export function HeroLights({
  quality = 'high',
  /** Ground tint, read from the design tokens so this stays on-system. */
  shadowColor = '#000000',
}: {
  quality?: LightQuality;
  shadowColor?: string;
}) {
  const high = quality === 'high';

  return (
    <>
      {/* Base fill so nothing reads as pure black in the refraction. Kept low
          on purpose: glass only looks like glass when there is contrast for it
          to catch, and a light page reflected in a light environment goes flat. */}
      <ambientLight intensity={0.35} />

      {/* Key light. Shadows only on the high tier — a shadow map is a second
          render pass per frame and the softness is barely visible at this size. */}
      <directionalLight
        position={[4, 6, 5]}
        intensity={1.6}
        castShadow={high}
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0005}
      />
      {/* Rim from behind, which is what reads as "glass" on the edges. Barely
          cool, and that slight split against the warmer key is deliberate: a
          rig at one colour temperature flattens, and a cool/warm difference
          across an edge is a large part of what the eye reads as refraction
          rather than paint. Far too desaturated to tint the mark — the glass
          itself is colourless and must stay that way. */}
      <directionalLight position={[-5, 2, -4]} intensity={0.85} color="#eef2f7" />

      <Environment resolution={high ? 256 : 128}>
        {/* Large soft sources — the "area lighting". */}
        <Lightformer
          form="rect"
          intensity={2.2}
          position={[0, 4, 2]}
          scale={[8, 4, 1]}
          rotation={[-Math.PI / 3, 0, 0]}
          color="#ffffff"
        />
        <Lightformer
          form="rect"
          intensity={1.4}
          position={[-4, 1, 3]}
          scale={[5, 5, 1]}
          rotation={[0, Math.PI / 5, 0]}
          color="#fbf8f5"
        />
        <Lightformer
          form="rect"
          intensity={1.1}
          position={[4, 0, 2]}
          scale={[4, 5, 1]}
          rotation={[0, -Math.PI / 5, 0]}
          color="#ffffff"
        />
        {/* Tight bright streak — the specular highlight that travels across the
            surface as the mark turns. White, not warm: a blown highlight on
            real glass is the light source itself, not the glass, so tinting it
            would read as coloured plastic. */}
        <Lightformer
          form="circle"
          intensity={7}
          position={[2, 3, 4]}
          scale={[1.2, 1.2, 1]}
          color="#ffffff"
        />
        {/* Second, smaller streak on the opposite side. A single highlight
            reads as a shiny surface; two, catching different facets as the
            mark turns, read as a solid with depth. Lightformers are baked into
            the cubemap once, so another one is effectively free. */}
        <Lightformer
          form="circle"
          intensity={4}
          position={[-2.4, -1.2, 3.2]}
          scale={[0.7, 0.7, 1]}
          color="#ffffff"
        />
        {/* Faint underlight so the lower edge does not go dead. On colourless
            glass this matters more than it did on a tinted mark: with no body
            colour, an unlit lower edge just disappears. */}
        <Lightformer
          form="rect"
          intensity={0.7}
          position={[0, -3, 1]}
          scale={[6, 3, 1]}
          rotation={[Math.PI / 2.5, 0, 0]}
          color="#f7f9fb"
        />
        {/* Negative fill — the studio photographer's black card. Nothing dark
            in the environment means nothing for the bevels to catch, and the
            mark reads as frosted plastic rather than crystal. Neutral dark, so
            the shaded side falls toward grey and picks up no cast — a coloured
            card here is exactly how a "colourless" material ends up tinted. */}
        <Lightformer
          form="rect"
          intensity={0.08}
          position={[-3, 0, -3]}
          scale={[8, 8, 1]}
          rotation={[0, Math.PI / 3, 0]}
          color="#14161a"
        />
      </Environment>

      {/*
        Grounding shadow. Skipped entirely on the low tier.

        Position and far come from `GlassLogo` rather than being tuned by eye —
        they are a function of the model height and how far it is scaled, and
        hard-coded values fell out of sync the moment the mark was made bigger.

        No `frames` cap: the mark floats and turns continuously, so a shadow
        baked once sits still underneath a moving object. It is a 256px map, far
        cheaper than the transmission pass already running each frame.
      */}
      {high ? (
        <ContactShadows
          position={[0, GROUND_Y, 0]}
          opacity={0.32}
          scale={3.4}
          blur={2.4}
          far={GROUND_FAR}
          resolution={256}
          color={shadowColor}
        />
      ) : null}
    </>
  );
}
