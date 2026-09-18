import { createContext, useContext, useState } from 'react'
import api from '../services/api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('admin')
    return raw ? JSON.parse(raw) : null
  })

  const login = async (username, password) => {
    const { data } = await api.post('/admin/login', { username, password })
    const u = { token: data.access_token, role: data.role, full_name: data.full_name }
    localStorage.setItem('admin', JSON.stringify(u))
    setUser(u)
  }

  const logout = () => { localStorage.removeItem('admin'); setUser(null) }

  return <AuthCtx.Provider value={{ user, login, logout }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)