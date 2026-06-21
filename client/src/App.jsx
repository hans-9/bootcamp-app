import { useEffect, useState } from 'react'
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

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <header className="app-header">
      <h1>
        <Link to="/test-cases" style={{ color: 'inherit', textDecoration: 'none' }}>
          Bootcamp App
        </Link>
      </h1>
      <button
        type="button"
        className="nav-toggle"
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        aria-controls="primary-nav"
        aria-label="Toggle navigation"
      >
        {menuOpen ? '✕' : '☰'}
      </button>
      <nav id="primary-nav" className={menuOpen ? 'app-nav open' : 'app-nav'}>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/test-cases">Test Cases</NavLink>
        <NavLink to="/test-suites">Test Suites</NavLink>
        <NavLink to="/bugs">Bugs</NavLink>
        <NavLink to="/test-runs">Test Runs</NavLink>
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
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:id" element={<ReportDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </ShortcutsProvider>
  )
}
