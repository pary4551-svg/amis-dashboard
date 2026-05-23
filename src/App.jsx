import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Overview from './pages/Overview'
import BranchDetail from './pages/BranchDetail'
import SGAAnalysis from './pages/SGAAnalysis'
import YoYAnalysis from './pages/YoYAnalysis'
import DataUpload from './pages/DataUpload'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="branch" element={<BranchDetail />} />
          <Route path="sga" element={<SGAAnalysis />} />
          <Route path="yoy" element={<YoYAnalysis />} />
          <Route path="upload" element={<DataUpload />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
