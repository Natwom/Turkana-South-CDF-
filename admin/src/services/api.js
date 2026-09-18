import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

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