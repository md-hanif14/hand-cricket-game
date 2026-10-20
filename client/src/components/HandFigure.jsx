import { useId } from 'react';
import { motion } from 'motion/react';

/** Lightweight inline SVG hand illustration; works without external image assets. */
export default function HandFigure({ number = 0, fist = false, side = 'right', size = 150, className = '' }) {
  const gradientId = `skin-${useId().replace(/:/g, '')}`;
  const fingerHeights = [31, 44, 51, 45];
  const activeFingers = fist ? 0 : number === 5 ? 4 : Math.max(0, Math.min(4, number));
  return (
    <motion.svg
      className={`hand-figure ${side === 'left' ? 'hand-left' : 'hand-right'} ${fist ? 'is-fist' : 'is-open'} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 132 132"
      role="img"
      aria-label={fist ? 'Closed fist' : `${number} fingers`}
      initial={false}
      animate={{ scale: fist ? 0.92 : 1, scaleX: side === 'left' ? -1 : 1, rotate: fist ? 0 : side === 'left' ? -3 : 3 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffd7ad" />
          <stop offset="100%" stopColor="#eaa56f" />
        </linearGradient>
      </defs>
      {fist ? (
        <g fill={`url(#${gradientId})`} stroke="#b9784d" strokeWidth="2.2" strokeLinejoin="round">
          <path d="M35 58 Q31 48 39 44 L49 42 L49 35 Q50 27 58 29 Q65 30 64 38 L64 34 Q65 27 72 29 Q80 30 78 39 L78 36 Q80 30 86 33 Q92 35 89 44 L89 43 Q96 39 101 45 Q107 51 102 64 L96 82 Q92 94 77 96 L49 92 Q39 87 37 77 Z" />
          <path d="M38 55 L50 59 Q57 62 62 59 L92 53" fill="none" stroke="#b9784d" strokeWidth="2" />
          <path d="M48 45 L60 47 M63 42 L77 44 M78 46 L88 48" fill="none" stroke="#f9c08f" strokeWidth="2" strokeLinecap="round" />
        </g>
      ) : (
        <g fill={`url(#${gradientId})`} stroke="#b9784d" strokeWidth="2.1" strokeLinejoin="round">
          <rect x="43" y="50" width="51" height="51" rx="19" />
          {fingerHeights.map((height, index) => {
            const active = index < activeFingers;
            const x = 43 + index * 12;
            const h = active ? height : 9;
            const y = active ? 50 - height + 5 : 50;
            return <rect key={index} x={x} y={y} width="10" height={h} rx="5" opacity={active ? 1 : 0.35} />;
          })}
          <rect x="25" y="61" width="21" height={number === 5 ? 34 : 13} rx="9" transform="rotate(-35 35 68)" opacity={number === 5 ? 1 : 0.36} />
          <path d="M50 72 Q68 78 87 71" fill="none" stroke="#cf8e61" strokeWidth="1.7" strokeLinecap="round" />
        </g>
      )}
    </motion.svg>
  );
}
