export function Input({ label, ...props }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" {...props} />
    </div>
  )
}

export function Select({ label, options, ...props }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" {...props}>
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

export function YesNo({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-4">
        {['Yes', 'No'].map(v => (
          <button key={v} type="button" onClick={() => onChange(v === 'Yes')}
            className={`px-6 py-2 rounded-lg border-2 font-semibold text-sm transition
              ${value === (v === 'Yes') ? 'border-brand bg-brand text-white' : 'border-gray-300 text-gray-600'}`}>
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}