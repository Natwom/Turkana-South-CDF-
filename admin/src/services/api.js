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

// With responseType 'blob', error bodies also arrive as a Blob. Convert them back
// into { detail: '...' } so callers can show the real reason.
const readBlobError = async (err) => {
  const res = err.response
  if (!res) {
    err.response = { data: { detail: 'Cannot reach the server. Check your connection.' } }
    return err
  }
  if (res.data instanceof Blob) {
    let detail = ''
    try {
      const text = await res.data.text()
      try {
        const parsed = JSON.parse(text)
        detail = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail)
      } catch {
        detail = text.slice(0, 200)
      }
    } catch { /* ignore */ }
    res.data = { detail: `${detail || 'Server error'} (HTTP ${res.status})` }
  }
  return err
}

export const downloadFile = async (path, filename) => {
  let res
  try {
    res = await api.get(path, { responseType: 'blob' })
  } catch (err) {
    throw await readBlobError(err)
  }

  if (!res.data || res.data.size === 0) {
    const err = new Error('Empty file received from server.')
    err.response = { data: { detail: 'Empty file received from server.' } }
    throw err
  }

  const url = window.URL.createObjectURL(new Blob([res.data], { type: res.data.type }))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename || 'download')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export default api