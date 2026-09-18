export default function StatCard({ title, value, accent }) {
  return (
    <div className="card !p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${accent || 'text-gray-800'}`}>{value}</p>
    </div>
  )
}