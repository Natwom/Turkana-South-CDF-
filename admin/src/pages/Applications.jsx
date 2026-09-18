import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

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

export default function Applications() {
  const [data, setData] = useState({ items: [], total: 0 })
  const [filters, setFilters] = useState({ status: '', ward: '', search: '', sort: 'newest', page: 1 })
  const [wards, setWards] = useState([])

  const load = () => api.get('/admin/applications', { params: filters })
    .then(r => setData(r.data))

  useEffect(() => { load() }, [filters])
  useEffect(() => {
    api.get('/admin/applications', { params: { size: 500 } }).then(r => {
      const w = [...new Set(r.data.items.map(i => i.applicant?.ward).filter(Boolean))]
      setWards(w)
    })
  }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-brand">Applications</h2>

      <div className="card !p-4 grid md:grid-cols-4 gap-3">
        <input className="input" placeholder="Search name / app no / reg no / ID…"
          value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value, page: 1 })} />
        <select className="input" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value, page: 1 })}>
          <option value="">All statuses</option>
          {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="input" value={filters.ward} onChange={e => setFilters({ ...filters, ward: e.target.value, page: 1 })}>
          <option value="">All wards</option>
          {wards.map(w => <option key={w}>{w}</option>)}
        </select>
        <select className="input" value={filters.sort} onChange={e => setFilters({ ...filters, sort: e.target.value })}>
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
          <option value="highest_request">Highest requested</option><option value="lowest_request">Lowest requested</option>
        </select>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>{['App Number', 'Student', 'Institution', 'Ward', 'Requested (KSh)', 'Status', 'Date', ''].map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {data.items.map(a => (
              <tr key={a.application_number} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{a.application_number}</td>
                <td className="px-4 py-3 font-medium">{a.applicant?.full_name}</td>
                <td className="px-4 py-3">{a.applicant?.institution}</td>
                <td className="px-4 py-3">{a.applicant?.ward}</td>
                <td className="px-4 py-3">{Number(a.amount_requested || 0).toLocaleString()}</td>
                <td className="px-4 py-3"><span className={`badge ${STATUS_COLORS[a.status] || 'bg-gray-100'}`}>{a.status}</span></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{a.status_history?.[0]?.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <Link to={`/applications/${a.id}`} className="text-brand font-semibold hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && <p className="text-center text-gray-500 py-10">No applications found.</p>}
      </div>
      <p className="text-sm text-gray-500">{data.total} application(s) — page {filters.page}</p>
    </div>
  )
}