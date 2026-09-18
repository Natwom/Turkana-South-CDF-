import { useEffect, useState } from 'react'
import api from '../services/api'
import StatCard from '../components/StatCard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const fmt = n => `KSh ${Number(n || 0).toLocaleString()}`

export default function Dashboard() {
  const [d, setD] = useState(null)
  useEffect(() => { api.get('/admin/dashboard').then(r => setD(r.data)) }, [])

  if (!d) return <p>Loading…</p>
  const wardData = Object.entries(d.by_ward || {}).map(([ward, count]) => ({ ward, count }))

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-brand">Dashboard</h2>

      <div className="card bg-brand text-white">
        <h3 className="font-bold mb-4">Funding Summary — FY 2026/2027</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div><p className="text-xs opacity-80">Total Fund</p><p className="text-xl font-bold">{fmt(d.total_fund)}</p></div>
          <div><p className="text-xs opacity-80">Requested</p><p className="text-xl font-bold">{fmt(d.amount_requested)}</p></div>
          <div><p className="text-xs opacity-80">Approved</p><p className="text-xl font-bold">{fmt(d.amount_allocated)}</p></div>
          <div><p className="text-xs opacity-80">Allocated</p><p className="text-xl font-bold">{fmt(d.amount_allocated)}</p></div>
          <div><p className="text-xs opacity-80">Remaining</p><p className="text-xl font-bold text-yellow-300">{fmt(d.remaining_fund)}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total Applications" value={d.total_applications} accent="text-brand" />
        <StatCard title="Submitted" value={d.submitted} />
        <StatCard title="Awaiting Verification" value={d.awaiting_verification} />
        <StatCard title="Signed Forms" value={d.signed_uploaded} />
        <StatCard title="Under Review" value={d.under_review} />
        <StatCard title="Correction Required" value={d.correction_required} accent="text-amber-600" />
        <StatCard title="Verified" value={d.verified} />
        <StatCard title="Approved" value={d.approved} accent="text-green-700" />
        <StatCard title="Rejected" value={d.rejected} accent="text-red-600" />
        <StatCard title="Amount Allocated" value={d.allocated_count} accent="text-green-700" />
        <StatCard title="Disbursed" value={d.disbursed} accent="text-green-800" />
        <StatCard title="Drafts" value={d.drafts} />
      </div>

      {wardData.length > 0 && (
        <div className="card">
          <h3 className="font-bold mb-4">Applications by Ward</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={wardData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ward" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#1a5c2e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}