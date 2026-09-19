import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try { await login(form.username, form.password); navigate('/') }
    catch (err) { setError(err.response?.data?.detail || 'Login failed') }
    finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark relative overflow-hidden px-4">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06] bg-center bg-no-repeat bg-contain"
        style={{ backgroundImage: "url('/assets/ngcdf-logo.png')" }}
      />
      <form onSubmit={submit} className="relative z-10 bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm space-y-6 border border-black/5">
        <div className="text-center">
          <img src="/assets/ngcdf-logo.png" alt="NG-CDF Logo" className="h-20 w-auto mx-auto mb-4 drop-shadow-sm" />
          <h1 className="text-xl font-bold text-brand tracking-tight">Turkana South NG-CDF</h1>
          <p className="text-sm text-gray-500 mt-1">Bursary Management System</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="label">Username or Email</label>
            <input
              className="input"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                className="input pr-11"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand transition"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <button className="btn-primary w-full !py-3 shadow-md" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>

        <div className="flex justify-center pt-1 border-t border-gray-100">
          <img src="/assets/ngcdf-20years.png" alt="NG-CDF 20 Years Anniversary" className="h-14 w-auto opacity-90 mt-4" />
        </div>
      </form>
    </div>
  )
}