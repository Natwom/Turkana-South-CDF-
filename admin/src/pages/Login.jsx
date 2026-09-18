import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try { await login(form.username, form.password); navigate('/') }
    catch (err) { setError(err.response?.data?.detail || 'Login failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm space-y-5">
        <div className="text-center">
          <img src="/assets/ngcdf-logo.png" alt="NG-CDF Logo" className="h-20 w-auto mx-auto mb-3" />
          <h1 className="text-xl font-bold text-brand">Turkana South NG-CDF</h1>
          <p className="text-sm text-gray-500">Bursary Management System</p>
        </div>
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        <div>
          <label className="label">Username or Email</label>
          <input className="input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        </div>
        <button className="btn-primary w-full !py-3" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button>
        <div className="flex justify-center pt-2">
          <img src="/assets/ngcdf-20years.png" alt="NG-CDF 20 Years Anniversary" className="h-14 w-auto opacity-90" />
        </div>
      </form>
    </div>
  )
}