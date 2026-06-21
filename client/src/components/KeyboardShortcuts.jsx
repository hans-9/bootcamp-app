import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GOTO } from '../shortcuts.js'
import QuickSearchModal from './QuickSearchModal.jsx'
import ShortcutsHelpModal from './ShortcutsHelpModal.jsx'

// Lets visible UI (the header buttons) open the same modals the keys do.
const ShortcutsContext = createContext(null)
export const useShortcuts = () => useContext(ShortcutsContext)

function isEditable(el) {
  if (!el) return false
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  )
}

export function ShortcutsProvider({ children }) {
  const navigate = useNavigate()
  const [modal, setModal] = useState(null) // 'search' | 'help' | null

  // The keydown listener mounts once; this ref gives it the current modal state.
  const modalRef = useRef(modal)
  modalRef.current = modal

  useEffect(() => {
    let pendingG = false
    let gTimer = null
    const clearG = () => {
      pendingG = false
      if (gTimer) {
        clearTimeout(gTimer)
        gTimer = null
      }
    }

    function onKeyDown(e) {
      const editable = isEditable(document.activeElement)

      // Quick search. A modifier combo, so it's safe to allow even while typing.
      // We deliberately override the browser's own Ctrl/Cmd+K binding app-wide.
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        clearG()
        setModal('search')
        return
      }

      // Escape closes our own modals, even from the search input.
      if (e.key === 'Escape') {
        clearG()
        setModal((m) => (m ? null : m))
        return
      }

      // Everything below is a bare-key shortcut: never fire it while the user is
      // typing or holding a modifier — this is the classic shortcut-in-a-field bug.
      // Also suppress them while a modal is open, so a click inside it can't leave
      // a bare key (e.g. ?) swapping one modal for another.
      if (editable || e.metaKey || e.ctrlKey || e.altKey || modalRef.current) {
        clearG()
        return
      }

      if (e.key === '?') {
        e.preventDefault()
        clearG()
        setModal((m) => (m === 'help' ? null : 'help'))
        return
      }

      // "G then X" jump navigation: arm on G, resolve on the next key.
      if (pendingG) {
        const path = GOTO[e.key.toLowerCase()]
        clearG()
        if (path) {
          e.preventDefault()
          setModal(null)
          navigate(path)
        }
        return
      }
      if (e.key.toLowerCase() === 'g') {
        pendingG = true
        gTimer = setTimeout(clearG, 1500)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      clearG()
    }
  }, [navigate])

  const close = () => setModal(null)

  return (
    <ShortcutsContext.Provider
      value={{ openSearch: () => setModal('search'), openHelp: () => setModal('help') }}
    >
      {children}
      {modal === 'search' && <QuickSearchModal onClose={close} />}
      {modal === 'help' && <ShortcutsHelpModal onClose={close} />}
    </ShortcutsContext.Provider>
  )
}
