import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CustomerPage from './pages/CustomerPage'
import StaffPage    from './pages/StaffPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"      element={<CustomerPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="*"      element={<CustomerPage />} />
      </Routes>
    </BrowserRouter>
  )
}
