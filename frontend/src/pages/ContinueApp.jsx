import { useState } from 'react'
import { accessApplication, uploadSignedForm, uploadDocument, getPdfUrl } from '../services/api'
import AllocationNotice from '../components/AllocationNotice'

export default function ContinueApp() {
  const [form, setForm] = useState({ application_number: '', access_code: '' })
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [file, setFile] = useState(null)
  const [msg, setMsg] = useState('')

  const load = async () => {
    setError(''); setMsg('')
    try {
      const { data } = await accessApplication(form.application_number, form.access_code)
      setData(data)
    } catch (e) { setError(e.response?.data?.detail || 'Access failed') }
  }

  const uploadSigned = async () => {
    if (!file) return
    try {
      const { data } = await uploadSignedForm(form.application_number, form.access_code, file)
      setMsg(data.message); setFile(null); load()
    } catch (e) { setError(e.response?.data?.detail || 'Upload failed') }
  }

  const uploadDoc = async (doc_type, f) => {
    try {
      await uploadDocument(form.application_number, form.access_code, doc_type, f)
      setMsg('Document uploaded.'); load()
    } catch (e) { setError(e.response?.data?.detail || 'Upload failed') }
  }

  if (!data) return (
    <div className="card max-w-md mx-auto">
      <h2 className="text-xl font-bold text-brand mb-4">Continue Application</h2>
      <p className="text-sm text-gray-600 mb-4">Enter your Application Number and Access Code to continue, upload documents, or upload your signed/stamped form.</p>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <div className="space-y-4">
        <input className="input" placeholder="Application Number (e.g. TSB-2026-000001)"
          value={form.application_number} onChange={e => setForm({ ...form, application_number: e.target.value.toUpperCase() })} />
        <input className="input" placeholder="Access Code"
          value={form.access_code} onChange={e => setForm({ ...form, access_code: e.target.value.toUpperCase() })} />
        <button className="btn-primary w-full" onClick={load}>Access Application</button>
      </div>
    </div>
  )

  const signedDone = data.documents.some(d => d.is_signed_form)
  const canUploadSigned = ['Submitted', 'Awaiting Physical Verification'].includes(data.status)

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-brand">{data.application_number}</h2>
            <p className="text-sm text-gray-600">{data.applicant?.full_name} — {data.applicant?.institution}</p>
          </div>
          <span className="px-4 py-2 rounded-full text-sm font-bold bg-brand-light text-brand">{data.status}</span>
        </div>
        {msg && <p className="text-green-700 text-sm mt-3">{msg}</p>}
        {data.corrections?.length > 0 && (
          <div className="mt-4 bg-amber-50 border border-amber-300 rounded-lg p-4">
            <p className="font-bold text-amber-800 text-sm mb-1">Correction required:</p>
            {data.corrections.map((c, i) => <p key={i} className="text-sm text-amber-800">• {c.message}</p>)}
            <label className="btn-outline !py-1.5 !px-4 text-sm inline-block mt-3 cursor-pointer">
              Upload corrected document
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => uploadDoc('correction', e.target.files[0])} />
            </label>
          </div>
        )}
      </div>

      {/* ── NEW: allocation / disbursement notice ── */}
      <AllocationNotice data={data} />

      <div className="card">
        <h3 className="font-bold text-brand mb-3">Your form</h3>
        <a className="btn-outline !py-2 !px-4 text-sm" target="_blank" rel="noreferrer"
          href={getPdfUrl(form.application_number, form.access_code)}>
          Download / Print Application PDF
        </a>
        <p className="text-sm text-gray-600 mt-3">Print this form and take it to your Religious Leader and Area Chief/Assistant Chief for signing and stamping.</p>
      </div>

      <div className="card">
        <h3 className="font-bold text-brand mb-3">Signed / stamped form</h3>
        {signedDone ? (
          <p className="text-green-700 font-semibold text-sm">✓ Signed/stamped form uploaded. Your application is now {data.status}.</p>
        ) : canUploadSigned ? (
          <div className="flex items-center gap-4">
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0])}
              className="text-sm" />
            <button className="btn-primary !py-2" disabled={!file} onClick={uploadSigned}>Upload Signed Form</button>
          </div>
        ) : (
          <p className="text-sm text-gray-600">Signed form upload will be enabled after you submit your application.</p>
        )}
      </div>

      <div className="card">
        <h3 className="font-bold text-brand mb-3">Status history</h3>
        <ol className="text-sm space-y-1">
          {data.status_history.map((h, i) => (
            <li key={i}><strong>{h.new_status}</strong> <span className="text-gray-500">— {h.changed_by}, {h.created_at.slice(0, 16)}</span></li>
          ))}
        </ol>
      </div>

      <button className="btn-outline text-sm" onClick={() => setData(null)}>← Access a different application</button>
    </div>
  )
}