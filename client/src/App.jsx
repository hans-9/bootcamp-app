import { useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate, Link, NavLink, useLocation } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage.jsx'
import TestCasesPage from './pages/TestCasesPage.jsx'
import TestCaseImportPage from './pages/TestCaseImportPage.jsx'
import TestSuitesPage from './pages/TestSuitesPage.jsx'
import SuiteDetailPage from './pages/SuiteDetailPage.jsx'
import BugsPage from './pages/BugsPage.jsx'
import BugDetailPage from './pages/BugDetailPage.jsx'
import TestRunsPage from './pages/TestRunsPage.jsx'
import TestRunDetailPage from './pages/TestRunDetailPage.jsx'
import FlakyTestsPage from './pages/FlakyTestsPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import ReportDetailPage from './pages/ReportDetailPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import { ShortcutsProvider, useShortcuts } from './components/KeyboardShortcuts.jsx'
import { MOD_LABEL } from './shortcuts.js'

function HeaderTools() {
  const { openSearch, openHelp } = useShortcuts()
  return (
    <div className="header-tools">
      <button type="button" className="header-search" onClick={openSearch}>
        <span>Search…</span>
        <span className="header-search-keys">
          <kbd>{MOD_LABEL}</kbd>
          <kbd>K</kbd>
        </span>
      </button>
      <button
        type="button"
        className="icon-btn"
        onClick={openHelp}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        ?
      </button>
    </div>
  )
}

function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const { modalOpen } = useShortcuts()
  const navRef = useRef(null)
  const toggleRef = useRef(null)

  // The listeners mount with the open menu; this ref keeps modal state current
  // for them without re-running the effect (which would re-trigger dismissal).
  const modalOpenRef = useRef(modalOpen)
  modalOpenRef.current = modalOpen

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Above the mobile breakpoint the panel and toggle are gone, so a lingering
  // open state would re-show the menu on the next shrink. Clear it on the way up.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)')
    const onChange = (e) => {
      if (e.matches) setMenuOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const node = navRef.current
    const toggle = toggleRef.current
    const links = () => Array.from(node.querySelectorAll('a[href]'))

    ;(links()[0] || node).focus()

    const onKeyDown = (e) => {
      // Defer Escape to the modal layer when a shortcuts modal sits on top.
      if (e.key === 'Escape' && !modalOpenRef.current) {
        setMenuOpen(false)
        return
      }
      if (e.key === 'Tab') {
        const els = links()
        if (els.length === 0) return
        const first = els[0]
        const last = els[els.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    const onPointerDown = (e) => {
      if (node.contains(e.target) || (toggle && toggle.contains(e.target))) return
      setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
      if (toggle) toggle.focus()
    }
  }, [menuOpen])

  return (
    <header className="app-header">
      <h1>
        <Link to="/test-cases" style={{ color: 'inherit', textDecoration: 'none' }}>
          Bootcamp App
        </Link>
      </h1>
      <button
        ref={toggleRef}
        type="button"
        className="nav-toggle"
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        aria-controls="primary-nav"
        aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
      >
        {menuOpen ? '✕' : '☰'}
      </button>
      <nav ref={navRef} id="primary-nav" className={menuOpen ? 'app-nav open' : 'app-nav'}>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/test-cases">Test Cases</NavLink>
        <NavLink to="/test-suites">Test Suites</NavLink>
        <NavLink to="/bugs">Bugs</NavLink>
        <NavLink to="/test-runs">Test Runs</NavLink>
        <NavLink to="/flaky-tests">Flaky Tests</NavLink>
        <NavLink to="/reports">Reports</NavLink>
        <NavLink to="/settings">Settings</NavLink>
      </nav>
      <HeaderTools />
    </header>
  )
}

export default function App() {
  return (
    <ShortcutsProvider>
      <SiteHeader />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/test-cases" element={<TestCasesPage />} />
        <Route path="/test-cases/import" element={<TestCaseImportPage />} />
        <Route path="/test-suites" element={<TestSuitesPage />} />
        <Route path="/test-suites/:id" element={<SuiteDetailPage />} />
        <Route path="/bugs" element={<BugsPage />} />
        <Route path="/bugs/:id" element={<BugDetailPage />} />
        <Route path="/test-runs" element={<TestRunsPage />} />
        <Route path="/test-runs/:id" element={<TestRunDetailPage />} />
        <Route path="/flaky-tests" element={<FlakyTestsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:id" element={<ReportDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </ShortcutsProvider>
  )
}
