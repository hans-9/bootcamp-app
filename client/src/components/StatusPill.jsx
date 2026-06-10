export default function StatusPill({ status }) {
  return (
    <span className={`status-pill st-${status}`}>
      <span className="dot" />
      {status}
    </span>
  )
}
