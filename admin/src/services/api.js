import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use(cfg => {
  const raw = localStorage.getItem('admin')
  if (raw) cfg.headers.Authorization = `Bearer ${JSON.parse(raw).token}`
  return cfg
})

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) { localStorage.removeItem('admin'); location.href = '/login' }
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