import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Machines from './pages/Machines'
import Alerts from './pages/Alerts'
import Blueprint from './pages/Blueprint'
import Analytics from './pages/Analytics'
import Maintenance from './pages/Maintenance'
import Verification from './pages/Verification'
import Reports from './pages/Reports'
import Devices from './pages/Devices'
import DataSources from './pages/DataSources'
import Settings from './pages/Settings'
import Recommendations from './pages/Recommendations'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore(s => s.isAuthenticated)
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const role = useAuthStore(s => s.user?.role)
  return role === 'admin' ? <>{children}</> : <Navigate to="/dashboard" replace />
}

export default function App() {
  const isAuth = useAuthStore(s => s.isAuthenticated)
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuth ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/blueprint" element={<Blueprint />} />
          <Route path="/machines" element={<Machines />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/verification" element={<Verification />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/devices" element={<Devices />} />
          <Route path="/data-sources" element={<DataSources />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/users" element={<RequireAdmin><Settings /></RequireAdmin>} />
          <Route path="/audit-log" element={<RequireAdmin>
            <div className="p-6"><h1 className="text-2xl font-black text-white">Audit Log</h1><p className="text-white/40 mt-2">Coming in next release.</p></div>
          </RequireAdmin>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
