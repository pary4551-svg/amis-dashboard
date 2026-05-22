import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Overview from './pages/Overview'
import BranchDetail from './pages/BranchDetail'
import SGAAnalysis from './pages/SGAAnalysis'
import YoYAnalysis from './pages/YoYAnalysis'

export default function App() {
  return (
    <BrowserRouter basename="/amis-dashboard">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="branch" element={<BranchDetail />} />
          <Route path="sga" element={<SGAAnalysis />} />
          <Route path="yoy" element={<YoYAnalysis />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
