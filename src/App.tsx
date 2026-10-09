import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import Dashboard from './pages/Dashboard'
import Literature from './pages/Literature'
import ModelBoard from './pages/ModelBoard'
import Hypotheses from './pages/Hypotheses'
import KeywordNetwork from './pages/KeywordNetwork'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto flex flex-col">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/literature" element={<Literature />} />
            <Route path="/model" element={<div className="flex flex-1 h-full"><ModelBoard /></div>} />
            <Route path="/hypotheses" element={<Hypotheses />} />
            <Route path="/network" element={<div className="flex-1 h-full"><KeywordNetwork /></div>} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
