export default function AllocationNotice({ data }) {
  if (!data?.allocation) return null
  const a = data.allocation

  if (a.is_disbursed) {
    return (
      <div className="card border-2 border-green-500 bg-green-50 text-center">
        <p className="font-bold text-green-800 tracking-wide">✅ FUNDS DISBURSED</p>
        <p className="text-3xl font-bold text-green-700 my-2">KSh {Number(a.amount).toLocaleString()}</p>
        <p className="text-sm text-green-800">
          Your bursary has been disbursed
          {a.disbursed_at ? ` on ${a.disbursed_at.slice(0, 10)}` : ''}.
          Confirm receipt with your institution.
        </p>
      </div>
    )
  }

  return (
    <div className="card border-2 border-blue-400 bg-blue-50 text-center">
      <p className="font-bold text-blue-800 tracking-wide">🎉 BURSARY ALLOCATED</p>
      <p className="text-3xl font-bold text-blue-700 my-2">KSh {Number(a.amount).toLocaleString()}</p>
      <p className="text-sm text-blue-800">
        has been allocated to your application. Disbursement will follow — keep checking this page.
      </p>
    </div>
  )
}