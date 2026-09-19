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

export default api