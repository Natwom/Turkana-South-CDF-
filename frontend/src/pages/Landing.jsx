import { Link } from 'react-router-dom'

const steps = [
  { title: 'Fill the online application form', note: 'Takes about 10 minutes.' },
  { title: 'Upload the required documents', note: 'PDF, JPG or PNG.' },
  { title: 'Review and submit', note: 'You get your Application Number and Access Code instantly.' },
  { title: 'Download and print the generated form' },
  { title: 'Get it signed and stamped', note: 'Take it to your Chief and Religious Leader.' },
  { title: 'Upload the signed and stamped form', note: 'Return here with your Application Number and Access Code.' },
]

const documents = [
  "Copy of student ID / parent's National ID",
  'Academic certificates, report form or transcript',
  'Admission letter',
  'Fees structure',
  'Fee balance statement',
  'Death certificate (where applicable)',
  'Birth certificate to prove kinship (where applicable)',
]

function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 flex-none text-brand"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function PhoneIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 3.5A1.5 1.5 0 013.5 2h2.1a1 1 0 01.97.76l.7 2.8a1 1 0 01-.27.95L5.8 7.7a11 11 0 006.5 6.5l1.2-1.2a1 1 0 01.95-.27l2.8.7a1 1 0 01.75.97v2.1a1.5 1.5 0 01-1.5 1.5C8.6 18 2 11.4 2 3.5z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.3.7l2.5 2.5a1 1 0 001.4-1.4L11 9.6V6z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg className="h-6 w-6 flex-none text-amber-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8 7a5 5 0 113.6 4.8L10 13.4V15H8.5v1.5H7V18H3v-3.2l5.2-5.2A5 5 0 018 7zm5-1a1 1 0 100 2 1 1 0 000-2z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export default function Landing() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:space-y-10 sm:py-10">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-brand text-white shadow-lg">
        <div className="px-6 py-10 text-center sm:px-12 sm:py-14">
          <p className="text-sm font-medium text-white/80">NG-CDF Turkana South</p>

          <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Bursary Application, FY 2026/2027
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
            Applications are <strong className="font-semibold text-white">open</strong>. Apply
            online, upload your documents, and receive your Application Number and Access Code
            instantly.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold ring-1 ring-inset ring-white/30">
            <ClockIcon />
            Deadline: 31 October 2026
          </div>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              to="/apply"
              className="rounded-lg bg-white px-7 py-3 text-base font-semibold text-brand shadow-sm transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
            >
              Start application
            </Link>
            <Link
              to="/continue"
              className="rounded-lg border border-white/50 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
            >
              Continue or upload signed form
            </Link>
            <Link
              to="/status"
              className="rounded-lg border border-white/50 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
            >
              Check status
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-white/20 bg-black/10 px-6 py-3 text-sm text-white/90">
          <PhoneIcon className="h-4 w-4" />
          <span>Need help? Call the NG-CDF Turkana South office on</span>
          <a href="tel:0716889657" className="font-semibold text-white underline underline-offset-2">
            0716 889 657
          </a>
        </div>
      </section>

      {/* Steps + documents */}
      <section className="grid gap-6 md:grid-cols-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 md:col-span-3">
          <h2 className="text-xl font-bold text-gray-900">How it works</h2>
          <p className="mt-1 text-sm text-gray-500">
            Six steps from application to signed form.
          </p>

          <ol className="mt-6">
            {steps.map((step, i) => (
              <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
                {i < steps.length - 1 && (
                  <span
                    className="absolute left-4 top-9 h-[calc(100%-2.25rem)] w-px bg-gray-200"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div className="pt-0.5">
                  <p className="font-semibold text-gray-900">{step.title}</p>
                  {step.note && <p className="mt-0.5 text-sm text-gray-500">{step.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 md:col-span-2">
          <h2 className="text-xl font-bold text-gray-900">Documents to prepare</h2>
          <p className="mt-1 text-sm text-gray-500">Have these ready before you start.</p>

          <ul className="mt-6 space-y-3">
            {documents.map((doc) => (
              <li key={doc} className="flex items-start gap-3 text-sm text-gray-700">
                <CheckIcon />
                <span>{doc}</span>
              </li>
            ))}
          </ul>

          <p className="mt-6 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Accepted formats: PDF, JPG, JPEG, PNG. Maximum 10MB per file.
          </p>
        </div>
      </section>

      {/* Important notice */}
      <section className="flex gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
        <KeyIcon />
        <div className="text-sm leading-relaxed text-amber-900">
          <p className="font-semibold">No account needed. Keep your codes safe.</p>
          <p className="mt-1 text-amber-800">
            Your Application Number and Access Code are the only way to continue your
            application, upload your signed form, and track your status. Write them down or
            take a screenshot when you submit.
          </p>
        </div>
      </section>

      {/* Footer help */}
      <section className="pb-4 text-center text-sm text-gray-500">
        For any assistance, contact the Turkana South NG-CDF office on{' '}
        <a href="tel:0716889657" className="font-semibold text-brand hover:underline">
          0716 889 657
        </a>
        .
      </section>
    </div>
  )
}