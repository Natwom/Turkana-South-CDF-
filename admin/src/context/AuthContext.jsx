import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Ask the server who we are (the cookie is sent automatically).
  useEffect(() => {
    let active = true
    api.get('/admin/me')
      .then(({ data }) => active && setUser({ username: data.username, role: data.role, full_name: data.full_name }))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const login = async (username, password) => {
    const { data } = await api.post('/admin/login', { username, password })
    setUser({ username, role: data.role, full_name: data.full_name })
  }

  const logout = async () => {
    try { await api.post('/admin/logout') } catch { /* ignore */ }
    setUser(null)
  }

  return <AuthCtx.Provider value={{ user, loading, login, logout }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)