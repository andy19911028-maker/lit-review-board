import { useState } from 'react'
import { useStore } from '../lib/store'
import { nanoid } from '../lib/utils'
import type { Paper } from '../types'
import { Plus, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react'

const EMPTY_FORM: Omit<Paper, 'id' | 'created_at'> = {
  title: '',
  authors: '',
  year: new Date().getFullYear(),
  journal: '',
  abstract: '',
  doi: '',
  keywords: [],
}

export default function Literature() {
  const { papers, addPaper, deletePaper, selectedPaperIds, toggleSelectedPaper, syncKeywords } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [kwInput, setKwInput] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = papers.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.authors.toLowerCase().includes(search.toLowerCase()) ||
      p.keywords.some((k) => k.toLowerCase().includes(search.toLowerCase()))
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    addPaper({ ...form, id: nanoid(), created_at: new Date().toISOString() })
    syncKeywords()
    setForm(EMPTY_FORM)
    setKwInput('')
    setShowForm(false)
  }

  const addKw = () => {
    const kw = kwInput.trim()
    if (kw && !form.keywords.includes(kw)) {
      setForm((f) => ({ ...f, keywords: [...f.keywords, kw] }))
    }
    setKwInput('')
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">文獻庫</h2>
          <p className="text-sm text-gray-400 mt-0.5">{papers.length} 篇文獻</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> 新增文獻
        </button>
      </div>

      <input
        type="text"
        placeholder="搜尋標題、作者、關鍵詞..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full mb-5 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="font-semibold text-gray-800">新增文獻</h3>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">標題 *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">作者</label>
                  <input
                    value={form.authors}
                    onChange={(e) => setForm((f) => ({ ...f, authors: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Author1, Author2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">年份</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">期刊</label>
                <input
                  value={form.journal}
                  onChange={(e) => setForm((f) => ({ ...f, journal: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">DOI</label>
                <input
                  value={form.doi}
                  onChange={(e) => setForm((f) => ({ ...f, doi: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">摘要</label>
                <textarea
                  rows={4}
                  value={form.abstract}
                  onChange={(e) => setForm((f) => ({ ...f, abstract: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">關鍵詞</label>
                <div className="flex gap-2 mb-2">
                  <input
                    value={kwInput}
                    onChange={(e) => setKwInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKw() } }}
                    placeholder="輸入後按 Enter 或加入"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <button type="button" onClick={addKw} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">加入</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.keywords.map((kw) => (
                    <span key={kw} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
                      {kw}
                      <button type="button" onClick={() => setForm((f) => ({ ...f, keywords: f.keywords.filter((k) => k !== kw) }))}><X size={10} /></button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">儲存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <BookOpenIcon />
            <p className="mt-2 text-sm">尚無文獻</p>
          </div>
        )}
        {filtered.map((p) => (
          <div
            key={p.id}
            className={`bg-white rounded-xl border shadow-sm transition-all ${
              selectedPaperIds.includes(p.id) ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-100'
            }`}
          >
            <div className="flex items-start gap-3 p-4">
              <input
                type="checkbox"
                checked={selectedPaperIds.includes(p.id)}
                onChange={() => toggleSelectedPaper(p.id)}
                className="mt-1 rounded accent-blue-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-gray-800 text-sm leading-snug">{p.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{p.authors} · {p.year}{p.journal ? ` · ${p.journal}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded"
                    >
                      {expanded === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      onClick={() => { deletePaper(p.id); syncKeywords() }}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.keywords.map((kw) => (
                    <span key={kw} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{kw}</span>
                  ))}
                </div>
              </div>
            </div>
            {expanded === p.id && p.abstract && (
              <div className="px-4 pb-4 ml-7 text-xs text-gray-500 leading-relaxed border-t pt-3">
                {p.abstract}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedPaperIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full shadow-lg text-sm flex items-center gap-3">
          已選 {selectedPaperIds.length} 篇文獻
          <a href="/model" className="text-blue-300 hover:text-blue-200 font-medium">前往模型白板 →</a>
        </div>
      )}
    </div>
  )
}

function BookOpenIcon() {
  return (
    <div className="flex justify-center text-gray-200">
      <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    </div>
  )
}
