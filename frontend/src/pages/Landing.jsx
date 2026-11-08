import { Link } from 'react-router-dom'

// ── Edit these lines when the deadline or support number changes ──
const DEADLINE_LABEL = '10 December 2026'
const DEADLINE_DATE = new Date('2026-12-10T23:59:59+03:00') // East Africa Time
const SUPPORT_PHONE = '0703 779 444'
const SUPPORT_PHONE_LINK = 'tel:0703779444'

const STEPS = [
  { title: 'Fill the online form', text: 'Enter your personal, family and institution details.' },
  { title: 'Upload documents', text: 'Attach the required supporting documents.' },
  { title: 'Review and submit', text: 'Receive your Application Number and Access Code instantly.' },
  { title: 'Download and print', text: 'Print the application form generated for you.' },
  { title: 'Signing and stamping', text: 'Take the form to your Chief and Religious Leader.' },
  { title: 'Upload the signed form', text: 'Return here and upload the signed and stamped form.' },
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

const daysLeftUntil = date => Math.ceil((date.getTime() - Date.now()) / 86400000)

const Arrow = () => (
  <svg className="w-4 h-4 shrink-0 text-gray-400 group-hover:text-brand group-hover:translate-x-0.5 transition"
    viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" clipRule="evenodd"
      d="M7.2 5.2a1 1 0 011.4 0l4.1 4.1a1 1 0 010 1.4l-4.1 4.1a1 1 0 01-1.4-1.4L10.6 10 7.2 6.6a1 1 0 010-1.4z" />
  </svg>
)

function ActionRow({ to, title, text, primary }) {
  return (
    <Link
      to={to}
      className={`group flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition ${
        primary
          ? 'border-brand bg-brand text-white hover:opacity-95 shadow-sm'
          : 'border-gray-200 bg-white hover:border-brand/40 hover:bg-gray-50'
      }`}
    >
      <span>
        <span className={`block text-sm font-bold ${primary ? 'text-white' : 'text-gray-900'}`}>{title}</span>
        <span className={`block text-xs mt-0.5 ${primary ? 'text-white/80' : 'text-gray-500'}`}>{text}</span>
      </span>
      {primary
        ? <svg className="w-4 h-4 shrink-0 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" clipRule="evenodd"
              d="M7.2 5.2a1 1 0 011.4 0l4.1 4.1a1 1 0 010 1.4l-4.1 4.1a1 1 0 01-1.4-1.4L10.6 10 7.2 6.6a1 1 0 010-1.4z" />
          </svg>
        : <Arrow />}
    </Link>
  )
}

export default function Landing() {
  const daysLeft = daysLeftUntil(DEADLINE_DATE)
  const closed = daysLeft < 0
  const urgent = !closed && daysLeft <= 7

  const remaining = closed ? 'Closed'
    : daysLeft === 0 ? 'Last day'
    : daysLeft === 1 ? '1 day left'
    : `${daysLeft} days left`

  return (
    <div className="space-y-12">
      {/* ───────── Notice strip ───────── */}
      <div className={`rounded-lg border-l-4 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-2 ${
        closed ? 'border-red-500 bg-red-50 text-red-800'
          : urgent ? 'border-amber-500 bg-amber-50 text-amber-900'
          : 'border-brand bg-brand/5 text-gray-800'
      }`}>
        <p>
          <strong>{closed ? 'Applications have closed.' : 'Applications are open.'}</strong>{' '}
          {closed ? `The deadline was ${DEADLINE_LABEL}.` : `Submit before ${DEADLINE_LABEL}.`}
        </p>
        <span className="text-xs font-semibold uppercase tracking-wide">{remaining}</span>
      </div>

      {/* ───────── Intro + action panel ───────── */}
      <section className="grid gap-10 lg:grid-cols-5 items-start">
        <div className="lg:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
            NG-CDF Turkana South Constituency
          </p>
          <h1 className="mt-3 font-serif text-4xl md:text-5xl font-bold leading-tight text-gray-900">
            Bursary Application
            <span className="block text-brand">Financial Year 2026/2027</span>
          </h1>
          <div className="mt-5 h-1 w-16 rounded-full bg-brand" />
          <p className="mt-6 max-w-xl text-base md:text-lg leading-relaxed text-gray-600">
            Apply online, upload your supporting documents and receive your Application Number
            and Access Code immediately. You do not need to create an account.
          </p>

          <dl className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-gray-200 pt-6">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Deadline</dt>
              <dd className="mt-1 text-lg font-bold text-gray-900">{DEADLINE_LABEL}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Status</dt>
              <dd className={`mt-1 text-lg font-bold ${closed ? 'text-red-600' : 'text-green-700'}`}>
                {closed ? 'Closed' : 'Open'}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Support</dt>
              <dd className="mt-1 text-lg font-bold">
                <a href={SUPPORT_PHONE_LINK} className="text-brand hover:underline">{SUPPORT_PHONE}</a>
              </dd>
            </div>
          </dl>
        </div>

        <aside className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-4">Get started</h2>
          <div className="space-y-3">
            {!closed && (
              <ActionRow primary to="/apply" title="Start application" text="Begin a new bursary application" />
            )}
            <ActionRow to="/continue" title="Continue / upload signed form"
              text="Use your Application Number and Access Code" />
            <ActionRow to="/status" title="Check status" text="Track the progress of your application" />
          </div>
        </aside>
      </section>

      {/* ───────── Process timeline ───────── */}
      <section className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-gray-900">How it works</h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            The process has two parts: the online application, then the signed form. Your
            application is only complete once the signed and stamped form is uploaded.
          </p>
        </div>

        <ol className="lg:col-span-3 relative border-l-2 border-gray-200 ml-3 space-y-7">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative pl-8">
              <span className="absolute -left-[17px] top-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand bg-white text-sm font-bold text-brand">
                {i + 1}
              </span>
              <h3 className="font-semibold text-gray-900">{s.title}</h3>
              <p className="mt-0.5 text-sm text-gray-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ───────── Documents ───────── */}
      <section className="rounded-2xl bg-gray-50 border border-gray-200 p-6 md:p-10">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-gray-900">Required documents</h2>
            <p className="mt-1 text-sm text-gray-600">Keep clear scans or photos ready before you begin.</p>
          </div>
          <p className="text-xs text-gray-500 rounded-full border border-gray-300 bg-white px-3 py-1.5">
            PDF, JPG, JPEG, PNG · max 10MB each
          </p>
        </div>

        <ul className="grid gap-3 md:grid-cols-2">
          {DOCUMENTS.map((d, i) => (
            <li key={d} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
              <span className="font-serif text-xl font-bold text-brand/60 w-6 text-center">{i + 1}</span>
              <span className="text-sm text-gray-800">{d}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────── Important + Help ───────── */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-6">
          <h3 className="font-bold text-amber-900">Keep these safe</h3>
          <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
            Your <strong>Application Number</strong> and <strong>Access Code</strong> are the only
            way to continue your application, upload the signed form and track your status.
            Write them down or save a screenshot.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h3 className="font-bold text-gray-900">Need assistance?</h3>
          <p className="mt-2 text-sm text-gray-600">
            Call the NG-CDF Turkana South office during working hours.
          </p>
          <a href={SUPPORT_PHONE_LINK} className="mt-3 inline-block text-2xl font-bold text-brand hover:underline">
            {SUPPORT_PHONE}
          </a>
        </div>
      </section>

      <p className="text-center text-xs text-gray-400 pb-2">
        NG-CDF Turkana South · Bursary Management System · FY 2026/2027
      </p>
    </div>
  )
}