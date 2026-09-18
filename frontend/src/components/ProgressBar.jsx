const steps = ['Personal', 'Family', 'Additional', 'Funding', 'Documents', 'Review', 'Submit']

export default function ProgressBar({ current }) {
  return (
    <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`flex flex-col items-center min-w-[64px] ${i <= current ? 'text-brand' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2
              ${i < current ? 'bg-brand text-white border-brand' : i === current ? 'border-brand' : 'border-gray-300'}`}>
              {i + 1}
            </div>
            <span className="text-[11px] mt-1 font-medium">{s}</span>
          </div>
          {i < steps.length - 1 && <div className={`h-0.5 w-6 md:w-12 mx-1 ${i < current ? 'bg-brand' : 'bg-gray-300'}`} />}
        </div>
      ))}
    </div>
  )
}