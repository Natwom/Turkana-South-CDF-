import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

// ── Live countdown to deadline ──────────────────────────────
function useCountdown(targetDate) {
  const [time, setTime] = useState(null)
  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetDate) - new Date()
      if (diff <= 0) return setTime({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true })
      setTime({
        days: Math.floor(diff / 86400000),
        hours: Math.floor(diff / 3600000) % 24,
        minutes: Math.floor(diff / 60000) % 60,
        seconds: Math.floor(diff / 1000) % 60,
        expired: false
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetDate])
  return time
}

// ── Inline SVG icons (no extra dependencies) ────────────────
const Icon = ({ d, className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d={d} />
  </svg>
)

const ICONS = {
  form: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  upload: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  key: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
  printer: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z',
  stamp: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  shield: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  phone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  arrow: 'M17 8l4 4m0 0l-4 4m4-4H3',
}

const STEPS = [
  { icon: ICONS.form,   title: 'Fill the online form',        desc: 'Complete the official bursary form in about 10 minutes on your phone or computer.' },
  { icon: ICONS.upload, title: 'Upload your documents',       desc: 'Attach your ID, admission letter, fees structure and fee balance statement.' },
  { icon: ICONS.key,    title: 'Receive your credentials',    desc: 'Get a unique Application Number and Access Code instantly upon submission.' },
  { icon: ICONS.printer,title: 'Download & print your form',  desc: 'A professionally generated PDF of your application is ready immediately.' },
  { icon: ICONS.stamp,  title: 'Get it signed & stamped',     desc: 'Take the printed form to your Religious Leader and Area Chief for endorsement.' },
  { icon: ICONS.check,  title: 'Upload the signed form',      desc: 'Return here with your credentials, upload the signed form, and track your status.' },
]

const DOCUMENTS = [
  'Copy of student ID / parent\'s National ID',
  'Academic certificates, report form or transcript',
  'Admission letter',
  'Fees structure',
  'Fee balance statement',
  'Death certificate (where applicable)',
  'Birth certificate to prove kinship (where applicable)',
]

export default function Landing() {
  const countdown = useCountdown('2026-10-31T23:59:59')

  return (
    <div className="space-y-16 pb-8">
      {/* ═══════════ HERO ═══════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-dark via-brand to-green-700 text-white shadow-xl">
        {/* decorative rings */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border-[40px] border-white/5" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full border-[30px] border-white/5" />

        <div className="relative max-w-3xl mx-auto text-center px-6 py-16">
          <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
            <span className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
            Application Period Open — FY 2026/2027
          </span>

          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
            Turkana South<br />Bursary Portal
          </h2>
          <p className="text-green-100 text-lg mb-8 max-w-xl mx-auto">
            Apply for your education bursary fully online. No queues, no paperwork —
            get your Application Number instantly and track your award in real time.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <Link to="/apply"
              className="bg-white text-brand-dark px-8 py-3.5 rounded-xl font-bold shadow-lg hover:bg-green-50 hover:shadow-xl transition inline-flex items-center gap-2">
              Start Application
              <Icon d={ICONS.arrow} className="w-5 h-5" />
            </Link>
            <Link to="/continue"
              className="border-2 border-white/60 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-white/10 transition">
              Continue / Upload Signed Form
            </Link>
            <Link to="/status"
              className="text-green-100 px-4 py-3.5 font-semibold hover:text-white transition underline-offset-4 hover:underline">
              Check Status →
            </Link>
          </div>

          {/* Countdown */}
          {countdown && !countdown.expired && (
            <div className="inline-flex flex-col items-center gap-3">
              <p className="text-sm font-semibold text-green-200 uppercase tracking-widest flex items-center gap-2">
                <Icon d={ICONS.clock} className="w-4 h-4" /> Deadline: 31 October 2026
              </p>
              <div className="flex gap-3">
                {[
                  [countdown.days, 'Days'], [countdown.hours, 'Hours'],
                  [countdown.minutes, 'Mins'], [countdown.seconds, 'Secs'],
                ].map(([val, label]) => (
                  <div key={label} className="bg-white/10 backdrop-blur rounded-xl w-18 md:w-20 py-3 px-2">
                    <p className="text-2xl md:text-3xl font-extrabold tabular-nums">{String(val).padStart(2, '0')}</p>
                    <p className="text-[11px] uppercase tracking-wider text-green-200">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {countdown?.expired && (
            <p className="inline-block bg-red-500/90 rounded-xl px-6 py-3 font-bold">
              The application period has closed.
            </p>
          )}
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section>
        <div className="text-center mb-10">
          <h3 className="text-3xl font-extrabold text-gray-900 mb-2">How It Works</h3>
          <p className="text-gray-500 max-w-xl mx-auto">Six simple steps from application to award. Designed to work perfectly on any mobile phone.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {STEPS.map((s, i) => (
            <div key={i} className="card relative group hover:shadow-lg hover:-translate-y-1 transition duration-300">
              <span className="absolute -top-3 -left-2 w-9 h-9 rounded-full bg-brand text-white font-extrabold flex items-center justify-center shadow-md">
                {i + 1}
              </span>
              <div className="w-12 h-12 rounded-xl bg-brand-light text-brand flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Icon d={s.icon} className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-gray-900 mb-1.5">{s.title}</h4>
              <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ DOCUMENTS ═══════════ */}
      <section className="grid lg:grid-cols-5 gap-6 items-stretch">
        <div className="lg:col-span-2 rounded-3xl bg-gradient-to-b from-brand-dark to-brand text-white p-8 flex flex-col justify-between shadow-lg">
          <div>
            <h3 className="text-2xl font-extrabold mb-3">Required Documents</h3>
            <p className="text-green-100 text-sm leading-relaxed mb-6">
              Have these ready before you start. You can save a draft and continue later using your
              Application Number and Access Code.
            </p>
          </div>
          <ul className="space-y-3">
            {DOCUMENTS.map((doc) => (
              <li key={doc} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-white/15 flex items-center justify-center">
                  <Icon d={ICONS.check} className="w-3.5 h-3.5 text-yellow-300" />
                </span>
                <span className="text-green-50">{doc}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3 grid sm:grid-cols-2 gap-5">
          <div className="card border-t-4 border-t-brand">
            <div className="w-11 h-11 rounded-xl bg-brand-light text-brand flex items-center justify-center mb-4">
              <Icon d={ICONS.upload} className="w-6 h-6" />
            </div>
            <h4 className="font-bold mb-1.5">Accepted formats</h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              PDF, JPG, JPEG or PNG. Maximum <strong>10MB per file</strong>. Clear photos taken with
              your phone camera are accepted.
            </p>
          </div>
          <div className="card border-t-4 border-t-yellow-500">
            <div className="w-11 h-11 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center mb-4">
              <Icon d={ICONS.shield} className="w-6 h-6" />
            </div>
            <h4 className="font-bold mb-1.5">No account needed</h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              You don't register or create a password. Your <strong>Application Number + Access Code</strong>{' '}
              are your secure key to return anytime.
            </p>
          </div>
          <div className="card border-t-4 border-t-blue-500 sm:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Icon d={ICONS.phone} className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold mb-1">Need help applying?</h4>
              <p className="text-sm text-gray-600">
                Visit the Turkana South NG-CDF office or contact your ward administrator.
                You can also save a draft and finish later — your credentials keep everything safe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="relative overflow-hidden rounded-3xl bg-gray-900 text-white px-8 py-12 text-center shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-brand/30 to-transparent" />
        <div className="relative">
          <h3 className="text-2xl md:text-3xl font-extrabold mb-3">Ready to apply?</h3>
          <p className="text-gray-300 mb-8 max-w-lg mx-auto">
            It takes about 10 minutes. Your application is saved as a draft until you're ready to submit.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/apply" className="bg-white text-gray-900 px-8 py-3.5 rounded-xl font-bold hover:bg-green-50 transition inline-flex items-center gap-2">
              Start Application <Icon d={ICONS.arrow} className="w-5 h-5" />
            </Link>
            <Link to="/continue" className="border-2 border-white/40 px-8 py-3.5 rounded-xl font-bold hover:bg-white/10 transition">
              I already have an Application Number
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ IMPORTANT NOTICE ═══════════ */}
      <section className="rounded-2xl border-l-8 border-yellow-400 bg-amber-50 p-5 flex gap-4 items-start">
        <Icon d={ICONS.shield} className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900 leading-relaxed">
          <strong>Important:</strong> This service is <strong>completely free</strong>. Beware of
          fraudsters asking for money to process bursaries. Keep your Application Number and Access
          Code confidential — never share them with anyone claiming to "speed up" your application.
        </p>
      </section>
    </div>
  )
}