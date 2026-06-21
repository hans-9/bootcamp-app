import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Accessible modal shell: labels itself as a dialog, traps Tab focus inside,
// moves focus in on open, and restores it to the opener on close. Escape is
// handled globally by the shortcuts key handler.
export default function Dialog({ className = '', label, onClose, children }) {
  const ref = useRef(null)

  useEffect(() => {
    const opener = document.activeElement
    const node = ref.current
    const focusables = () => Array.from(node.querySelectorAll(FOCUSABLE))

    const first = focusables()[0]
    ;(first || node).focus()

    function onKeyDown(e) {
      if (e.key !== 'Tab') return
      const els = focusables()
      if (els.length === 0) {
        e.preventDefault()
        return
      }
      const firstEl = els[0]
      const lastEl = els[els.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    node.addEventListener('keydown', onKeyDown)
    return () => {
      node.removeEventListener('keydown', onKeyDown)
      if (opener && typeof opener.focus === 'function') opener.focus()
    }
  }, [])

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div
        ref={ref}
        className={`modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
