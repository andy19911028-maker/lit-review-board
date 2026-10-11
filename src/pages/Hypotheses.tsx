import { useState } from 'react'
import { useStore } from '../lib/store'
import { nanoid } from '../lib/utils'
import type { Hypothesis } from '../types'
import { Plus, X, CheckCircle2, Circle, BookOpen, Sparkles, Loader2 } from 'lucide-react'

const EMPTY: Omit<Hypothesis, 'id'> = {
  paper_id: '',
  number: '',
  content: '',
  type: 'hypothesis',
  supported: undefined,
  variable_ids: [],
}

export default function Hypotheses() {
  const { papers, variables, hypotheses, addHypothesis, updateHypothesis, deleteHypothesis } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [filterPaper, setFilterPaper] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiProgress, setAiProgress] = useState('')
  const [aiError, setAiError] = useState('')

  const handleAiGenerate = async () => {
    if (!papers.length) { setAiError('請先新增文獻'); return }
    setAiLoading(true); setAiError('')
    let added = 0
    for (const paper of papers) {
      setAiProgress(`分析「${paper.title.slice(0, 20)}...」(${papers.indexOf(paper) + 1}/${papers.length})`)
      try {
        const res = await fetch('/api/generate-hypotheses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: paper.title, abstract: paper.abstract ?? '' }),
        })
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json() as { hypotheses: { number: string; type: string; content: string }[] }
        for (const h of (data.hypotheses ?? [])) {
          const dup = hypotheses.find((eh) => eh.paper_id === paper.id && eh.number === h.number)
          if (dup) continue
          addHypothesis({ id: nanoid(), paper_id: paper.id, number: h.number, content: h.content, type: h.type as Hypothesis['type'], variable_ids: [] })
          added++
        }
      } catch (e) { console.error(e) }
    }
    setAiLoading(false); setAiProgress('')
    if (added === 0) setAiError('未找到假設/命題（摘要資訊可能不足）')
  }

  const filtered = hypotheses.filter((h) => !filterPaper || h.paper_id === filterPaper)

  const grouped = filtered.reduce<Record<string, Hypothesis[]>>((acc, h) => {
    acc[h.paper_id] = [...(acc[h.paper_id] || []), h]
    return acc
  }, {})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.content.trim() || !form.paper_id) return
    addHypothesis({ ...form, id: nanoid() })
    setShowForm(false)
    setForm(EMPTY)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">假設 / 命題</h2>
          <p className="text-sm text-gray-400 mt-0.5">{hypotheses.length} 項</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAiGenerate}
            disabled={aiLoading}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {aiLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {aiLoading ? '生成中...' : 'AI 自動生成'}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <Plus size={16} /> 手動新增
          </button>
        </div>
      </div>
      {aiProgress && <p className="text-xs text-emerald-600 bg-emerald-50 rounded px-3 py-1.5 mb-3">{aiProgress}</p>}
      {aiError && <p className="text-xs text-red-500 mb-3">{aiError}</p>}

      <div className="mb-5">
        <select
          value={filterPaper}
          onChange={(e) => setFilterPaper(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">全部文獻</option>
          {papers.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.year})</option>)}
        </select>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">尚無假設/命題</div>
      )}

      {Object.entries(grouped).map(([paperId, hyps]) => {
        const paper = papers.find((p) => p.id === paperId)
        return (
          <div key={paperId} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={14} className="text-blue-500" />
              <span className="text-sm font-semibold text-gray-700">{paper?.title} ({paper?.year})</span>
            </div>
            <div className="space-y-2">
              {[...hyps].sort((a, b) => a.number.localeCompare(b.number)).map((h) => (
                <div key={h.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
                  <button
                    onClick={() => updateHypothesis(h.id, { supported: h.supported === true ? undefined : true })}
                    className={`mt-0.5 shrink-0 ${h.supported === true ? 'text-emerald-500' : 'text-gray-300 hover:text-emerald-400'}`}
                  >
                    {h.supported === true ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        h.type === 'hypothesis' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'
                      }`}>
                        {h.type === 'hypothesis' ? '假設' : '命題'} {h.number}
                      </span>
                      {h.supported !== undefined && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          h.supported ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                        }`}>
                          {h.supported ? '支持' : '不支持'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{h.content}</p>
                    {h.variable_ids.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {h.variable_ids.map((vid) => {
                          const v = variables.find((vv) => vv.id === vid)
                          return v ? <span key={vid} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{v.name}</span> : null
                        })}
                      </div>
                    )}
                  </div>
                  <button onClick={() => deleteHypothesis(h.id)} className="text-gray-300 hover:text-red-400 p-1">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-800">新增假設 / 命題</h3>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">類型</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Hypothesis['type'] }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="hypothesis">假設 (Hypothesis)</option>
                    <option value="proposition">命題 (Proposition)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">編號</label>
                  <input value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                    placeholder="H1, H1a, P1..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">內容 *</label>
                <textarea required rows={3} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="假設內容..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">所屬文獻 *</label>
                <select required value={form.paper_id} onChange={(e) => setForm((f) => ({ ...f, paper_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="">請選擇</option>
                  {papers.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.year})</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">儲存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
