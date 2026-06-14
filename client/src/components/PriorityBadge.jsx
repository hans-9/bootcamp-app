export default function PriorityBadge({ priority }) {
  return <span className={`badge prio-${priority}`}>{priority}</span>
}
