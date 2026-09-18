import { useEffect, useState } from 'react'
import api from '../services/api'

export default function Allocations() {
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState({})

  const load = () => {
    api.get('/admin/applications', { params: { size: 500, sort: 'highest_request' } }).then(r => {
      const approved = r.data.items.filter(a => ['Approved', 'Amount Allocated', 'Disbursed'].includes(a.status))
      setItems(approved)
      const totalReq = approved.reduce((s, a) => s + Number(a.amount_requested || 0), 0)
      setSummary({ count: approved.length, totalReq })
    })
  }
  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-brand">Bursary Allocations</h2>
      <div className="card flex gap-6 text-sm">
        <p><strong>{summary.count}</strong> approved applications</p>
        <p>Total requested: <strong>KSh {summary.totalReq?.toLocaleString()}</strong></p>
      </div>
      <div className="card !p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr>
            {['App Number', 'Student', 'Institution', 'Requested (KSh)', 'Allocated (KSh)', 'Disbursed', 'Status'].map(h =>
              <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}
          </tr></thead>
          <tbody>
            {items.map(a => (
              <tr key={a.application_number} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{a.application_number}</td>
                <td className="px-4 py-3 font-medium">{a.applicant?.full_name}</td>
                <td className="px-4 py-3">{a.applicant?.institution}</td>
                <td className="px-4 py-3">{Number(a.amount_requested || 0).toLocaleString()}</td>
                <td className="px-4 py-3 font-bold text-green-700">{a.allocation ? Number(a.allocation.amount).toLocaleString() : '—'}</td>
                {/* ── NEW: disbursement column ── */}
                <td className="px-4 py-3">
                  {a.allocation?.is_disbursed
                    ? <span className="badge bg-green-500 text-white">✓ {a.allocation.disbursed_at?.slice(0, 10)}</span>
                    : <span className="badge bg-gray-200 text-gray-600">Pending</span>}
                </td>
                <td className="px-4 py-3"><span className="badge bg-green-100 text-green-700">{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">Use an application's detail page to enter an allocation or mark it as disbursed (audited).</p>
    </div>
  )
}