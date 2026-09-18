import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  ['/', 'Dashboard'], ['/applications', 'Applications'], ['/allocations', 'Allocations'], ['/reports', 'Excel & Reports']
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  return (
    <aside className="w-60 bg-brand-dark text-white min-h-screen flex flex-col">
      <div className="p-5 border-b border-white/10 flex items-center gap-3">
        <img src="/assets/ngcdf-logo.png" alt="NG-CDF Logo" className="h-10 w-auto" />
        <div>
          <p className="text-xs uppercase tracking-widest opacity-70">NG-CDF Turkana South</p>
          <h1 className="font-bold">Bursary Admin</h1>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `block px-4 py-2.5 rounded-lg text-sm font-medium transition
              ${isActive ? 'bg-white/20' : 'hover:bg-white/10 opacity-80'}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10 text-sm">
        <p className="font-semibold">{user?.full_name}</p>
        <p className="text-xs opacity-70 mb-3">{user?.role}</p>
        <button onClick={logout} className="w-full bg-white/10 hover:bg-white/20 rounded-lg py-2 text-sm">Logout</button>
      </div>
    </aside>
  )
}