import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api, { downloadFile } from '../services/api'

const fmt = n => `KSh ${Number(n || 0).toLocaleString()}`

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending_allocation', label: 'Pending Allocation' },
  { key: 'pending_disbursement', label: 'Pending Disbursement' },
  { key: 'disbursed', label: 'Disbursed' },
]

function InlineAllocate({ app, onDone }) {
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState(app.allocation?.amount || app.amount_requested || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = () => {
    setBusy(true); setError('')
    api.post(`/admin/applications/${app.id}/allocation`, { amount: Number(amount) })
      .then(() => { setEditing(false); onDone() })
      .catch(e => setError(e.response?.data?.detail || 'Failed'))
      .finally(() => setBusy(false))
  }

  if (!editing) {
    return (
      <button
        className="font-bold text-green-700 hover:underline"
        onClick={() => setEditing(true)}
      >
        {app.allocation ? fmt(app.allocation.amount) : <span className="text-gray-400 font-normal">Set amount</span>}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        autoFocus
        className="input !py-1 !px-2 !text-xs w-28"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && save()}
      />
      <button className="text-green-700 font-bold text-xs px-1" disabled={busy} onClick={save}>✓</button>
      <button className="text-gray-400 text-xs px-1" onClick={() => setEditing(false)}>✕</button>
      {error && <span className="text-red-600 text-xs ml-1">{error}</span>}
    </div>
  )
}

function DisburseButton({ app, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const disburse = () => {
    if (!window.confirm(`Mark ${app.application_number} as disbursed for ${fmt(app.allocation.amount)}?`)) return
    setBusy(true); setError('')
    api.post(`/admin/applications/${app.id}/disburse`, {})
      .then(onDone)
      .catch(e => setError(e.response?.data?.detail || 'Failed'))
      .finally(() => setBusy(false))
  }

  if (app.allocation?.is_disbursed) {
    return (
      <span className="badge bg-green-500 text-white whitespace-nowrap">
        ✓ {app.allocation.disbursed_at?.slice(0, 10)}
      </span>
    )
  }
  if (!app.allocation) {
    return <span className="text-xs text-gray-400">No allocation</span>
  }
  return (
    <div>
      <button
        className="btn-outline !py-1 !px-3 !text-xs whitespace-nowrap"
        disabled={busy}
        onClick={disburse}
      >
        {busy ? 'Disbursing…' : 'Mark Disbursed'}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  )
}

export default function Allocations() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [sortKey, setSortKey] = useState('amount_requested')
  const [sortDir, setSortDir] = useState('desc')
  const [msg, setMsg] = useState('')
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/admin/applications', { params: { size: 1000, sort: 'highest_request' } })
      .then(r => {
        const relevant = r.data.items.filter(a =>
          ['Approved', 'Amount Allocated', 'Disbursed'].includes(a.status))
        setItems(relevant)
      })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const summary = useMemo(() => {
    const totalReq = items.reduce((s, a) => s + Number(a.amount_requested || 0), 0)
    const totalAlloc = items.reduce((s, a) => s + Number(a.allocation?.amount || 0), 0)
    const totalDisbursed = items
      .filter(a => a.allocation?.is_disbursed)
      .reduce((s, a) => s + Number(a.allocation?.amount || 0), 0)
    const pendingAllocation = items.filter(a => !a.allocation).length
    const pendingDisbursement = items.filter(a => a.allocation && !a.allocation.is_disbursed).length
    const disbursedCount = items.filter(a => a.allocation?.is_disbursed).length
    const disbursementRate = totalAlloc > 0 ? Math.round((totalDisbursed / totalAlloc) * 100) : 0
    return { totalReq, totalAlloc, totalDisbursed, pendingAllocation, pendingDisbursement, disbursedCount, disbursementRate }
  }, [items])

  const tabFiltered = items.filter(a => {
    if (tab === 'pending_allocation') return !a.allocation
    if (tab === 'pending_disbursement') return a.allocation && !a.allocation.is_disbursed
    if (tab === 'disbursed') return a.allocation?.is_disbursed
    return true
  })

  const sorted = [...tabFiltered].sort((a, b) => {
    let va, vb
    if (sortKey === 'amount_requested') { va = Number(a.amount_requested || 0); vb = Number(b.amount_requested || 0) }
    else if (sortKey === 'allocated') { va = Number(a.allocation?.amount || 0); vb = Number(b.allocation?.amount || 0) }
    else if (sortKey === 'name') { va = a.applicant?.full_name || ''; vb = b.applicant?.full_name || '' }
    else { va = a.application_number; vb = b.application_number }
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))
    return sortDir === 'asc' ? cmp : -cmp
  })

  const toggleSort = key => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const runImport = () => {
    if (!importFile) return
    setImporting(true); setImportResult(null)
    const fd = new FormData()
    fd.append('file', importFile)
    api.post('/admin/import/allocations', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(r => { setImportResult(r.data); if (r.data.ok) load() })
      .catch(e => setImportResult({ ok: false, errors: [e.response?.data?.detail || 'Import failed'] }))
      .finally(() => setImporting(false))
  }

  const SortHeader = ({ label, sk }) => (
    <th
      className="px-4 py-3 text-left font-semibold cursor-pointer hover:text-brand select-none whitespace-nowrap"
      onClick={() => toggleSort(sk)}
    >
      {label}{sortKey === sk && (sortDir === 'asc' ? ' ▲' : ' ▼')}
    </th>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-brand">Bursary Allocations</h2>
        <div className="flex gap-2">
          <button className="btn-outline !py-1.5 !px-4 text-sm" onClick={() => downloadFile('/admin/export/allocations', 'Allocations.xlsx')}>
            Export Allocations
          </button>
          <button className="btn-outline !py-1.5 !px-4 text-sm" onClick={() => downloadFile('/admin/export/template', 'Allocation_Template.xlsx')}>
            Download Import Template
          </button>
        </div>
      </div>

      {msg && <div className="bg-green-50 border border-green-300 text-green-800 rounded-lg p-3 text-sm">{msg}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-xs text-gray-500">Total Requested</p>
          <p className="text-lg font-bold text-gray-800">{fmt(summary.totalReq)}</p>
          <p className="text-xs text-gray-400">{items.length} application(s)</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Total Allocated</p>
          <p className="text-lg font-bold text-green-700">{fmt(summary.totalAlloc)}</p>
          <p className="text-xs text-gray-400">{summary.pendingAllocation} awaiting allocation</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Total Disbursed</p>
          <p className="text-lg font-bold text-green-800">{fmt(summary.totalDisbursed)}</p>
          <p className="text-xs text-gray-400">{summary.pendingDisbursement} awaiting disbursement</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Disbursement Rate</p>
          <p className="text-lg font-bold text-brand">{summary.disbursementRate}%</p>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${summary.disbursementRate}%` }} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(t => {
          const count = t.key === 'all' ? items.length
            : t.key === 'pending_allocation' ? summary.pendingAllocation
            : t.key === 'pending_disbursement' ? summary.pendingDisbursement
            : summary.disbursedCount
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                tab === t.key ? 'border-brand text-brand' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label} <span className="text-xs opacity-60">({count})</span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <SortHeader label="App Number" sk="app_number" />
              <SortHeader label="Student" sk="name" />
              <th className="px-4 py-3 text-left font-semibold">Institution</th>
              <SortHeader label="Requested (KSh)" sk="amount_requested" />
              <SortHeader label="Allocated (KSh)" sk="allocated" />
              <th className="px-4 py-3 text-left font-semibold">Disbursement</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(a => (
              <tr key={a.application_number} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{a.application_number}</td>
                <td className="px-4 py-3 font-medium">{a.applicant?.full_name}</td>
                <td className="px-4 py-3">{a.applicant?.institution}</td>
                <td className="px-4 py-3">{fmt(a.amount_requested)}</td>
                <td className="px-4 py-3">
                  <InlineAllocate app={a} onDone={() => { setMsg('Allocation updated'); load() }} />
                </td>
                <td className="px-4 py-3">
                  <DisburseButton app={a} onDone={() => { setMsg('Marked as disbursed'); load() }} />
                </td>
                <td className="px-4 py-3"><span className="badge bg-green-100 text-green-700">{a.status}</span></td>
                <td className="px-4 py-3">
                  <Link to={`/applications/${a.id}`} className="text-brand font-semibold hover:underline text-xs">Details</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && sorted.length === 0 && (
          <p className="text-center text-gray-500 py-10">No applications in this category.</p>
        )}
        {loading && <p className="text-center text-gray-500 py-10">Loading…</p>}
      </div>

      {/* Bulk import */}
      <div className="card">
        <h3 className="font-bold text-brand mb-3">Bulk Import Allocations from Excel</h3>
        <p className="text-xs text-gray-500 mb-3">
          Download the template above, fill in amounts, then upload it here to allocate many applications at once.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".xlsx"
            onChange={e => setImportFile(e.target.files[0])}
            className="text-sm"
          />
          <button
            className="btn-primary !py-1.5 !px-4 text-sm"
            disabled={!importFile || importing}
            onClick={runImport}
          >
            {importing ? 'Importing…' : 'Import'}
          </button>
        </div>
        {importResult && (
          <div className={`mt-3 text-sm rounded-lg p-3 ${importResult.ok ? 'bg-green-50 text-green-800 border border-green-300' : 'bg-red-50 text-red-700 border border-red-300'}`}>
            {importResult.ok
              ? <p>✓ Imported {importResult.imported} row(s).{importResult.errors?.length > 0 && ` ${importResult.errors.length} row(s) had issues.`}</p>
              : <p>Import failed.</p>}
            {importResult.errors?.length > 0 && (
              <ul className="list-disc list-inside mt-1 text-xs">
                {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}