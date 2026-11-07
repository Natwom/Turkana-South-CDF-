import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

// The session lives in an httpOnly cookie, so JavaScript never sees the token.
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
})

api.interceptors.response.use(r => r, err => {
  const url = err.config?.url || ''
  const isAuthCall = url.includes('/admin/login') || url.includes('/admin/me')
  if (err.response?.status === 401 && !isAuthCall && location.pathname !== '/login') {
    location.href = '/login'
  }
  return Promise.reject(err)
})

export const downloadFile = async (path, filename) => {
  const res = await api.get(path, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([res.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename || 'download')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export default api