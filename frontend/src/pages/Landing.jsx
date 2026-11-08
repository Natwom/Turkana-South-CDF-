import { Link } from 'react-router-dom'

// ── Edit these lines when the deadline or support number changes ──
const DEADLINE_LABEL = '10 December 2026'
const DEADLINE_DATE = new Date('2026-12-10T23:59:59+03:00') // East Africa Time
const SUPPORT_PHONE = '0703 779 444'
const SUPPORT_PHONE_LINK = 'tel:0703779444'

const STEPS = [
  { title: 'Fill the online form', text: 'Enter your personal, family and institution details.' },
  { title: 'Upload documents', text: 'Attach the required supporting documents.' },
  { title: 'Submit', text: 'Receive your Application Number and Access Code instantly.' },
  { title: 'Print the form', text: 'Download and print your generated application form.' },
  { title: 'Get it signed', text: 'Take it to your Chief and Religious Leader for signing and stamping.' },
  { title: 'Upload signed form', text: 'Return here and upload the signed and stamped form.' },
]

const DOCUMENTS = [
  "Copy of student ID / parent's National ID",
  'Academic certificates, report form or transcript',
  'Admission letter',
  'Fees structure',
  'Fee balance statement',
  'Death certificate (where applicable)',
  'Birth certificate to prove kinship (where applicable)',
]

function daysUntil(date) {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

const CheckIcon = () => (
  <svg className="w-5 h-5 text-green-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" clipRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.58 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z" />
  </svg>
)

const PhoneIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M2 3.5A1.5 1.5 0 013.5 2h2.1a1 1 0 01.97.76l.7 2.8a1 1 0 01-.28.95L5.6 7.7a11 11 0 006.7 6.7l1.2-1.4a1 1 0 01.95-.28l2.8.7a1 1 0 01.75.97v2.1A1.5 1.5 0 0116.5 18C8.5 18 2 11.5 2 3.5z" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" clipRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.3.7l2.5 2.5a1 1 0 001.4-1.4L11 9.6V6z" />
  </svg>
)

const InfoIcon = () => (
  <svg className="w-5 h-5 text-amber-600 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" clipRule="evenodd"
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" />
  </svg>
)

export default function Landing() {
  const daysLeft = daysUntil(DEADLINE_DATE)
  const closed = daysLeft < 0

  let countdownText = `${daysLeft} days remaining`
  if (closed) countdownText = 'Applications closed'
  else if (daysLeft === 0) countdownText = 'Closes today'
  else if (daysLeft === 1) countdownText = '1 day remaining'

  return (
    <div className="space-y-10">
      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden rounded-3xl bg-brand text-white shadow-xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-white/5" aria-hidden="true" />

        <div className="relative px-6 py-14 md:px-14 md:py-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest">
            <span className={`w-2 h-2 rounded-full ${closed ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`} />
            {closed ? 'Applications Closed' : 'Applications Open'}
          </span>

          <p className="mt-6 text-sm md:text-base font-medium tracking-wide text-white/80">
            NG-CDF Turkana South Constituency
          </p>
          <h1 className="mt-2 text-3xl md:text-5xl font-extrabold leading-tight">
            Bursary Application
            <span className="block text-white/90 text-2xl md:text-3xl font-bold mt-1">FY 2026/2027</span>
          </h1>

          <p className="mt-6 max-w-2xl mx-auto text-base md:text-lg text-white/85 leading-relaxed">
            Apply online, upload your documents, and receive your Application Number and
            Access Code instantly. No account needed.
          </p>

          {/* Deadline */}
          <div className="mt-8 inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-6 rounded-2xl bg-white text-gray-800 px-6 py-4 shadow-lg">
            <div className="text-left">
              <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-500">
                Application Deadline
              </p>
              <p className="text-xl md:text-2xl font-extrabold text-red-600">{DEADLINE_LABEL}</p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-gray-200" />
            <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${
              closed ? 'bg-red-100 text-red-700'
                : daysLeft <= 7 ? 'bg-amber-100 text-amber-800'
                : 'bg-green-100 text-green-800'
            }`}>
              <ClockIcon />
              {countdownText}
            </span>
          </div>

          {/* Actions */}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {!closed && (
              <Link
                to="/apply"
                className="rounded-xl bg-white px-7 py-3 text-base font-bold text-brand shadow-md transition hover:bg-gray-100 hover:shadow-lg"
              >
                Start Application
              </Link>
            )}
            <Link
              to="/continue"
              className="rounded-xl border border-white/40 bg-white/10 px-7 py-3 text-base font-semibold text-white transition hover:bg-white/20"
            >
              Continue / Upload Signed Form
            </Link>
            <Link
              to="/status"
              className="rounded-xl border border-white/40 bg-white/10 px-7 py-3 text-base font-semibold text-white transition hover:bg-white/20"
            >
              Check Status
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── How it works ───────── */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-brand">How it works</h2>
          <p className="mt-2 text-gray-500 text-sm md:text-base">
            Six simple steps from application to signed submission.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="font-semibold text-gray-900">{s.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-gray-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Documents + Important ───────── */}
      <section className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
          <h2 className="text-xl md:text-2xl font-bold text-brand mb-1">Required documents</h2>
          <p className="text-sm text-gray-500 mb-5">
            Have these ready as clear scans or photos before you start.
          </p>
          <ul className="space-y-3">
            {DOCUMENTS.map(d => (
              <li key={d} className="flex items-start gap-3 text-sm md:text-base text-gray-700">
                <CheckIcon />
                <span>{d}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
            <strong className="text-gray-800">Accepted formats:</strong> PDF, JPG, JPEG, PNG
            <span className="text-gray-400"> · </span>
            <strong className="text-gray-800">Max size:</strong> 10MB each
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <InfoIcon />
              <h3 className="font-bold text-amber-900">Important</h3>
            </div>
            <p className="text-sm leading-relaxed text-amber-900/90">
              You do not need an account. Keep your <strong>Application Number</strong> and{' '}
              <strong>Access Code</strong> safe. You will need them to continue your application,
              upload your signed form, and track your status.
            </p>
          </div>

          <div className="rounded-2xl bg-gray-900 p-6 text-white shadow-sm">
            <h3 className="font-bold text-lg">Need help?</h3>
            <p className="mt-1 text-sm text-gray-300">
              Contact the NG-CDF Turkana South office for any assistance.
            </p>
            <a
              href={SUPPORT_PHONE_LINK}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-base font-bold text-gray-900 transition hover:bg-gray-100"
            >
              <PhoneIcon />
              {SUPPORT_PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* ───────── Footer line ───────── */}
      <p className="text-center text-xs text-gray-400 pb-2">
        NG-CDF Turkana South · Bursary Management System · FY 2026/2027
      </p>
    </div>
  )
}