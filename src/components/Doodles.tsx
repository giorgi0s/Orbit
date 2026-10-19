// Hand-drawn bits of the planner page: Bean, the pen checkbox, squiggle underlines.

export function Bean({ sleepy, size = 70 }: { sleepy?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M40 9.5c17.8-.6 31 13.3 30.6 30.4C70.2 57 57 70.8 39.6 70.6 22.3 70.4 9.3 57.2 9.6 40 9.9 23 22.4 10.1 40 9.5Z" />
      <path d="M52 16c4 6 5 14 2.5 21M57.5 22c1.5 3 2 6 1.6 9" opacity={0.55} />
      <circle cx="25" cy="27" r="3.2" opacity={0.5} />
      <circle cx="57" cy="52" r="4" opacity={0.5} />
      <circle cx="20" cy="54" r="2.2" opacity={0.5} />
      {sleepy ? (
        <>
          <path d="M28 41c2.4 2 5.6 2 8 0M45 41c2.4 2 5.6 2 8 0" />
          <path d="M36 51c2.6 1.4 5.6 1.4 8 0" />
          <path d="M62 8h7l-7 7h7M70 1h4l-4 4h4" strokeWidth={1.8} />
        </>
      ) : (
        <>
          <circle cx="32" cy="40" r="2.6" fill="currentColor" stroke="none" />
          <circle cx="49" cy="40" r="2.6" fill="currentColor" stroke="none" />
          <path d="M34.5 49c3.4 3 8.6 3 12 0" />
          <path d="M25 46.5c-1.6.4-3 .3-4.4-.2M56 46.3c1.6.4 3 .3 4.4-.2" stroke="var(--rule)" />
        </>
      )}
    </svg>
  )
}

export function PenBox() {
  return (
    <svg className="pen-box" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 5.2c6-.9 12.6-1.1 19-.4.6 6 .8 12.3.2 18.6-6.2.7-12.6.6-18.9.1-.7-6-.8-12.2-.3-18.3Z" />
    </svg>
  )
}

export function Squiggle({ width }: { width: number }) {
  let d = 'M2 6'
  for (let x = 2; x < width; x += 12) d += ' q3 -5 6 0 t6 0'
  return (
    <svg className="squiggle" viewBox={`0 0 ${width} 10`} preserveAspectRatio="none" aria-hidden="true">
      <path d={d} stroke="var(--rule)" strokeWidth={2} fill="none" strokeLinecap="round" />
    </svg>
  )
}
