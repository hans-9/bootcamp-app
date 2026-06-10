import { Routes, Route, Navigate, Link } from 'react-router-dom'
import TestCasesPage from './pages/TestCasesPage.jsx'

export default function App() {
  return (
    <>
      <header className="app-header">
        <h1>
          <Link to="/test-cases" style={{ color: 'inherit', textDecoration: 'none' }}>
            Bootcamp App
          </Link>
        </h1>
      </header>
      <Routes>
        <Route path="/" element={<Navigate to="/test-cases" replace />} />
        <Route path="/test-cases" element={<TestCasesPage />} />
      </Routes>
    </>
  )
}
