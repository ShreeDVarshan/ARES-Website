import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/auth'
import AdminDashboard from './dashboards/AdminDashboard'
import OperatorDashboard from './dashboards/OperatorDashboard'
import MaintenanceDashboard from './dashboards/MaintenanceDashboard'

export default function Dashboard() {
  const role = useAuthStore(s => s.user?.role)
  if (role === 'admin') return <AdminDashboard />
  if (role === 'maintenance') return <MaintenanceDashboard />
  return <OperatorDashboard />
}
