import { useState } from 'react'
import { accessApplication } from '../services/api'
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

// Progress tracker: which stage each status belongs to
const STAGES = ['Submitted', 'Signed form', 'Review', 'Approved', 'Allocated', 'Disbursed']
const STAGE_INDEX = {
  'Draft': -1,
  'Submitted': 0,
  'Awaiting Physical Verification': 0,
  'Signed Form Uploaded': 1,
  'Under Admin Review': 2,
  'Correction Required': 2,
  'Verified': 2,
  'Approved': 3,
  'Amount Allocated': 4,
  'Disbursed': 5,
}

function Spinner({ className = 'w-4 h-4' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-90" />
    </svg>
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

function ProgressTracker({ status }) {
  if (status === 'Rejected') {
    return (
      <Notice tone="error" title="Application not successful">
        This application was not approved. Contact the NG-CDF office if you need more information.
      </Notice>
    )
  }
  const current = STAGE_INDEX[status] ?? -1

  return (
    <ol className="grid grid-cols-6 gap-1">
      {STAGES.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={label} className="flex flex-col items-center text-center">
            <div className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${i === 0 ? 'bg-transparent' : i <= current ? 'bg-brand' : 'bg-gray-200'}`} />
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                done ? 'border-brand bg-brand text-white'
                  : active ? 'border-brand bg-white text-brand ring-4 ring-brand/15'
                  : 'border-gray-300 bg-white text-gray-400'
              }`}>
                {done ? '✓' : i + 1}
              </span>
              <span className={`h-0.5 flex-1 ${i === STAGES.length - 1 ? 'bg-transparent' : i < current ? 'bg-brand' : 'bg-gray-200'}`} />
            </div>
            <span className={`mt-2 text-[11px] leading-tight sm:text-xs ${
              active ? 'font-bold text-gray-900' : done ? 'font-medium text-gray-700' : 'text-gray-400'
            }`}>
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export default function Status() {
  const [form, setForm] = useState({ application_number: '', access_code: '' })
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const canSubmit = form.application_number.trim() && form.access_code.trim()

  const check = async () => {
    if (checking) return
    if (!canSubmit) {
      setError('Please enter both your Application Number and Access Code.')
      return
    }
    setError(''); setChecking(true)
    try {
      const { data } = await accessApplication(form.application_number.trim(), form.access_code.trim())
      setData(data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Application not found. Please check your details.')
      setData(null)
    } finally {
      setChecking(false)
    }
  }

  const history = data?.status_history || []

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      {/* ───────── Intro + form ───────── */}
      <div className="grid gap-10 lg:grid-cols-5 items-start">
        <div className="lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
            NG-CDF Turkana South
          </p>
          <h2 className="mt-3 font-serif text-3xl md:text-4xl font-bold leading-tight text-gray-900">
            Check application status
          </h2>
          <div className="mt-4 h-1 w-14 rounded-full bg-brand" />
          <p className="mt-5 text-gray-600 leading-relaxed">
            Enter your Application Number and Access Code to see where your bursary application
            is in the process.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-gray-600">
            <li className="flex gap-3"><span className="font-bold text-brand">1</span>Your Application Number looks like <span className="font-mono text-gray-800">TSB-2026-000001</span>.</li>
            <li className="flex gap-3"><span className="font-bold text-brand">2</span>Your Access Code was shown when you submitted your application.</li>
          </ul>
        </div>

        <div className="relative lg:col-span-3 overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-5">Find your application</h3>

          {error && <div className="mb-5"><Notice tone="error">{error}</Notice></div>}

          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Application Number</label>
              <input
                className="input font-mono disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="TSB-2026-000001"
                value={form.application_number}
                disabled={checking}
                onChange={e => setForm({ ...form, application_number: e.target.value.toUpperCase() })}
                onKeyDown={e => e.key === 'Enter' && check()}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Access Code</label>
              <input
                className="input font-mono disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter your access code"
                value={form.access_code}
                disabled={checking}
                onChange={e => setForm({ ...form, access_code: e.target.value.toUpperCase() })}
                onKeyDown={e => e.key === 'Enter' && check()}
              />
            </div>
            <button
              className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              onClick={check}
              disabled={checking}
            >
              {checking && <Spinner />}
              {checking ? 'Checking status…' : 'Check Status'}
            </button>
          </div>

          {checking && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/85 backdrop-blur-[1px]"
              role="status"
              aria-live="polite"
            >
              <Spinner className="w-10 h-10 text-brand" />
              <p className="mt-4 font-semibold text-gray-800">Checking your application…</p>
              <p className="mt-1 text-xs text-gray-500">Please wait a moment</p>
            </div>
          )}
        </div>
      </div>

      {/* ───────── Result ───────── */}
      {data && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Application</p>
                <h3 className="mt-1 font-mono text-2xl md:text-3xl font-bold text-brand">{data.application_number}</h3>
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

            {data.status === 'Draft' ? (
              <div className="mt-6">
                <Notice tone="warn" title="Not yet submitted">
                  This application is still a draft. Use “Continue / Upload Signed Form” to finish and submit it.
                </Notice>
              </div>
            ) : (
              <div className="mt-8 border-t border-gray-100 pt-6">
                <h4 className="mb-5 text-sm font-bold uppercase tracking-wide text-gray-500">Progress</h4>
                <ProgressTracker status={data.status} />
              </div>
            )}
          </section>

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
              <p className="mt-3 text-sm text-amber-900/90">
                Use “Continue / Upload Signed Form” on the home page to make the correction.
              </p>
            </div>
          )}

          {/* Allocation / disbursement notice */}
          <AllocationNotice data={data} />

          {history.length > 0 && (
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <header className="border-b border-gray-100 px-6 py-4">
                <h3 className="font-serif text-lg font-bold text-gray-900">Status history</h3>
                <p className="mt-0.5 text-sm text-gray-500">Every change made to your application.</p>
              </header>
              <div className="px-6 py-5">
                <ol className="relative ml-2 space-y-5 border-l-2 border-gray-200">
                  {history.map((h, i) => (
                    <li key={i} className="relative pl-6">
                      <span className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${
                        i === history.length - 1 ? 'bg-brand ring-2 ring-brand/30' : 'bg-gray-400'
                      }`} />
                      <p className="text-sm font-semibold text-gray-900">{h.new_status}</p>
                      <p className="text-xs text-gray-500">
                        {h.changed_by} · {(h.created_at || '').slice(0, 16).replace('T', ' ')}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}