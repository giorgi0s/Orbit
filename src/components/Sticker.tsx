import { motion } from 'motion/react'

export type StickerKind = 'star' | 'heart' | 'sun'

const SHAPES: Record<StickerKind, { d?: string; fill: string }> = {
  star: { d: 'M22 3.5l5.4 11.2 12.3 1.6-9 8.6 2.3 12.2L22 31.2l-11 5.9 2.3-12.2-9-8.6 12.3-1.6Z', fill: '#FFC43A' },
  heart: { d: 'M22 37S6 27.5 6 16.5C6 11 10 7.5 14.6 7.5c3.2 0 5.8 1.8 7.4 4.4 1.6-2.6 4.2-4.4 7.4-4.4C34 7.5 38 11 38 16.5 38 27.5 22 37 22 37Z', fill: '#FF6FA3' },
  sun: { fill: '#B9F24A' },
}
const RAYS = 'M22 4v5M22 35v5M4 22h5M35 22h5M9.3 9.3l3.5 3.5M31.2 31.2l3.5 3.5M9.3 34.7l3.5-3.5M31.2 12.8l3.5-3.5'

/** A puffy die-cut sticker that stamps down with a springy overshoot. */
export function Sticker({ kind, tilt = -8, className }: { kind: StickerKind; tilt?: number; className?: string }) {
  const s = SHAPES[kind]
  return (
    <motion.svg
      className={`sticker ${className ?? ''}`}
      viewBox="0 0 44 44"
      aria-hidden="true"
      initial={{ scale: 1.9, rotate: tilt - 24, opacity: 0 }}
      animate={{ scale: 1, rotate: tilt, opacity: 1 }}
      exit={{ scale: 0.6, opacity: 0, transition: { duration: 0.12 } }}
      transition={{ type: 'spring', stiffness: 520, damping: 15, opacity: { duration: 0.08 } }}
    >
      {kind === 'sun' ? (
        <>
          <g stroke="#fff" strokeWidth={5} strokeLinecap="round"><circle cx="22" cy="22" r="10" fill="#fff" /><path d={RAYS} /></g>
          <path d={RAYS} stroke={s.fill} strokeWidth={3} strokeLinecap="round" />
          <circle cx="22" cy="22" r="9" fill={s.fill} />
          <circle cx="18.6" cy="21" r="1.3" fill="#1C2554" />
          <circle cx="25.4" cy="21" r="1.3" fill="#1C2554" />
          <path d="M19 25c1.8 1.4 4.2 1.4 6 0" stroke="#1C2554" strokeWidth={1.5} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d={s.d} fill="#fff" stroke="#fff" strokeWidth={5} strokeLinejoin="round" />
          <path d={s.d} fill={s.fill} />
          <path d={kind === 'star' ? 'M16 13.5c2-1 4-1.4 6-1.3' : 'M11.5 14.5c.6-2 2-3.2 3.8-3.5'} stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.7} fill="none" />
        </>
      )}
    </motion.svg>
  )
}
