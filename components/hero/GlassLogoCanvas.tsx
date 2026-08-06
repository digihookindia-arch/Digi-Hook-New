'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, AdaptiveEvents, Preload } from '@react-three/drei';
import { GlassLogo, type GlassQuality } from './GlassLogo';
import { HeroLights } from './HeroLights';

/**
 * The WebGL surface. This module is the lazy boundary — nothing here, and
 * nothing it imports (three, fiber, drei), is in the initial bundle. The mount
 * in `HeroGlassLogo.tsx` decides whether to load it at all.
 *
 * Everything expensive is behind a quality tier so a weak device gets a
 * genuinely lighter scene rather than the same scene at a smaller size.
 */

export default function GlassLogoCanvas({
  quality = 'high',
  motion = true,
  shadowColor,
  backdrop,
  parallax = true,
}: {
  quality?: GlassQuality;
  motion?: boolean;
  shadowColor?: string;
  /** Page background, fed to the glass so refraction has something to sample. */
  backdrop?: string;
  /** Off on touch devices — there is no cursor, and a tap would snap the mark. */
  parallax?: boolean;
}) {
  const high = quality === 'high';

  return (
    <Canvas
      // Cap the pixel ratio. A 3x phone would otherwise render nine times the
      // fragments, and the transmission pass pays that cost twice over.
      // A 3x phone would otherwise render nine times the fragments, and the
      // transmission pass pays that cost a second time.
      dpr={high ? [1, 1.75] : [1, 1.15]}
      // Transparent so the hero's grid pattern shows through — the canvas is a
      // logo, not a panel.
      gl={{
        antialias: high,
        alpha: true,
        powerPreference: 'high-performance',
        // Nothing here needs to read pixels back; letting the driver discard
        // the buffer after compositing is cheaper.
        preserveDrawingBuffer: false,
      }}
      camera={{ position: [0, 0, 3.1], fov: 32 }}
      shadows={high}
      // Only the mark is interactive, so let fiber skip the rest.
      events={undefined}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <HeroLights quality={quality} shadowColor={shadowColor} />
        <GlassLogo
          quality={quality}
          motion={motion}
          backdrop={backdrop}
          parallax={parallax}
        />
        <Preload all />
      </Suspense>

      {/* Drops resolution automatically while the scene is moving, restores it
          when it settles. Cheap insurance on mid-range hardware. */}
      <AdaptiveDpr pixelated={false} />
      <AdaptiveEvents />
    </Canvas>
  );
}
