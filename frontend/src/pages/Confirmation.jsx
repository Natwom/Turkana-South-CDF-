import { useLocation, Link } from 'react-router-dom'
import { getPdfUrl } from '../services/api'

export default function Confirmation() {
  const { state } = useLocation()
  if (!state) return <div className="card text-center"><p>No application data. <Link to="/" className="text-brand underline">Go home</Link></p></div>

  return (
    <div className="card max-w-lg mx-auto text-center space-y-6">
      <div className="text-5xl">✅</div>
      <h2 className="text-2xl font-bold text-brand">APPLICATION SUBMITTED SUCCESSFULLY</h2>
      <div className="bg-brand-light rounded-xl p-6 space-y-2">
        <p className="text-sm text-gray-600">Application Number</p>
        <p className="text-2xl font-bold tracking-wider">{state.application_number}</p>
        <p className="text-sm text-gray-600 mt-3">Access Code</p>
        <p className="text-2xl font-bold tracking-widest">{state.access_code}</p>
        <p className="text-sm mt-3">Status: <strong>SUBMITTED</strong></p>
      </div>
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-sm text-amber-800 text-left">
        <strong>Keep your Application Number and Access Code safe.</strong> You will need them to
        upload your signed form and track your application. Take a photo or write them down now.
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <a className="btn-primary" target="_blank" rel="noreferrer"
          href={getPdfUrl(state.application_number, state.access_code)}>Download Application</a>
        <button className="btn-outline" onClick={() => window.print()}>Print</button>
        <Link to="/continue" className="btn-outline">Upload Signed Form</Link>
      </div>
      <p className="text-sm text-gray-600">Next: Print the form → Get it signed/stamped by your Chief and Religious Leader → Upload the signed form here.</p>
    </div>
  )
}