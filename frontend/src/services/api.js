import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({ baseURL: API_URL, timeout: 60000 })

export const startApplication = (data) => api.post('/applications', data)

// Access code is sent in a header, never in the URL.
export const updateApplication = (application_number, access_code, data) =>
  api.put(`/applications/${encodeURIComponent(application_number)}`, data,
    { headers: { 'X-Access-Code': access_code } })

export const accessApplication = (application_number, access_code) =>
  api.post('/applications/access', { application_number, access_code })

export const submitApplication = (application_number, access_code) => {
  const fd = new FormData(); fd.append('access_code', access_code)
  return api.post(`/applications/${encodeURIComponent(application_number)}/submit`, fd)
}

export const uploadDocument = (application_number, access_code, doc_type, file) => {
  const fd = new FormData()
  fd.append('access_code', access_code); fd.append('doc_type', doc_type); fd.append('file', file)
  return api.post(`/applications/${encodeURIComponent(application_number)}/documents`, fd)
}

export const uploadSignedForm = (application_number, access_code, file) => {
  const fd = new FormData()
  fd.append('access_code', access_code); fd.append('file', file)
  return api.post(`/applications/${encodeURIComponent(application_number)}/signed-form`, fd)
}

// Replaces getPdfUrl(). The code goes in the POST body; the PDF is fetched as a blob.
export const downloadPdf = async (application_number, access_code) => {
  const res = await api.post(
    `/applications/${encodeURIComponent(application_number)}/pdf`,
    { application_number, access_code },
    { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${application_number}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export default api