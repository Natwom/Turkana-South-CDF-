import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import StatCard from '../components/StatCard'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  Wallet, FileText, Clock, CheckCircle2, XCircle, Banknote, PenLine,
  RefreshCw, TrendingUp, MapPin, ArrowRight
} from 'lucide-react'

const fmt = n => `KSh ${Number(n || 0).toLocaleString()}`

const STATUS_COLORS = {
  'Draft': '#9ca3af', 'Submitted': '#3b82f6',
  'Awaiting Physical Verification': '#6366f1',
  'Signed Form Uploaded': '#a855f7', 'Under Admin Review': '#06b6d4',
  'Correction Required': '#f59e0b', 'Verified': '#14b8a6',
  'Approved': '#22c55e', 'Rejected': '#ef4444',
  'Amount Allocated': '#16a34a', 'Disbursed': '#15803d'
}

const STATUS_BADGE = {
  'Draft': 'bg-gray-200 text-gray-700', 'Submitted': 'bg-blue-100 text-blue-700',
  'Awaiting Physical Verification': 'bg-indigo-100 text-indigo-700',
  'Signed Form Uploaded': 'bg-purple-100 text-purple-700',
  'Under Admin Review': 'bg-cyan-100 text-cyan-700',
  'Correction Required': 'bg-amber-100 text-amber-800', 'Verified': 'bg-teal-100 text-teal-700',
  'Approved': 'bg-green-100 text-green-700', 'Rejected': 'bg-red-100 text-red-700',
  'Amount Allocated': 'bg-green-200 text-green-900',
  'Disbursed': 'bg-green-500 text-white'
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="h-32 bg-gray-200 rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
      </div>
      <div className="h-72 bg-gray-200 rounded-2xl" />
    </div>
  )
}

export default function Dashboard() {
  const [d, setD] = useState(null)
  const [recent, setRecent] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(() => {
    setRefreshing(true)
    Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/applications', { params: { sort: 'newest', size: 6, page: 1 } })
    ]).then(([dashRes, appsRes]) => {
      setD(dashRes.data)
      setRecent(appsRes.data.items || [])
      setLastUpdated(new Date())
    }).finally(() => setRefreshing(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (!d) return <Skeleton />

  const wardData = Object.entries(d.by_ward || {})
    .map(([ward, count]) => ({ ward, count }))
    .sort((a, b) => b.count - a.count)

  const statusData = [
    ['Draft', d.drafts], ['Submitted', d.submitted],
    ['Awaiting Physical Verification', d.awaiting_verification],
    ['Signed Form Uploaded', d.signed_uploaded], ['Under Admin Review', d.under_review],
    ['Correction Required', d.correction_required], ['Verified', d.verified],
    ['Approved', d.approved], ['Rejected', d.rejected],
    ['Amount Allocated', d.allocated_count], ['Disbursed', d.disbursed]
  ].filter(([, v]) => v > 0).map(([status, count]) => ({ status, count }))

  const decided = (d.approved || 0) + (d.rejected || 0)
  const approvalRate = decided > 0 ? Math.round((d.approved / decided) * 100) : null

  const fundPct = d.total_fund > 0 ? Math.min(100, Math.round((d.amount_allocated / d.total_fund) * 100)) : 0
  const topWard = wardData[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-brand">Dashboard</h2>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">
              Last updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="btn-outline !py-1.5 !px-4 text-sm flex items-center gap-2"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Funding summary with progress bar */}
      <div className="card bg-gradient-to-br from-brand to-brand-dark text-white overflow-hidden relative">
        <div className="flex items-center gap-2 mb-4">
          <Wallet size={18} />
          <h3 className="font-bold">Funding Summary — FY 2026/2027</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center mb-5">
          <div><p className="text-xs opacity-80">Total Fund</p><p className="text-xl font-bold">{fmt(d.total_fund)}</p></div>
          <div><p className="text-xs opacity-80">Requested</p><p className="text-xl font-bold">{fmt(d.amount_requested)}</p></div>
          <div><p className="text-xs opacity-80">Allocated</p><p className="text-xl font-bold">{fmt(d.amount_allocated)}</p></div>
          <div><p className="text-xs opacity-80">Remaining</p><p className="text-xl font-bold text-yellow-300">{fmt(d.remaining_fund)}</p></div>
          <div>
            <p className="text-xs opacity-80">Fund Utilized</p>
            <p className="text-xl font-bold">{fundPct}%</p>
          </div>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-yellow-300 transition-all duration-700 rounded-full"
            style={{ width: `${fundPct}%` }}
          />
        </div>
      </div>

      {/* Quick insight cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-100 text-green-700"><TrendingUp size={22} /></div>
          <div>
            <p className="text-xs text-gray-500">Approval Rate</p>
            <p className="text-xl font-bold text-gray-800">
              {approvalRate !== null ? `${approvalRate}%` : '—'}
            </p>
            <p className="text-xs text-gray-400">{decided} decision(s) made</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-100 text-indigo-700"><MapPin size={22} /></div>
          <div>
            <p className="text-xs text-gray-500">Top Ward by Applications</p>
            <p className="text-xl font-bold text-gray-800">{topWard ? topWard.ward : '—'}</p>
            <p className="text-xs text-gray-400">{topWard ? `${topWard.count} application(s)` : 'No data yet'}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-100 text-amber-700"><Clock size={22} /></div>
          <div>
            <p className="text-xs text-gray-500">Needs Attention</p>
            <p className="text-xl font-bold text-gray-800">
              {(d.correction_required || 0) + (d.under_review || 0)}
            </p>
            <p className="text-xs text-gray-400">Correction required + Under review</p>
          </div>
        </div>
      </div>

      {/* Status stat cards */}
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

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-4">
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

        {statusData.length > 0 && (
          <div className="card">
            <h3 className="font-bold mb-4">Status Distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.status] || '#9ca3af'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ fontSize: 11, lineHeight: '18px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Recent applications feed */}
      <div className="card !p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-bold flex items-center gap-2"><FileText size={16} /> Recent Applications</h3>
          <Link to="/applications" className="text-sm text-brand font-semibold flex items-center gap-1 hover:underline">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">No applications yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {recent.map(a => (
                <tr key={a.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{a.application_number}</td>
                  <td className="px-4 py-2.5 font-medium">{a.applicant?.full_name || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{a.applicant?.institution || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${STATUS_BADGE[a.status] || 'bg-gray-100'}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link to={`/applications/${a.id}`} className="text-brand font-semibold hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}