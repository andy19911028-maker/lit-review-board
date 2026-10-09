import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import Dashboard from './pages/Dashboard'
import Literature from './pages/Literature'
import ModelBoard from './pages/ModelBoard'
import Hypotheses from './pages/Hypotheses'
import KeywordNetwork from './pages/KeywordNetwork'
import { useSupabaseSync, migrateLocalToCloud } from './lib/useSync'
import { isSupabaseEnabled } from './lib/supabase'
import { useStore } from './lib/store'
import { Cloud, HardDrive, AlertTriangle, Upload, CheckCircle2, Loader2 } from 'lucide-react'
import { useState } from 'react'

function CloudBadge({ status }: { status: string }) {
  const icon = status === 'loading'
    ? <Loader2 size={11} className="animate-spin" />
    : status === 'ready'
    ? <Cloud size={11} />
    : <HardDrive size={11} />

  const label = status === 'loading' ? '連線中...'
    : status === 'ready' ? '雲端同步'
    : status === 'no_tables' ? '待初始化'
    : status === 'error' ? '連線錯誤'
    : '本地模式'

  const cls = status === 'ready'
    ? 'bg-emerald-900/40 text-emerald-400'
    : status === 'loading'
    ? 'bg-blue-900/40 text-blue-400'
    : status === 'no_tables' || status === 'error'
    ? 'bg-amber-900/40 text-amber-400'
    : 'bg-gray-800 text-gray-500'

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mx-2 mb-2 ${cls}`}>
      {icon} {label}
    </div>
  )
}

function SetupBanner({ onMigrate }: { onMigrate: () => Promise<void> }) {
  const [migrating, setMigrating] = useState(false)
  const [done, setDone] = useState(false)

  const handleMigrate = async () => {
    setMigrating(true)
    await onMigrate()
    setDone(true)
    setMigrating(false)
  }

  if (done) return (
    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-2.5">
      <CheckCircle2 size={14} /> 資料已上傳至雲端，請重新整理頁面
    </div>
  )

  return (
    <div className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs px-4 py-2.5">
      <AlertTriangle size={14} className="shrink-0 text-amber-500" />
      <span className="flex-1">
        <strong>資料表尚未建立</strong> — 請先到{' '}
        <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
          className="underline font-medium">Supabase Dashboard</a>
        {' '}的 SQL Editor，執行專案內{' '}
        <code className="bg-amber-100 px-1 rounded">supabase/schema.sql</code>{' '}的內容
      </span>
      <button onClick={handleMigrate} disabled={migrating}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 shrink-0 disabled:opacity-60">
        {migrating ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
        {migrating ? '上傳中...' : '上傳本地資料'}
      </button>
    </div>
  )
}

function AppInner() {
  const { status } = useSupabaseSync()
  const { papers, variables, relationships, hypotheses, nodePositions } = useStore()

  const handleMigrate = async () => {
    await migrateLocalToCloud(papers, variables, relationships, hypotheses, nodePositions)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex flex-col w-56 bg-gray-900 shrink-0">
        <Sidebar />
        <CloudBadge status={status} />
      </div>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {isSupabaseEnabled && status === 'no_tables' && (
          <SetupBanner onMigrate={handleMigrate} />
        )}
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
