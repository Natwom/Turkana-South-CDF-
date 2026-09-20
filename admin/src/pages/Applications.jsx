import { useEffect, useState, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api, { downloadFile } from '../services/api'

const STATUS_COLORS = {
  'Draft': 'bg-gray-200 text-gray-700', 'Submitted': 'bg-blue-100 text-blue-700',
  'Awaiting Physical Verification': 'bg-indigo-100 text-indigo-700',
  'Signed Form Uploaded': 'bg-purple-100 text-purple-700',
  'Under Admin Review': 'bg-cyan-100 text-cyan-700',
  'Correction Required': 'bg-amber-100 text-amber-800', 'Verified': 'bg-teal-100 text-teal-700',
  'Approved': 'bg-green-100 text-green-700', 'Rejected': 'bg-red-100 text-red-700',
  'Amount Allocated': 'bg-green-200 text-green-900',
  'Disbursed': 'bg-green-500 text-white'
}

const COLUMNS = [
  { key: 'application_number', label: 'App Number', type: 'text', get: a => a.application_number },
  { key: 'full_name', label: 'Student', type: 'text', get: a => a.applicant?.full_name || '' },
  { key: 'institution', label: 'Institution', type: 'text', get: a => a.applicant?.institution || '' },
  { key: 'ward', label: 'Ward', type: 'list', get: a => a.applicant?.ward || '' },
  { key: 'amount_requested', label: 'Requested (KSh)', type: 'numeric', get: a => Number(a.amount_requested || 0) },
  { key: 'status', label: 'Status', type: 'list', get: a => a.status || '' },
  { key: 'date', label: 'Date', type: 'text', get: a => a.status_history?.[0]?.created_at?.slice(0, 10) || '' },
]

const PAGE_SIZE = 25

function ColumnFilterButton({ col, values, active, onChange }) {
  const [open, setOpen] = useState(false)
  const [textVal, setTextVal] = useState(active.text || '')
  const [checkedVals, setCheckedVals] = useState(active.list || new Set(values))
  const ref = useRef(null)

  useEffect(() => {
    const onClickOutside = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => { setCheckedVals(active.list || new Set(values)) }, [values.join('|')])

  const isFiltered = col.type === 'list'
    ? checkedVals.size !== values.length
    : !!textVal

  const apply = () => {
    if (col.type === 'list') onChange(col.key, { list: checkedVals })
    else onChange(col.key, { text: textVal })
    setOpen(false)
  }
  const clear = () => {
    if (col.type === 'list') { setCheckedVals(new Set(values)); onChange(col.key, null) }
    else { setTextVal(''); onChange(col.key, null) }
    setOpen(false)
  }

  return (
    <span className="relative inline-block ml-1" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`text-xs px-1 rounded ${isFiltered ? 'text-brand font-bold' : 'text-gray-400'} hover:bg-gray-200`}
        title="Filter"
      >▾</button>
      {open && (
        <div className="absolute z-20 top-6 left-0 bg-white border border-gray-300 rounded-lg shadow-xl w-56 p-3 text-xs">
          {col.type === 'list' ? (
            <>
              <div className="flex justify-between mb-2">
                <button className="text-brand font-semibold" onClick={() => setCheckedVals(new Set(values))}>Select All</button>
                <button className="text-gray-500" onClick={() => setCheckedVals(new Set())}>Clear</button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 border-t border-b py-2">
                {values.map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={checkedVals.has(v)}
                      onChange={e => {
                        const next = new Set(checkedVals)
                        e.target.checked ? next.add(v) : next.delete(v)
                        setCheckedVals(next)
                      }} />
                    <span className="truncate">{v || '(blank)'}</span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <input
              autoFocus
              className="input !py-1.5 !text-xs"
              placeholder={`Search ${col.label}…`}
              value={textVal}
              onChange={e => setTextVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && apply()}
            />
          )}
          <div className="flex justify-between mt-3 pt-2 border-t">
            <button className="text-gray-500" onClick={clear}>Clear filter</button>
            <button className="text-brand font-semibold" onClick={apply}>Apply</button>
          </div>
        </div>
      )}
    </span>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-40 bg-gray-200 rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
      </div>
      <div className="h-96 bg-gray-200 rounded-2xl" />
    </div>
  )
}

export default function Applications() {
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [colFilters, setColFilters] = useState({})
  const [quickSearch, setQuickSearch] = useState('')
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)

  const load = () => {
    setLoading(true)
    api.get('/admin/applications', { params: { size: 1000 } })
      .then(r => setAllItems(r.data.items || []))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const columnValues = key => {
    const col = COLUMNS.find(c => c.key === key)
    return [...new Set(allItems.map(col.get))].sort()
  }

  const setColFilter = (key, value) => {
    setColFilters(prev => {
      const next = { ...prev }
      if (value === null) delete next[key]
      else next[key] = value
      return next
    })
    setPage(1)
  }

  const summary = useMemo(() => {
    const total = allItems.length
    const totalRequested = allItems.reduce((s, a) => s + Number(a.amount_requested || 0), 0)
    const needsReview = allItems.filter(a =>
      ['Submitted', 'Awaiting Physical Verification', 'Signed Form Uploaded', 'Under Admin Review'].includes(a.status)
    ).length
    const approved = allItems.filter(a =>
      ['Approved', 'Amount Allocated', 'Disbursed'].includes(a.status)
    ).length
    return { total, totalRequested, needsReview, approved }
  }, [allItems])

  const filtered = allItems.filter(a => {
    for (const col of COLUMNS) {
      const f = colFilters[col.key]
      if (!f) continue
      const v = col.get(a)
      if (col.type === 'list') {
        if (f.list && !f.list.has(v)) return false
      } else {
        if (f.text && !String(v).toLowerCase().includes(f.text.toLowerCase())) return false
      }
    }
    if (quickSearch) {
      const haystack = [
        a.application_number, a.applicant?.full_name, a.applicant?.institution,
        a.applicant?.reg_number, a.applicant?.id_number, a.applicant?.ward
      ].join(' ').toLowerCase()
      if (!haystack.includes(quickSearch.toLowerCase())) return false
    }
    return true
  })

  const sortCol = COLUMNS.find(c => c.key === sortKey)
  const sorted = [...filtered].sort((a, b) => {
    const va = sortCol.get(a), vb = sortCol.get(b)
    let cmp
    if (sortCol.type === 'numeric') cmp = va - vb
    else cmp = String(va).localeCompare(String(vb))
    return sortDir === 'asc' ? cmp : -cmp
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = key => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const clearAllFilters = () => { setColFilters({}); setQuickSearch(''); setPage(1) }
  const activeFilterCount = Object.keys(colFilters).length + (quickSearch ? 1 : 0)

  if (loading && allItems.length === 0) return <Skeleton />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-brand">Applications</h2>
        <div className="flex gap-2">
          <button className="btn-outline !py-1.5 !px-4 text-sm" onClick={load}>
            Refresh
          </button>
          <button
            className="btn-outline !py-1.5 !px-4 text-sm"
            onClick={() => downloadFile('/admin/export/applications', 'Turkana_South_Bursary_Applications.xlsx')}
          >
            Export to Excel
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-xs text-gray-500">Total Applications</p>
          <p className="text-xl font-bold text-brand">{summary.total}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Total Amount Requested</p>
          <p className="text-xl font-bold text-gray-800">KSh {summary.totalRequested.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Awaiting Review</p>
          <p className="text-xl font-bold text-amber-600">{summary.needsReview}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Approved or Further</p>
          <p className="text-xl font-bold text-green-700">{summary.approved}</p>
        </div>
      </div>

      {/* Quick search + filter status */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input flex-1 min-w-[240px]"
          placeholder="Quick search: name, app number, reg no, ID, ward…"
          value={quickSearch}
          onChange={e => { setQuickSearch(e.target.value); setPage(1) }}
        />
        {activeFilterCount > 0 && (
          <button className="btn-outline !py-1.5 !px-4 text-sm whitespace-nowrap" onClick={clearAllFilters}>
            Clear all filters ({activeFilterCount})
          </button>
        )}
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left select-none sticky top-0 z-10">
            <tr>
              {COLUMNS.map(col => (
                <th key={col.key} className="px-4 py-3 font-semibold whitespace-nowrap">
                  <span className="cursor-pointer hover:text-brand" onClick={() => toggleSort(col.key)}>
                    {col.label}
                    {sortKey === col.key && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                  </span>
                  <ColumnFilterButton
                    col={col}
                    values={columnValues(col.key)}
                    active={colFilters[col.key] || {}}
                    onChange={setColFilter}
                  />
                </th>
              ))}
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(a => (
              <tr key={a.application_number} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{a.application_number}</td>
                <td className="px-4 py-3 font-medium">{a.applicant?.full_name}</td>
                <td className="px-4 py-3">{a.applicant?.institution}</td>
                <td className="px-4 py-3">{a.applicant?.ward}</td>
                <td className="px-4 py-3">{Number(a.amount_requested || 0).toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[a.status] || 'bg-gray-100'}`}>{a.status}</span></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{a.status_history?.[0]?.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link to={`/applications/${a.id}`} className="text-brand font-semibold hover:underline mr-3">View</Link>
                  <button
                    className="text-gray-500 hover:text-brand text-xs"
                    onClick={() => downloadFile(`/admin/applications/${a.id}/pdf`, `${a.application_number}.pdf`)}
                  >
                    PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && sorted.length === 0 && <p className="text-center text-gray-500 py-10">No applications match the current filters.</p>}
      </div>

      {/* Pagination */}
      {sorted.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
            {sorted.length !== allItems.length && ` (filtered from ${allItems.length})`}
          </p>
          <div className="flex gap-2">
            <button
              className="btn-outline !py-1 !px-3 text-sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </button>
            <span className="px-2 py-1 text-gray-600">Page {page} of {totalPages}</span>
            <button
              className="btn-outline !py-1 !px-3 text-sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}