import { useState } from 'react'
import { accessApplication } from '../services/api'
import AllocationNotice from '../components/AllocationNotice'

export default function Status() {
  const [form, setForm] = useState({ application_number: '', access_code: '' })
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const check = async () => {
    setError('')
    try {
      const { data } = await accessApplication(form.application_number, form.access_code)
      setData(data)
    } catch (e) { setError(e.response?.data?.detail || 'Not found'); setData(null) }
  }

  return (
    <div className="card max-w-md mx-auto">
      <h2 className="text-xl font-bold text-brand mb-4">Check Application Status</h2>
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <div className="space-y-4">
        <input className="input" placeholder="Application Number" value={form.application_number}
          onChange={e => setForm({ ...form, application_number: e.target.value.toUpperCase() })} />
        <input className="input" placeholder="Access Code" value={form.access_code}
          onChange={e => setForm({ ...form, access_code: e.target.value.toUpperCase() })} />
        <button className="btn-primary w-full" onClick={check}>Check Status</button>
      </div>
      {data && (
        <div className="mt-6 border-t pt-4 text-sm space-y-2">
          <p><strong>{data.application_number}</strong> — {data.applicant?.full_name}</p>
          <p>Status: <span className="px-3 py-1 rounded-full bg-brand-light text-brand font-bold">{data.status}</span></p>
          {data.corrections?.length > 0 && <p className="text-amber-700">⚠ {data.corrections[0].message}</p>}
          {/* ── NEW: allocation / disbursement notice ── */}
          <AllocationNotice data={data} />
        </div>
      )}
    </div>
  )
}