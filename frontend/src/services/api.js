import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const startApplication = (data) => api.post('/applications', data)
export const accessApplication = (application_number, access_code) =>
  api.post('/applications/access', { application_number, access_code })
export const submitApplication = (application_number, access_code) => {
  const fd = new FormData(); fd.append('access_code', access_code)
  return api.post(`/applications/${application_number}/submit`, fd)
}
export const uploadDocument = (application_number, access_code, doc_type, file) => {
  const fd = new FormData()
  fd.append('access_code', access_code); fd.append('doc_type', doc_type); fd.append('file', file)
  return api.post(`/applications/${application_number}/documents`, fd)
}
export const uploadSignedForm = (application_number, access_code, file) => {
  const fd = new FormData()
  fd.append('access_code', access_code); fd.append('file', file)
  return api.post(`/applications/${application_number}/signed-form`, fd)
}
export const getPdfUrl = (application_number, access_code) =>
  `/api/applications/${application_number}/pdf?access_code=${access_code}`

export default api