import { Routes, Route } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import Landing from './pages/Landing'
import Apply from './pages/Apply'
import ContinueApp from './pages/ContinueApp'
import Status from './pages/Status'
import Confirmation from './pages/Confirmation'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/continue" element={<ContinueApp />} />
        <Route path="/status" element={<Status />} />
        <Route path="/confirmation" element={<Confirmation />} />
      </Route>
    </Routes>
  )
}