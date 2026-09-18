import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'

const CHECKLIST = ['Application information checked', 'Academic documents checked',
  'Admission letter checked', 'Fee structure checked', 'Fee balance checked',
  'Parent/guardian information checked', 'Signed/stamped form checked', 'Recommendation checked']

export default function ApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [app, setApp] = useState(null)
  const [checks, setChecks] = useState([])
  const [rejectReason, setRejectReason] = useState('')
  const [correction, setCorrection] = useState('')
  const [note, setNote] = useState('')
  const [alloc, setAlloc] = useState('')
  const [msg, setMsg] = useState('')

  const load = () => api.get(`/admin/applications/${id}`).then(r => setApp(r.data))
  useEffect(() => { load() }, [id])

  if (!app) return <p>Loading…</p>
  const refresh = (r) => { setMsg(r.data.status || 'Done'); load() }
  const err = (e) => setMsg(e.response?.data?.detail || 'Error')

  const act = {
    approve: () => api.patch(`/admin/applications/${id}/status`, { status: 'Approved' }).then(refresh).catch(err),
    reject: () => api.patch(`/admin/applications/${id}/status`, { status: 'Rejected', reason: rejectReason }).then(refresh).catch(err),
    verify: () => api.post(`/admin/applications/${id}/verify`, { checklist: checks }).then(refresh).catch(err),
    correct: () => api.post(`/admin/applications/${id}/correction`, { message: correction }).then(refresh).catch(err),
    addNote: () => api.post(`/admin/applications/${id}/notes`, { note }).then(() => { setNote(''); setMsg('Note added'); load() }).catch(err),
    allocate: () => api.post(`/admin/applications/${id}/allocation`, { amount: Number(alloc) }).then(refresh).catch(err),
    disburse: () => api.post(`/admin/applications/${id}/disburse`, {}).then(refresh).catch(err)
  }

  const sec = (title, children) => (
    <div className="card"><h3 className="font-bold text-brand mb-3">{title}</h3>{children}</div>
  )
  const dl = (label, value) => (
    <div className="flex gap-2 text-sm py-1"><span className="w-52 text-gray-500 shrink-0">{label}</span><span className="font-medium">{value || '—'}</span></div>
  )

  return (
    <div className="space-y-4">
      <button className="btn-outline" onClick={() => navigate('/applications')}>← Back</button>
      <div className="card flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-brand font-mono">{app.application_number}</h2>
          <p className="text-sm text-gray-600">{app.applicant?.full_name} — {app.applicant?.institution}</p>
        </div>
        <span className="badge bg-brand-light text-brand text-sm">{app.status}</span>
      </div>
      {msg && <div className="bg-green-50 border border-green-300 text-green-800 rounded-lg p-3 text-sm">{msg}</div>}

      <div className="grid lg:grid-cols-2 gap-4">
        {sec('Part A — Personal & Institutional', <>{[
          ['Full Name', app.applicant?.full_name], ['Reg/Admission No', app.applicant?.reg_number],
          ['ID Number', app.applicant?.id_number], ['NEMIS', app.applicant?.nemis_number],
          ['Telephone', app.applicant?.telephone], ['Gender', app.applicant?.gender],
          ['DOB', app.applicant?.dob], ['Ward', app.applicant?.ward],
          ['Location', app.applicant?.location], ['Sub-location', app.applicant?.sub_location],
          ['Village', app.applicant?.village], ['Institution', app.applicant?.institution],
          ['School Paybill', app.applicant?.school_paybill],
          ['School Account Number', app.applicant?.school_account_number],
          ['Course', app.applicant?.course], ['Level', app.applicant?.level_of_study],
          ['Mode', app.applicant?.mode_of_study], ['Class/Year', app.applicant?.class_year],
          ['Expected Completion', app.applicant?.expected_completion]
        ].map(([l, v]) => dl(l, v))}</>)}

        {sec('Part B — Family Background', <>
          {dl('Family Status', `${app.family_status || ''} ${app.family_status_other || ''}`)}
          {['father', 'mother'].map(rel => (
            <div key={rel} className="mt-2">
              <p className="font-semibold text-sm capitalize">{rel}/guardian</p>
              {dl('Name', app.family?.[rel]?.name)}
              {dl('Occupation', app.family?.[rel]?.occupation)}
              {dl('Main Income', app.family?.[rel]?.main_income_source)}
              {dl('Telephone', app.family?.[rel]?.telephone)}
            </div>
          ))}
          <p className="font-semibold text-sm mt-3">Siblings ({app.siblings?.length || 0})</p>
          {app.siblings?.map((s, i) => <p key={i} className="text-sm">{s.name} — {s.school} (Balance: KSh {Number(s.outstanding_balance || 0).toLocaleString()})</p>)}
        </>)}

        {sec('Part C — Additional Information', <>
          {dl('Reason for bursary', app.family?.reason_for_bursary)}
          {dl('Disability', app.family?.applicant_disability ? `Yes — ${app.family?.applicant_disability_desc}` : 'No')}
          {dl('Chronic illness', app.family?.chronic_illness ? `Yes — ${app.family?.chronic_illness_desc}` : 'No')}
          {dl('Guardian disability', app.family?.guardian_disability ? `Yes — ${app.family?.guardian_disability_desc}` : 'No')}
        </>)}

        {sec('Part D — Funding History & Allocation', <>
          {app.funding_history?.map((h, i) => <p key={i} className="text-sm">{h.level}: {h.funding_source || '—'} {h.other_source ? `(${h.other_source})` : ''}</p>)}
          <p className="text-lg font-bold mt-3 text-brand">Amount Requested: KSh {Number(app.amount_requested || 0).toLocaleString()}</p>
          {app.allocation && (
            <>
              <p className="text-lg font-bold text-green-700">
                Allocated: KSh {Number(app.allocation.amount).toLocaleString()} by {app.allocation.allocated_by}
              </p>
              {app.allocation.is_disbursed ? (
                <p className="text-sm text-green-700 font-semibold mt-1">
                  ✅ Disbursed on {app.allocation.disbursed_at?.slice(0, 10)} by {app.allocation.disbursed_by}
                </p>
              ) : (
                <p className="text-sm text-amber-700 mt-1">⏳ Pending disbursement</p>
              )}
            </>
          )}
        </>)}

        {sec('Documents', <>
          {app.documents?.length === 0 && <p className="text-sm text-gray-500">No documents.</p>}
          {app.documents?.map(d => (
            <div key={d.id} className="flex items-center justify-between text-sm py-1.5 border-b">
              <span>{d.original_name} <span className="text-xs text-gray-400">({d.doc_type}{d.is_signed_form ? ', SIGNED' : ''})</span></span>
              <a className="text-brand font-semibold" href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer">Download</a>
            </div>
          ))}
          <a className="btn-outline mt-3 inline-block" href={`/api/admin/applications/${id}/pdf`} target="_blank" rel="noreferrer">Download Generated PDF</a>
        </>)}

        {sec('Admin Actions', <div className="space-y-4">
          <div>
            <p className="font-semibold text-sm mb-2">Verification checklist</p>
            {CHECKLIST.map(c => (
              <label key={c} className="flex items-center gap-2 text-sm py-1">
                <input type="checkbox" checked={checks.includes(c)}
                  onChange={e => setChecks(e.target.checked ? [...checks, c] : checks.filter(x => x !== c))} />
                {c}
              </label>
            ))}
            <button className="btn-primary mt-2" onClick={act.verify} disabled={checks.length < 3}>Mark Verified</button>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary !bg-green-700" onClick={act.approve}>Approve</button>
            <input className="input" placeholder="Rejection reason" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            <button className="btn-primary !bg-red-600" onClick={act.reject} disabled={!rejectReason}>Reject</button>
          </div>
          <div className="flex gap-2">
            <input className="input" placeholder="Correction message to student…" value={correction} onChange={e => setCorrection(e.target.value)} />
            <button className="btn-outline" onClick={act.correct} disabled={!correction}>Request Correction</button>
          </div>
          <div className="flex gap-2 border-t pt-3">
            <input className="input" type="number" placeholder="Allocation amount (KSh)" value={alloc} onChange={e => setAlloc(e.target.value)} />
            <button className="btn-primary !bg-green-700" onClick={act.allocate} disabled={!alloc}>Allocate</button>
          </div>
          {app.allocation && !app.allocation.is_disbursed && app.status === 'Amount Allocated' && (
            <div className="border-t pt-3">
              <button className="btn-primary !bg-green-800 w-full" onClick={act.disburse}>
                Mark as Disbursed (KSh {Number(app.allocation.amount).toLocaleString()})
              </button>
              <p className="text-xs text-gray-500 mt-1">Student will see "Funds Disbursed" in their portal immediately.</p>
            </div>
          )}
        </div>)}

        {sec('Status History', <ol className="text-sm space-y-1">
          {app.status_history?.map((h, i) => <li key={i}><strong>{h.new_status}</strong> — {h.changed_by} <span className="text-gray-400">{h.created_at?.slice(0, 16)}</span>{h.remarks && <span className="text-gray-500"> ({h.remarks})</span>}</li>)}
        </ol>)}

        {sec('Internal Notes', <div className="space-y-2">
          {app.notes?.map((n, i) => <p key={i} className="text-sm bg-gray-50 rounded p-2">{n.note} <span className="text-xs text-gray-400">— {n.created_by}</span></p>)}
          <div className="flex gap-2">
            <input className="input" placeholder="Add internal note…" value={note} onChange={e => setNote(e.target.value)} />
            <button className="btn-outline" onClick={act.addNote}>Add</button>
          </div>
        </div>)}
      </div>
    </div>
  )
}