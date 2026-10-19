import { Bean, Squiggle } from '../components/Doodles'

/** A page that hasn't been filled in yet. */
export function Blank({ title, phase, note }: { title: string; phase: string; note: string }) {
  return (
    <div className="blank">
      <h1 className="page-title">{title} <Squiggle width={title.length * 18} /></h1>
      <div className="blank-body">
        <Bean size={84} />
        <p>{note}</p>
        <p className="blank-phase">Coming in {phase}.</p>
      </div>
    </div>
  )
}
