import { Routes, Route, Navigate, Link, NavLink } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage.jsx'
import TestCasesPage from './pages/TestCasesPage.jsx'
import TestSuitesPage from './pages/TestSuitesPage.jsx'
import SuiteDetailPage from './pages/SuiteDetailPage.jsx'
import BugsPage from './pages/BugsPage.jsx'
import BugDetailPage from './pages/BugDetailPage.jsx'
import TestRunsPage from './pages/TestRunsPage.jsx'
import TestRunDetailPage from './pages/TestRunDetailPage.jsx'

export default function App() {
  return (
    <>
      <header className="app-header">
        <h1>
          <Link to="/test-cases" style={{ color: 'inherit', textDecoration: 'none' }}>
            Bootcamp App
          </Link>
        </h1>
        <nav className="app-nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/test-cases">Test Cases</NavLink>
          <NavLink to="/test-suites">Test Suites</NavLink>
          <NavLink to="/bugs">Bugs</NavLink>
          <NavLink to="/test-runs">Test Runs</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/test-cases" element={<TestCasesPage />} />
        <Route path="/test-suites" element={<TestSuitesPage />} />
        <Route path="/test-suites/:id" element={<SuiteDetailPage />} />
        <Route path="/bugs" element={<BugsPage />} />
        <Route path="/bugs/:id" element={<BugDetailPage />} />
        <Route path="/test-runs" element={<TestRunsPage />} />
        <Route path="/test-runs/:id" element={<TestRunDetailPage />} />
      </Routes>
    </>
  )
}
