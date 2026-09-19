import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'
import { Input, Select, YesNo } from '../components/Field'
import { startApplication, uploadDocument, submitApplication } from '../services/api'

const empty = {
  category: '', amount_requested: '', family_status: '', family_status_other: '',
  applicant: { full_name: '', reg_number: '', id_number: '', nemis_number: '', telephone: '',
    gender: '', dob: '', place_of_birth: '', constituency: 'Turkana South', ward: '',
    location: '', sub_location: '', village: '', institution: '', institution_code: '',
    school_paybill: '', school_account_number: '',
    campus: '', level_of_study: '', course: '', mode_of_study: '', class_year: '',
    expected_completion: '' },
  family: { reason_for_bursary: '', applicant_disability: false, applicant_disability_desc: '',
    chronic_illness: false, chronic_illness_desc: '', guardian_disability: false,
    guardian_disability_desc: '', father: {}, mother: {} },
  siblings: [], funding_history: []
}

export default function Apply() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(empty)
  const [files, setFiles] = useState({})
  const [creds, setCreds] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const set = (path, value) => {
    const keys = path.split('.')
    setForm(prev => {
      const next = structuredClone(prev)
      let node = next
      for (let i = 0; i < keys.length - 1; i++) node = node[keys[i]]
      node[keys.at(-1)] = value
      return next
    })
  }

  const saveDraft = async () => {
    setBusy(true); setError('')
    try {
      const payload = {
        ...form,
        funding_period_id: 1,
        amount_requested: form.amount_requested ? Number(form.amount_requested) : null,
        applicant: { ...form.applicant, dob: form.applicant.dob || null },
        siblings: form.siblings.map(s => ({
          ...s,
          total_fees: s.total_fees ? Number(s.total_fees) : 0,
          outstanding_balance: s.outstanding_balance ? Number(s.outstanding_balance) : 0
        }))
      }
      const { data } = await startApplication(payload)
      setCreds({ application_number: data.application_number, access_code: data.access_code })
      return data
    } catch (e) {
      const detail = e.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map(d => `${d.loc?.slice(-1)[0] || 'field'}: ${d.msg}`).join('; ')
        : (detail || 'Save failed. Please try again.')
      setError(msg)
      throw e
    } finally { setBusy(false) }
  }

  const doUploads = async (appNo, code) => {
    for (const [doc_type, file] of Object.entries(files)) {
      if (file) await uploadDocument(appNo, code, doc_type, file)
    }
  }

  const handleSubmit = async () => {
    setBusy(true); setError('')
    try {
      let c = creds
      if (!c) c = await saveDraft()
      await doUploads(c.application_number, c.access_code)
      await submitApplication(c.application_number, c.access_code)
      navigate('/confirmation', { state: c })
    } catch (e) {
      if (!e.response) setError('Network error. Check your connection.')
    } finally { setBusy(false) }
  }

  const guardianFields = (rel) => (
    <div className="grid md:grid-cols-2 gap-4">
      <Input label="Name" value={form.family[rel].name || ''} onChange={e => set(`family.${rel}.name`, e.target.value)} />
      <Input label="Occupation/Profession" value={form.family[rel].occupation || ''} onChange={e => set(`family.${rel}.occupation`, e.target.value)} />
      <Input label="Main Source of Income" value={form.family[rel].main_income_source || ''} onChange={e=> set(`family.${rel}.main_income_source`, e.target.value)} />
      <Input label="Other Source of Income" value={form.family[rel].other_income_source || ''} onChange={e => set(`family.${rel}.other_income_source`, e.target.value)} />
      <Select label="Employment Status" options={['Employed', 'Self-employed', 'Unemployed', 'Casual worker', 'Farmer', 'Business']} value={form.family[rel].employment_status || ''} onChange={e => set(`family.${rel}.employment_status`, e.target.value)} />
      <Input label="Telephone Contact" value={form.family[rel].telephone || ''} onChange={e => set(`family.${rel}.telephone`, e.target.value)} />
    </div>
  )

  const DOC_TYPES = [
    ['id_card', 'Copy of ID (student/parent)'], ['academic', 'Academic certificates / transcript'],
    ['admission_letter', 'Admission letter'], ['fees_structure', 'Fees structure'],
    ['fee_balance', 'Fee balance statement'], ['death_certificate', 'Death certificate (if applicable)'],
    ['birth_certificate', 'Birth certificate (if applicable)']
  ]

  const steps = [
    // 0 — Personal
    <div className="grid md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <Select label="Application Category *" options={['Secondary', 'College', 'University', 'Others']}
          value={form.category} onChange={e => set('category', e.target.value)} />
      </div>
      <Input label="Full Name of Student *" value={form.applicant.full_name} onChange={e => set('applicant.full_name', e.target.value)} />
      <Input label="Registration/Admission No." value={form.applicant.reg_number} onChange={e => set('applicant.reg_number', e.target.value)} />
      <Input label="ID Number" value={form.applicant.id_number} onChange={e => set('applicant.id_number', e.target.value)} />
      <Input label="NEMIS Number" value={form.applicant.nemis_number} onChange={e => set('applicant.nemis_number', e.target.value)} />
      <Input label="Telephone Number" type="tel" value={form.applicant.telephone} onChange={e => set('applicant.telephone', e.target.value)} />
      <Select label="Gender" options={['Male', 'Female']} value={form.applicant.gender} onChange={e => set('applicant.gender', e.target.value)} />
      <Input label="Date of Birth" type="date" value={form.applicant.dob} onChange={e => set('applicant.dob', e.target.value)} />
      <Input label="Place of Birth/Residence" value={form.applicant.place_of_birth} onChange={e => set('applicant.place_of_birth', e.target.value)} />
      <Input label="Constituency" value={form.applicant.constituency} onChange={e => set('applicant.constituency', e.target.value)} />
      <Input label="Ward *" value={form.applicant.ward} onChange={e => set('applicant.ward', e.target.value)} />
      <Input label="Location" value={form.applicant.location} onChange={e => set('applicant.location', e.target.value)} />
      <Input label="Sub-Location" value={form.applicant.sub_location} onChange={e => set('applicant.sub_location', e.target.value)} />
      <Input label="Village" value={form.applicant.village} onChange={e => set('applicant.village', e.target.value)} />
      <Input label="Name of School/College/University *" value={form.applicant.institution} onChange={e => set('applicant.institution', e.target.value)} />
      <Input label="Institution Code (Min. of Education)" value={form.applicant.institution_code} onChange={e => set('applicant.institution_code', e.target.value)} />
      <Input label="School Paybill Number" placeholder="e.g. 123456" value={form.applicant.school_paybill} onChange={e => set('applicant.school_paybill', e.target.value)} />
      <Input label="School Bank/M-Pesa Account Number" placeholder="Account number to send fees to" value={form.applicant.school_account_number} onChange={e => set('applicant.school_account_number', e.target.value)} />
      <Input label="Campus/Branch" value={form.applicant.campus} onChange={e => set('applicant.campus', e.target.value)} />
      <Select label="Level of Study" options={['Degree', 'Diploma', 'Certificate']} value={form.applicant.level_of_study} onChange={e => set('applicant.level_of_study', e.target.value)} />
      <Input label="Course of Study" value={form.applicant.course} onChange={e => set('applicant.course', e.target.value)} />
      <Select label="Mode of Study" options={['Regular', 'Parallel', 'Boarding', 'Day']} value={form.applicant.mode_of_study} onChange={e => set('applicant.mode_of_study', e.target.value)} />
      <Input label="Class/Year of Study" value={form.applicant.class_year} onChange={e => set('applicant.class_year', e.target.value)} />
      <Input label="Expected Year & Month of Completion" placeholder="e.g. 2029 December" value={form.applicant.expected_completion} onChange={e => set('applicant.expected_completion', e.target.value)} />
    </div>,

    // 1 — Family
    <div className="space-y-6">
      <Select label="Family Status *" options={['Total Orphan', 'Partial Orphan', 'Both Parents Alive', 'Single Parent', 'Others']}
        value={form.family_status} onChange={e => set('family_status', e.target.value)} />
      {form.family_status === 'Others' &&
        <Input label="Please explain" value={form.family_status_other} onChange={e => set('family_status_other', e.target.value)} />}
      <div>
        <h4 className="font-bold text-brand mb-3">Father/Guardian</h4>
        {guardianFields('father')}
      </div>
      <div>
        <h4 className="font-bold text-brand mb-3">Mother/Guardian</h4>
        {guardianFields('mother')}
      </div>
      <div>
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-bold text-brand">Siblings in School</h4>
          <button type="button" className="btn-outline !py-1.5 !px-4 text-sm"
            onClick={() => set('siblings', [...form.siblings, { name: '', relationship: '', school: '', class_level: '', total_fees: '', outstanding_balance: '' }])}>
            + Add Sibling
          </button>
        </div>
        {form.siblings.map((s, i) => (
          <div key={i} className="card mb-3 !p-4 grid md:grid-cols-3 gap-3">
            <Input label="Name" value={s.name} onChange={e => set(`siblings.${i}.name`, e.target.value)}/>
            <Input label="Relationship" value={s.relationship} onChange={e => set(`siblings.${i}.relationship`, e.target.value)} />
            <Input label="School/Institution" value={s.school} onChange={e => set(`siblings.${i}.school`, e.target.value)} />
            <Input label="Class" value={s.class_level} onChange={e => set(`siblings.${i}.class_level`, e.target.value)} />
            <Input label="Total Fees (KSh)" type="number" value={s.total_fees} onChange={e => set(`siblings.${i}.total_fees`, e.target.value)} />
            <Input label="Outstanding Balance (KSh)" type="number" value={s.outstanding_balance} onChange={e => set(`siblings.${i}.outstanding_balance`, e.target.value)} />
            <button type="button" className="text-red-600 text-sm font-semibold md:col-span-3 text-left"
              onClick={() => set('siblings', form.siblings.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
      </div>
    </div>,

    // 2 — Additional
    <div className="space-y-6">
      <div>
        <label className="label">Reason for applying for a bursary *</label>
        <textarea className="input h-36" value={form.family.reason_for_bursary}
          onChange={e => set('family.reason_for_bursary', e.target.value)} />
      </div>
      <YesNo label="Do you have a physical impairment/disability?" value={form.family.applicant_disability}
        onChange={v => set('family.applicant_disability', v)} />
      {form.family.applicant_disability &&
        <Input label="Description" value={form.family.applicant_disability_desc} onChange={e => set('family.applicant_disability_desc', e.target.value)} />}
      <YesNo label="Do you have any other disability or chronic illness?" value={form.family.chronic_illness}
        onChange={v => set('family.chronic_illness', v)} />
      {form.family.chronic_illness &&
        <Input label="Description" value={form.family.chronic_illness_desc} onChange={e => set('family.chronic_illness_desc', e.target.value)} />}
      <YesNo label="Does your parent/guardian have a disability?" value={form.family.guardian_disability}
        onChange={v => set('family.guardian_disability', v)} />
      {form.family.guardian_disability &&
        <Input label="Description" value={form.family.guardian_disability_desc} onChange={e => set('family.guardian_disability_desc', e.target.value)} />}
    </div>,

    // 3 — Funding history
    <div className="space-y-6">
      {['Secondary', 'College', 'University'].map(level => {
        const existing = form.funding_history.find(h => h.level === level) || { level, funding_source: '', other_source: '' }
        const upsert = (field, value) => {
          const rest = form.funding_history.filter(h => h.level !== level)
          set('funding_history', [...rest, { ...existing, [field]: value }])
        }
        return (
          <div key={level} className="card !p-4">
            <h4 className="font-bold text-brand mb-3">{level} School Funding</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Funding Source (e.g. NG-CDF, HELB, Harambee, Self)" value={existing.funding_source} onChange={e => upsert('funding_source', e.target.value)} />
              <Input label="Other Source of Funding" value={existing.other_source} onChange={e => upsert('other_source', e.target.value)} />
            </div>
          </div>
        )
      })}
      <Input label="Amount Applying For (KSh) *" type="number" value={form.amount_requested}
        onChange={e => set('amount_requested', e.target.value)} />
    </div>,

    // 4 — Documents
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Upload the applicable documents. PDF, JPG, JPEG or PNG — max 10MB each.</p>
      {DOC_TYPES.map(([key, label]) => (
        <div key={key} className="card !p-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="font-semibold text-sm">{label}</p>
            {files[key] && <p className="text-xs text-green-700 mt-1">✓ {files[key].name}</p>}
          </div>
          <label className="btn-outline !py-1.5 !px-4 text-sm cursor-pointer">
            {files[key] ? 'Replace' : 'Choose file'}
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => setFiles(prev => ({ ...prev, [key]: e.target.files[0] }))} />
          </label>
        </div>
      ))}
    </div>,

    // 5 — Review
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Please confirm all information is correct before submitting. You will not be able to edit after submission unless the admin requests a correction.</p>
      <div className="card !p-4 text-sm space-y-2">
        <p><strong>Category:</strong> {form.category}</p>
        <p><strong>Name:</strong> {form.applicant.full_name}</p>
        <p><strong>Institution:</strong> {form.applicant.institution} — {form.applicant.course}</p>
        <p><strong>Ward:</strong> {form.applicant.ward}</p>
        <p><strong>Family Status:</strong> {form.family_status} {form.family_status_other}</p>
        <p><strong>Amount Requested:</strong> KSh {Number(form.amount_requested || 0).toLocaleString()}</p>
        <p><strong>Documents attached:</strong> {Object.values(files).filter(Boolean).length}</p>
      </div>
    </div>
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-brand mb-6">Bursary Application Form</h2>
      <ProgressBar current={step} />
      {error && <div className="bg-red-50 border border-red-300 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}
      <form onSubmit={e => e.preventDefault()} className="card">
        {steps[step]}
        <div className="flex justify-between mt-8">
          <button type="button" className="btn-outline" disabled={step === 0 || busy}
            onClick={() => setStep(step - 1)}>Back</button>
          <div className="flex gap-3">
            <button type="button" className="btn-outline" disabled={busy} onClick={saveDraft}>Save Draft</button>
            {step < steps.length - 1 ? (
              <button type="button" className="btn-primary" onClick={() => setStep(step + 1)}>Next</button>
            ) : (
              <button type="button" className="btn-primary" disabled={busy || !form.applicant.full_name || !form.amount_requested}
                onClick={handleSubmit}>
                {busy ? 'Submitting…' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>
      </form>
      {creds && (
        <div className="card mt-4 bg-amber-50 border-amber-300">
          <p className="text-sm text-amber-800">
            <strong>Draft saved.</strong> Application Number: <strong>{creds.application_number}</strong> —
            Access Code: <strong>{creds.access_code}</strong>. Keep these safe to continue later!
          </p>
        </div>
      )}
    </div>
  )
}