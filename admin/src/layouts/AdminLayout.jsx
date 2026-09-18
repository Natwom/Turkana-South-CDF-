import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 max-w-[1400px] relative">
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.03] bg-center bg-no-repeat bg-contain"
          style={{ backgroundImage: "url('/assets/ngcdf-logo.png')" }}
        />
        <div className="relative z-10"><Outlet /></div>
      </main>
    </div>
  )
}