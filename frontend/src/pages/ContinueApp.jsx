import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { accessApplication, uploadSignedForm, uploadDocument, downloadPdf } from '../services/api'
import AllocationNotice from '../components/AllocationNotice'

const STATUS_STYLES = {
  'Draft': 'bg-gray-100 text-gray-700 border-gray-300',
  'Submitted': 'bg-blue-50 text-blue-700 border-blue-200',
  'Awaiting Physical Verification': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Signed Form Uploaded': 'bg-purple-50 text-purple-700 border-purple-200',
  'Under Admin Review': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Correction Required': 'bg-amber-50 text-amber-800 border-amber-300',
  'Verified': 'bg-teal-50 text-teal-700 border-teal-200',
  'Approved': 'bg-green-50 text-green-700 border-green-200',
  'Rejected': 'bg-red-50 text-red-700 border-red-200',
  'Amount Allocated': 'bg-green-100 text-green-800 border-green-300',
  'Disbursed': 'bg-green-600 text-white border-green-700',
}

function SectionCard({ number, title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="flex items-start gap-4 border-b border-gray-100 px-6 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-brand text-sm font-bold text-brand">
          {number}
        </span>
        <div>
          <h3 className="font-serif text-lg font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  )
}

function Notice({ tone = 'info', title, children }) {
  const tones = {
    info: 'border-brand bg-brand/5 text-gray-800',
    success: 'border-green-500 bg-green-50 text-green-800',
    error: 'border-red-500 bg-red-50 text-red-800',
    warn: 'border-amber-500 bg-amber-50 text-amber-900',
  }
  return (
    <div className={`rounded-lg border-l-4 px-4 py-3 text-sm ${tones[tone]}`}>
      {title && <p className="font-bold mb-1">{title}</p>}
      {children}
    </div>
  )
}

export default function ContinueApp() {
  const [form, setForm] = useState({ application_number: '', access_code: '' })
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [file, setFile] = useState(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const load = async () => {
    setError(''); setMsg(''); setBusy(true)
    try {
      const { data } = await accessApplication(form.application_number, form.access_code)
      setData(data)
    } catch (e) { setError(e.response?.data?.detail || 'Access failed') }
    finally { setBusy(false) }
  }

  const uploadSigned = async () => {
    if (!file) return
    setBusy(true)
    try {
      const { data } = await uploadSignedForm(form.application_number, form.access_code, file)
      setMsg(data.message); setFile(null); load()
    } catch (e) { setError(e.response?.data?.detail || 'Upload failed'); setBusy(false) }
  }

  const uploadDoc = async (doc_type, f) => {
    if (!f) return
    try {
      await uploadDocument(form.application_number, form.access_code, doc_type, f)
      setMsg('Document uploaded.'); load()
    } catch (e) { setError(e.response?.data?.detail || 'Upload failed') }
  }

  const downloadForm = async () => {
    setError('')
    try { await downloadPdf(form.application_number, form.access_code) }
    catch (e) { setError('Could not download the PDF. Please try again.') }
  }

  /* ───────────────────────── Access screen ───────────────────────── */
  if (!data) return (
    <div className="mx-auto max-w-5xl grid gap-10 lg:grid-cols-5 items-start">
      <div className="lg:col-span-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          NG-CDF Turkana South
        </p>
        <h2 className="mt-3 font-serif text-3xl md:text-4xl font-bold leading-tight text-gray-900">
          Continue your application
        </h2>
        <div className="mt-4 h-1 w-14 rounded-full bg-brand" />
        <p className="mt-5 text-gray-600 leading-relaxed">
          Enter your Application Number and Access Code to continue filling your application,
          upload documents, or upload your signed and stamped form.
        </p>

        <ul className="mt-6 space-y-3 text-sm text-gray-600">
          <li className="flex gap-3"><span className="font-bold text-brand">1</span>Your Application Number looks like <span className="font-mono text-gray-800">TSB-2026-000001</span>.</li>
          <li className="flex gap-3"><span className="font-bold text-brand">2</span>Your Access Code was shown when you submitted your application.</li>
          <li className="flex gap-3"><span className="font-bold text-brand">3</span>Lost your details? Contact the NG-CDF office.</li>
        </ul>
      </div>

      <div className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-5">Access application</h3>

        {error && <div className="mb-5"><Notice tone="error">{error}</Notice></div>}

        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Application Number</label>
            <input
              className="input font-mono"
              placeholder="TSB-2026-000001"
              value={form.application_number}
              onChange={e => setForm({ ...form, application_number: e.target.value.toUpperCase() })}
              onKeyDown={e => e.key === 'Enter' && load()}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Access Code</label>
            <input
              className="input font-mono"
              placeholder="Enter your access code"
              value={form.access_code}
              onChange={e => setForm({ ...form, access_code: e.target.value.toUpperCase() })}
              onKeyDown={e => e.key === 'Enter' && load()}
            />
          </div>
          <button className="btn-primary w-full disabled:opacity-60" onClick={load} disabled={busy}>
            {busy ? 'Checking…' : 'Access Application'}
          </button>
        </div>
      </div>
    </div>
  )

  /* ───────────────────────── Application view ───────────────────────── */
  const signedDone = data.documents.some(d => d.is_signed_form)
  const canUploadSigned = ['Submitted', 'Awaiting Physical Verification'].includes(data.status)
  const canContinueEditing = ['Draft', 'Correction Required'].includes(data.status)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Summary header */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Application</p>
            <h2 className="mt-1 font-mono text-2xl md:text-3xl font-bold text-brand">{data.application_number}</h2>
          </div>
          <span className={`rounded-full border px-4 py-1.5 text-sm font-bold ${STATUS_STYLES[data.status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
            {data.status}
          </span>
        </div>

        <dl className="mt-6 grid gap-6 border-t border-gray-100 pt-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Student</dt>
            <dd className="mt-1 font-semibold text-gray-900">{data.applicant?.full_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Institution</dt>
            <dd className="mt-1 font-semibold text-gray-900">{data.applicant?.institution || '—'}</dd>
          </div>
        </dl>

        {(msg || error) && (
          <div className="mt-5 space-y-2">
            {msg && <Notice tone="success">{msg}</Notice>}
            {error && <Notice tone="error">{error}</Notice>}
          </div>
        )}
      </section>

      {/* Continue editing */}
      {canContinueEditing && (
        <div className="rounded-2xl border-l-4 border-brand bg-brand/5 p-6">
          <h3 className="font-serif text-lg font-bold text-gray-900">Your application is not complete</h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            Missing information or documents? You can go back into your application, fill in what's
            missing, and submit it once you're ready.
          </p>
          <button
            className="btn-primary mt-4"
            onClick={() => navigate('/apply', {
              state: {
                creds: { application_number: data.application_number, access_code: form.access_code },
                prefill: data
              }
            })}
          >
            Continue Filling This Application
          </button>
        </div>
      )}

      {/* Corrections */}
      {data.corrections?.length > 0 && (
        <div className="rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-6">
          <h3 className="font-serif text-lg font-bold text-amber-900">Correction required</h3>
          <ul className="mt-2 space-y-1.5">
            {data.corrections.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm text-amber-900">
                <span className="font-bold">{i + 1}.</span>
                <span>{c.message}</span>
              </li>
            ))}
          </ul>
          <label className="mt-4 inline-block cursor-pointer rounded-xl border border-amber-400 bg-white px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100">
            Upload corrected document
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => uploadDoc('correction', e.target.files[0])} />
          </label>
        </div>
      )}

      <AllocationNotice data={data} />

      {/* 1. Form */}
      <SectionCard
        number="1"
        title="Your application form"
        subtitle="Download, print, and take it for signing and stamping."
      >
        <button type="button" className="btn-outline !py-2 !px-5 text-sm" onClick={downloadForm}>
          Download / Print Application PDF
        </button>
        <p className="mt-4 text-sm leading-relaxed text-gray-600">
          Take the printed form to your <strong>Religious Leader</strong> and your{' '}
          <strong>Area Chief / Assistant Chief</strong> for signing and stamping.
        </p>
      </SectionCard>

      {/* 2. Signed form */}
      <SectionCard
        number="2"
        title="Signed and stamped form"
        subtitle="Your application is complete only after this is uploaded."
      >
        {signedDone ? (
          <Notice tone="success">
            <strong>Signed/stamped form uploaded.</strong> Your application is now{' '}
            <strong>{data.status}</strong>.
          </Notice>
        ) : canUploadSigned ? (
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center transition hover:border-brand hover:bg-brand/5">
              <span className="text-sm font-semibold text-gray-800">
                {file ? file.name : 'Click to choose the signed form'}
              </span>
              <span className="mt-1 text-xs text-gray-500">PDF, JPG, JPEG or PNG</span>
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setFile(e.target.files[0] || null)} />
            </label>
            <button className="btn-primary !py-2 disabled:opacity-50" disabled={!file || busy} onClick={uploadSigned}>
              {busy ? 'Uploading…' : 'Upload Signed Form'}
            </button>
          </div>
        ) : (
          <p className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
            Signed form upload will be enabled after you submit your application.
          </p>
        )}
      </SectionCard>

      {/* 3. History */}
      <SectionCard number="3" title="Status history" subtitle="Every change made to your application.">
        <ol className="relative ml-2 space-y-5 border-l-2 border-gray-200">
          {data.status_history.map((h, i) => (
            <li key={i} className="relative pl-6">
              <span className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${
                i === data.status_history.length - 1 ? 'bg-brand ring-2 ring-brand/30' : 'bg-gray-400'
              }`} />
              <p className="text-sm font-semibold text-gray-900">{h.new_status}</p>
              <p className="text-xs text-gray-500">{h.changed_by} · {h.created_at.slice(0, 16).replace('T', ' ')}</p>
            </li>
          ))}
        </ol>
      </SectionCard>

      <button
        className="text-sm font-semibold text-gray-600 hover:text-brand transition"
        onClick={() => { setData(null); setFile(null); setMsg(''); setError('') }}
      >
        ← Access a different application
      </button>
    </div>
  )
}