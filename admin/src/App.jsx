import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Applications from './pages/Applications'
import ApplicationDetail from './pages/ApplicationDetail'
import Allocations from './pages/Allocations'
import Reports from './pages/Reports'

function Protected({ children }) {
  const { user, loading } = useAuth()
  // Wait for the server to confirm the session cookie before deciding.
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><AdminLayout /></Protected>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/applications/:id" element={<ApplicationDetail />} />
        <Route path="/allocations" element={<Allocations />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
    </Routes>
  )
}