// src/components/layout/RssPulse.jsx
import { motion } from 'framer-motion';
import { __iconNode as rssNode } from 'lucide-react/dist/esm/icons/rss.js';

// lucide `rss` = inner arc (r9), outer arc (r16), and the dot.
const [INNER, OUTER] = rssNode.filter(([tag]) => tag === 'path').map(([, a]) => a.d);
const DOT = rssNode.find(([tag]) => tag === 'circle')[1];

/**
 * The status-update icon. While the edge function is in flight the bars drop
 * out from the outside in, then come back inside out: outer leaves first, inner
 * second, inner returns first, outer last. The dot stays put throughout.
 */
const RssPulse = ({ size = 18, active = false, strokeWidth = 2 }) => {
  // Outer is hidden for the whole middle of the cycle; inner only for the core
  // of it, which is what produces the reversed return order.
  const outer = active
    ? { opacity: [1, 0, 0, 1], transition: { duration: 1.2, times: [0, 0.2, 0.8, 1], repeat: Infinity } }
    : { opacity: 1 };
  const inner = active
    ? { opacity: [1, 0, 0, 1], transition: { duration: 1.2, times: [0, 0.4, 0.6, 1], repeat: Infinity } }
    : { opacity: 1 };

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
      aria-hidden="true"
    >
      <motion.path d={INNER} animate={inner} />
      <motion.path d={OUTER} animate={outer} />
      <circle cx={DOT.cx} cy={DOT.cy} r={DOT.r} fill="currentColor" stroke="none" />
    </svg>
  );
};

export default RssPulse;
