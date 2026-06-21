// Spread onto a non-button element (e.g. a clickable table row) to make it
// reachable and operable by keyboard, mirroring native link behavior.
export function navProps(navigate, to) {
  return {
    role: 'link',
    tabIndex: 0,
    onClick: () => navigate(to),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        navigate(to)
      }
    },
  }
}
