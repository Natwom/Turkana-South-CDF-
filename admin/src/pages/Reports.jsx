import api from '../services/api'

const fmt = n => `KSh ${Number(n || 0).toLocaleString()}`

export default function Reports() {
  const download = (url, name) => {
    api.get(url, { responseType: 'blob' }).then(r => {
      const link = document.createElement('a')
      link.href = URL.createObjectURL(new Blob([r.data]))
      link.download = name; link.click()
    })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-2xl font-bold text-brand">Excel & Reports</h2>

      <div className="card space-y-3">
        <h3 className="font-bold">Exports</h3>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary"
            onClick={() => download('/admin/export/applications', 'Turkana_South_Bursary_Applications.xlsx')}>
            Export All Applications
          </button>
          <button className="btn-primary"
            onClick={() => download('/admin/export/allocations', 'Turkana_South_Bursary_Allocations.xlsx')}>
            Export Allocation Report
          </button>
          <button className="btn-outline"
            onClick={() => download('/admin/export/template', 'Allocation_Template.xlsx')}>
            Generate Excel Template
          </button>
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="font-bold">Import Allocations (Excel)</h3>
        <p className="text-sm text-gray-600">Upload a completed template. Columns are validated, duplicates detected, and every import is audit-logged.</p>
        <input type="file" accept=".xlsx" className="text-sm"
          onChange={e => {
            const fd = new FormData(); fd.append('file', e.target.files[0])
            api.post('/admin/import/allocations', fd).then(r =>
              alert(r.data.ok ? `Imported ${r.data.imported} allocation(s).` : `Errors:\n${r.data.errors.join('\n')}`))
          }} />
      </div>

      <div className="card space-y-3">
        <h3 className="font-bold">Audit Log</h3>
        <button className="btn-outline" onClick={() =>
          api.get('/admin/audit-logs').then(r => {
            const rows = r.data.items.map(l => [l.at, l.user, l.action, l.record || '', l.detail || '', l.ip || ''].join(','))
            const csv = 'Time,User,Action,Record,Detail,IP\n' + rows.join('\n')
            const link = document.createElement('a')
            link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
            link.download = 'audit_log.csv'; link.click()
          })}>Download Audit Log (CSV)</button>
      </div>
    </div>
  )
}