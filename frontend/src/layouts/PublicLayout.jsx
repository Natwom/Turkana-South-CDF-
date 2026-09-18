import { Outlet, Link } from 'react-router-dom'

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04] bg-center bg-no-repeat bg-contain"
        style={{ backgroundImage: "url('/assets/ngcdf-logo.png')" }}
      />
      <header className="bg-brand text-white relative z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/assets/ngcdf-logo.png" alt="NG-CDF Logo" className="h-12 w-auto" />
            <div>
              <p className="text-xs uppercase tracking-widest opacity-80">National Government CDF</p>
              <h1 className="text-xl font-bold">Turkana South Constituency — Bursary Portal</h1>
            </div>
          </div>
          <nav className="flex gap-4 text-sm font-medium">
            <Link to="/" className="hover:underline">Home</Link>
            <Link to="/apply" className="hover:underline">Apply</Link>
            <Link to="/continue" className="hover:underline">Continue</Link>
            <Link to="/status" className="hover:underline">Status</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 relative z-10">
        <Outlet />
      </main>
      <footer className="text-center text-sm text-gray-500 py-6 relative z-10">
        © {new Date().getFullYear()} Turkana South NG-CDF. All rights reserved.
      </footer>
    </div>
  )
}