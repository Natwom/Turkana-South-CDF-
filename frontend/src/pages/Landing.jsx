import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="space-y-8">
      <section className="card text-center py-12">
        <h2 className="text-3xl font-bold text-brand mb-3">Bursary Application — FY 2026/2027</h2>
        <p className="text-gray-600 max-w-2xl mx-auto mb-2">
          The bursary application period is <strong>open</strong>. Apply online, upload your
          documents, and receive your Application Number and Access Code instantly.
        </p>
        <p className="text-sm text-red-600 font-semibold mb-2">Deadline: 31 October 2026</p>
        <p className="text-sm text-gray-500 mb-8">
          Need help? Call the NG-CDF Turkana South office: <strong className="text-brand">0716 889 657</strong>
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/apply" className="btn-primary">Start Application</Link>
          <Link to="/continue" className="btn-outline">Continue / Upload Signed Form</Link>
          <Link to="/status" className="btn-outline">Check Status</Link>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-lg mb-3 text-brand">How it works</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Fill the online application form</li>
            <li>Upload required documents</li>
            <li>Review and submit — get your Application Number + Access Code</li>
            <li>Download and print the generated form</li>
            <li>Take it to your Chief and Religious Leader for signing & stamping</li>
            <li>Return here and upload the signed/stamped form</li>
          </ol>
        </div>
        <div className="card">
          <h3 className="font-bold text-lg mb-3 text-brand">Required documents</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
            <li>Copy of student ID / parent's National ID</li>
            <li>Academic certificates, report form or transcript</li>
            <li>Admission letter</li>
            <li>Fees structure</li>
            <li>Fee balance statement</li>
            <li>Death certificate (where applicable)</li>
            <li>Birth certificate to prove kinship (where applicable)</li>
          </ul>
          <p className="text-sm mt-4 text-gray-500">Accepted formats: PDF, JPG, JPEG, PNG (max 10MB each).</p>
        </div>
      </section>

      <section className="card bg-amber-50 border-amber-200">
        <p className="text-sm text-amber-800">
          <strong>Important:</strong> You do not need an account. Keep your Application Number
          and Access Code safe — you will need them to continue your application, upload your
          signed form, and track your status.
        </p>
      </section>

      <section className="text-center text-sm text-gray-500">
        For any assistance, contact the Turkana South NG-CDF office on <strong className="text-brand">0716 889 657</strong>.
      </section>
    </div>
  )
}