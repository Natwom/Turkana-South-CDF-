import { useEffect, useState, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api, { downloadFile } from '../services/api'
import { useAuth } from '../context/AuthContext'

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
const FROZEN_COL_WIDTH = 130 // px — frozen "App Number" column
const CHECK_COL_WIDTH = 44   // px — frozen checkbox column (Super Admin only)

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
        <div className="absolute z-30 top-6 left-0 bg-white border border-gray-300 rounded-lg shadow-xl w-56 p-3 text-xs">
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

function BulkDeleteModal({ items, busy, onCancel, onConfirm }) {
  const [text, setText] = useState('')

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && !busy) onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  const preview = items.slice(0, 5)
  const withAllocation = items.filter(a => a.allocation)
  const allocatedTotal = withAllocation.reduce((s, a) => s + Number(a.allocation.amount || 0), 0)
  const canConfirm = text.trim() === 'DELETE' && !busy

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-red-700">
            Delete {items.length} application{items.length === 1 ? '' : 's'}?
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            You are about to <strong>permanently delete</strong> the applications below, including
            their uploaded documents, family details, status history and allocation records.
            <strong> This cannot be undone.</strong>
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-1 max-h-40 overflow-y-auto">
          {preview.map(a => (
            <div key={a.id} className="flex justify-between gap-3">
              <span className="font-mono">{a.application_number}</span>
              <span className="text-gray-600 truncate">{a.applicant?.full_name || '—'}</span>
            </div>
          ))}
          {items.length > preview.length && (
            <p className="text-gray-500 pt-1">…and {items.length - preview.length} more</p>
          )}
        </div>

        {withAllocation.length > 0 && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-800">
            <strong>Warning:</strong> {withAllocation.length} of these application(s) already have funds
            allocated (KSh {allocatedTotal.toLocaleString()} in total). Deleting them removes those
            allocations from your funding totals.
          </div>
        )}

        <div>
          <label className="label">Type <strong>DELETE</strong> to confirm</label>
          <input
            className="input"
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canConfirm && onConfirm()}
            placeholder="DELETE"
            disabled={busy}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="btn-primary !bg-red-600 disabled:opacity-50" onClick={onConfirm} disabled={!canConfirm}>
            {busy ? 'Deleting…' : `Delete ${items.length} application${items.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center py-10">
        <div className="w-10 h-10 border-4 border-brand/20 border-t-brand rounded-full animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Loading applications…</p>
        <p className="text-xs text-gray-400 mt-1">Fetching the latest data from the server</p>
      </div>
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="h-96 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  )
}

export default function Applications() {
  const { user } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'

  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [colFilters, setColFilters] = useState({})
  const [quickSearch, setQuickSearch] = useState('')
  const [sortKey, setSortKey] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)

  const [selected, setSelected] = useState(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [result, setResult] = useState(null)

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

  const filtered = useMemo(() => allItems.filter(a => {
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
  }), [allItems, colFilters, quickSearch])

  const sorted = useMemo(() => {
    const sortCol = COLUMNS.find(c => c.key === sortKey)
    return [...filtered].sort((a, b) => {
      const va = sortCol.get(a), vb = sortCol.get(b)
      const cmp = sortCol.type === 'numeric' ? va - vb : String(va).localeCompare(String(vb))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  // Keep the selection safe: only rows that are still loaded AND visible under the
  // current filters can stay selected, so nothing hidden can be deleted by accident.
  useEffect(() => {
    setSelected(prev => {
      if (prev.size === 0) return prev
      const visible = new Set(filtered.map(a => a.id))
      const next = new Set([...prev].filter(id => visible.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const pageIds = pageItems.map(a => a.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id))
  const somePageSelected = pageIds.some(id => selected.has(id))

  const togglePage = () => {
    setSelected(prev => {
      const next = new Set(prev)
      if (allPageSelected) pageIds.forEach(id => next.delete(id))
      else pageIds.forEach(id => next.add(id))
      return next
    })
  }
  const toggleOne = id => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const selectAllFiltered = () => setSelected(new Set(sorted.map(a => a.id)))

  const selectedItems = allItems.filter(a => selected.has(a.id))

  const runBulkDelete = async () => {
    setDeleting(true)
    try {
      const { data } = await api.post('/admin/applications/bulk-delete', { ids: [...selected] })
      setResult({ deleted: data.deleted, failed: data.failed || [] })
      setSelected(new Set())
      setConfirmOpen(false)
      load()
    } catch (e) {
      setResult({ deleted: 0, failed: [], error: e.response?.data?.detail || 'Bulk delete failed.' })
      setConfirmOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  const toggleSort = key => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const clearAllFilters = () => { setColFilters({}); setQuickSearch(''); setPage(1) }
  const activeFilterCount = Object.keys(colFilters).length + (quickSearch ? 1 : 0)

  const frozenLeft = isSuper ? CHECK_COL_WIDTH : 0

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

      {/* Result of the last bulk delete */}
      {result && (
        <div className={`rounded-xl border px-4 py-3 text-sm flex items-start justify-between gap-4 ${
          result.error || result.failed.length > 0
            ? 'bg-amber-50 border-amber-300 text-amber-900'
            : 'bg-green-50 border-green-300 text-green-800'
        }`}>
          <div className="space-y-1">
            {result.error ? (
              <p><strong>Bulk delete failed:</strong> {result.error}</p>
            ) : (
              <p>
                <strong>{result.deleted}</strong> application{result.deleted === 1 ? '' : 's'} deleted
                {result.failed.length > 0 && <>, <strong>{result.failed.length}</strong> could not be deleted</>}.
              </p>
            )}
            {result.failed.length > 0 && (
              <ul className="list-disc list-inside text-xs">
                {result.failed.map((f, i) => (
                  <li key={i}>{f.application_number || `ID ${f.id}`}: {f.reason}</li>
                ))}
              </ul>
            )}
          </div>
          <button className="text-xs underline shrink-0" onClick={() => setResult(null)}>Dismiss</button>
        </div>
      )}

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

      {/* Selection bar (Super Admin only) */}
      {isSuper && selected.size > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-red-800">
            <strong>{selected.size}</strong> application{selected.size === 1 ? '' : 's'} selected
            {allPageSelected && sorted.length > pageItems.length && selected.size < sorted.length && (
              <button className="ml-3 underline font-semibold" onClick={selectAllFiltered}>
                Select all {sorted.length} matching applications
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn-outline !py-1.5 !px-4 text-sm" onClick={() => setSelected(new Set())}>
              Clear selection
            </button>
            <button
              className="btn-primary !bg-red-600 !py-1.5 !px-4 text-sm"
              onClick={() => setConfirmOpen(true)}
            >
              Delete Selected ({selected.size})
            </button>
          </div>
        </div>
      )}

      {/* Freeze-panes table: header row frozen (sticky top) + checkbox and App Number columns frozen (sticky left) */}
      <div className="card !p-0">
        <div className="overflow-auto rounded-xl" style={{ maxHeight: '70vh' }}>
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                {isSuper && (
                  <th
                    className="px-3 py-3 bg-gray-100 sticky top-0 left-0 z-30 border-b border-gray-200"
                    style={{ minWidth: CHECK_COL_WIDTH, width: CHECK_COL_WIDTH }}
                  >
                    <input
                      type="checkbox"
                      title="Select all on this page"
                      checked={allPageSelected}
                      ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
                      onChange={togglePage}
                    />
                  </th>
                )}
                <th
                  className="px-4 py-3 font-semibold whitespace-nowrap text-left bg-gray-100 sticky top-0 z-30 border-b border-r border-gray-200"
                  style={{ left: frozenLeft, minWidth: FROZEN_COL_WIDTH, width: FROZEN_COL_WIDTH }}
                >
                  <span className="cursor-pointer hover:text-brand" onClick={() => toggleSort('application_number')}>
                    App Number
                    {sortKey === 'application_number' && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                  </span>
                  <ColumnFilterButton
                    col={COLUMNS[0]}
                    values={columnValues('application_number')}
                    active={colFilters['application_number'] || {}}
                    onChange={setColFilter}
                  />
                </th>
                {COLUMNS.slice(1).map(col => (
                  <th
                    key={col.key}
                    className="px-4 py-3 font-semibold whitespace-nowrap text-left bg-gray-50 sticky top-0 z-20 border-b border-gray-200"
                  >
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
                <th className="px-4 py-3 font-semibold whitespace-nowrap text-left bg-gray-50 sticky top-0 z-20 border-b border-gray-200">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(a => {
                const isSel = selected.has(a.id)
                const frozenBg = isSel ? 'bg-red-50' : 'bg-white group-hover:bg-gray-50'
                return (
                  <tr key={a.application_number} className={`group ${isSel ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    {isSuper && (
                      <td
                        className={`px-3 py-3 sticky left-0 z-10 border-b border-gray-100 ${frozenBg}`}
                        style={{ minWidth: CHECK_COL_WIDTH, width: CHECK_COL_WIDTH }}
                      >
                        <input type="checkbox" checked={isSel} onChange={() => toggleOne(a.id)} />
                      </td>
                    )}
                    <td
                      className={`px-4 py-3 font-mono text-xs sticky z-10 border-r border-b border-gray-100 ${frozenBg}`}
                      style={{ left: frozenLeft, minWidth: FROZEN_COL_WIDTH, width: FROZEN_COL_WIDTH }}
                    >
                      {a.application_number}
                    </td>
                    <td className="px-4 py-3 font-medium border-b border-gray-100">{a.applicant?.full_name}</td>
                    <td className="px-4 py-3 border-b border-gray-100">{a.applicant?.institution}</td>
                    <td className="px-4 py-3 border-b border-gray-100">{a.applicant?.ward}</td>
                    <td className="px-4 py-3 border-b border-gray-100">{Number(a.amount_requested || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 border-b border-gray-100">
                      <span className={`badge ${STATUS_COLORS[a.status] || 'bg-gray-100'}`}>{a.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs border-b border-gray-100">
                      {a.status_history?.[0]?.created_at?.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap border-b border-gray-100">
                      <Link to={`/applications/${a.id}`} className="text-brand font-semibold hover:underline mr-3">View</Link>
                      <button
                        className="text-gray-500 hover:text-brand text-xs"
                        onClick={() => downloadFile(`/admin/applications/${a.id}/pdf`, `${a.application_number}.pdf`)}
                      >
                        PDF
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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

      {confirmOpen && (
        <BulkDeleteModal
          items={selectedItems}
          busy={deleting}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={runBulkDelete}
        />
      )}
    </div>
  )
}