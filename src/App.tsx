import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import Dashboard from './pages/Dashboard'
import Literature from './pages/Literature'
import ModelBoard from './pages/ModelBoard'
import Hypotheses from './pages/Hypotheses'
import KeywordNetwork from './pages/KeywordNetwork'
import { useSupabaseSync } from './lib/useSync'
import { isSupabaseEnabled } from './lib/supabase'
import { Cloud, HardDrive } from 'lucide-react'

function CloudBadge() {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mx-2 mb-2 ${
      isSupabaseEnabled
        ? 'bg-emerald-900/40 text-emerald-400'
        : 'bg-gray-800 text-gray-500'
    }`}>
      {isSupabaseEnabled
        ? <><Cloud size={11} /> 雲端同步</>
        : <><HardDrive size={11} /> 本地模式</>
      }
    </div>
  )
}

function AppInner() {
  useSupabaseSync()
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex flex-col w-56 bg-gray-900 shrink-0">
        <Sidebar />
        <CloudBadge />
      </div>
      <main className="flex-1 overflow-y-auto flex flex-col min-h-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/literature" element={<Literature />} />
          <Route path="/model" element={<div className="flex flex-1 h-screen"><ModelBoard /></div>} />
          <Route path="/hypotheses" element={<Hypotheses />} />
          <Route path="/network" element={<div className="flex-1" style={{ height: '100vh' }}><KeywordNetwork /></div>} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
