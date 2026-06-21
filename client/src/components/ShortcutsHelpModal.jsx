import Dialog from './Dialog.jsx'
import { SHORTCUTS, keysFor } from '../shortcuts.js'

export default function ShortcutsHelpModal({ onClose }) {
  // Group in declaration order so the cheat sheet mirrors the source of truth.
  const groups = []
  for (const s of SHORTCUTS) {
    let group = groups.find((g) => g.name === s.group)
    if (!group) {
      group = { name: s.group, items: [] }
      groups.push(group)
    }
    group.items.push(s)
  }

  return (
    <Dialog className="shortcuts-help" label="Keyboard shortcuts" onClose={onClose}>
      <h3>Keyboard shortcuts</h3>
      {groups.map((group) => (
          <div key={group.name} className="shortcut-group">
            <div className="shortcut-group-head">{group.name}</div>
            {group.items.map((s) => (
              <div key={s.id} className="shortcut-row">
                <span className="shortcut-label">{s.label}</span>
                <span className="shortcut-keys">
                  {keysFor(s).map((tok, i) =>
                    tok === 'then' ? (
                      <span key={i} className="shortcut-sep">then</span>
                    ) : (
                      <kbd key={i}>{tok}</kbd>
                    ),
                  )}
                </span>
              </div>
            ))}
        </div>
      ))}
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>Close</button>
      </div>
    </Dialog>
  )
}
