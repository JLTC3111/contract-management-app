// src/components/common/SunMoonIcon.jsx
// Sun <-> Moon icon that morphs between the two lucide glyphs in two stages.
//
//   light -> dark : rays dissolve, the black fill drains away, the outline
//                   swells into a full circle, then it is eclipsed into the crescent.
//   dark -> light : the crescent becomes a full circle first, then that circle
//                   fills with black, then the rays are added.
//
// Both directions are the same motion value played forwards or backwards, so
// the reverse is exactly the reverse. Geometry comes straight out of
// lucide-react's icon nodes; flubber handles the disc -> crescent stage.
import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { fromCircle } from 'flubber';
import { __iconNode as sunNode } from 'lucide-react/dist/esm/icons/sun.js';

// lucide `sun` = ["circle", {cx:12, cy:12, r:4}] + 8 ray paths
const SUN_CIRCLE = sunNode.find(([tag]) => tag === 'circle')[1];
const SUN_RAYS = sunNode.filter(([tag]) => tag === 'path').map(([, attrs]) => attrs.d);
const CX = Number(SUN_CIRCLE.cx);
const CY = Number(SUN_CIRCLE.cy);
const SUN_R = Number(SUN_CIRCLE.r);

// lucide `moon` is `M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z`: an outer arc of radius 9
// starting at (12,3), with an inner radius-6 bite taken out of it. Rebuilding it
// from those two radii lets the crescent be drawn smaller than the sun without a
// transform - a scale transform would pivot on the morphing path's own bounding
// box and wobble mid-animation.
const MOON_SCALE = 0.85;
const round = (n) => Number(n.toFixed(3));
const MOON_OUTER = round(9 * MOON_SCALE);
const MOON_INNER = round(6 * MOON_SCALE);
const MOON = `M12 ${round(12 - MOON_OUTER)}a${MOON_INNER} ${MOON_INNER} 0 0 0 ${MOON_OUTER} ${MOON_OUTER} ${MOON_OUTER} ${MOON_OUTER} 0 1 1-${MOON_OUTER}-${MOON_OUTER}Z`;
const MOON_R = MOON_OUTER;

const circlePath = (r) =>
  `M${CX - r},${CY}A${r},${r},0,1,1,${CX + r},${CY}A${r},${r},0,1,1,${CX - r},${CY}Z`;

// Stage two only: the full disc gets bitten into the crescent. flubber returns
// the untouched circle at t ~ 0, which is the exact shape stage one ends on.
const eclipse = fromCircle(CX, CY, MOON_R, MOON, { maxSegmentLength: 0.5 });

// Where the swell ends and the eclipse begins.
const SWELL_END = 0.5;

const morph = (p) => {
  if (p <= SWELL_END) return circlePath(SUN_R + (MOON_R - SUN_R) * (p / SWELL_END));
  if (p > 1 - 1e-4) return MOON;
  return eclipse((p - SWELL_END) / (1 - SWELL_END));
};

const SunMoonIcon = ({
  dark = false,
  size = 24,
  strokeWidth = 2,
  duration = 0.7,
  fill = '#000',
  ...props
}) => {
  const progress = useMotionValue(dark ? 1 : 0);

  useEffect(() => {
    const controls = animate(progress, dark ? 1 : 0, {
      duration,
      ease: [0.65, 0, 0.35, 1],
    });
    return () => controls.stop();
  }, [dark, duration, progress]);

  const d = useTransform(progress, morph);

  // Rays are gone before the disc is full, so the midpoint is a clean circle.
  const rayOpacity = useTransform(progress, [0, 0.3], [1, 0]);
  const rayScale = useTransform(progress, [0, SWELL_END], [1, 1.25]);
  // The fill drains after the rays and is gone by the time the circle is full,
  // so coming back the other way the circle forms, *then* fills, *then* gets rays.
  const fillOpacity = useTransform(progress, [0.15, SWELL_END], [1, 0]);

  // No transform on the morphing path itself: framer-motion forces
  // `transform-box: fill-box` + `transform-origin: 50% 50%` on SVG children, so
  // a transform there would pivot on the box the morph is reshaping. The ray
  // group's box is fixed (2..22 on both axes), so its centre is 12,12.
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.g style={{ opacity: rayOpacity, scale: rayScale }}>
        {SUN_RAYS.map((ray) => (
          <path key={ray} d={ray} />
        ))}
      </motion.g>
      <motion.path d={d} fill={fill} fillOpacity={fillOpacity} />
    </svg>
  );
};

export default SunMoonIcon;
