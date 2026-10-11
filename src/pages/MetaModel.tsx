import { useMemo, useState, useCallback } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useStore } from '../lib/store'
import { buildMetaModel, buildGapSummary, autoLayout } from '../lib/metamodel'
import { Layers, AlertTriangle, ChevronRight, Loader2, Lightbulb, GitMerge, RefreshCw } from 'lucide-react'

const TYPE_COLORS: Record<string, string> = {
  independent: '#3b82f6',
  dependent: '#8b5cf6',
  mediator: '#f59e0b',
  moderator: '#10b981',
  control: '#6b7280',
}

const TYPE_LABELS: Record<string, string> = {
  independent: '自變數',
  dependent: '依變數',
  mediator: '中介',
  moderator: '調節',
  control: '控制',
}

const CONSENSUS_COLORS: Record<string, string> = {
  positive: '#22c55e',
  negative: '#ef4444',
  mixed: '#f97316',
  unknown: '#9ca3af',
  contradictory: '#f59e0b',
}

const PRIORITY_COLORS = { high: 'bg-red-50 border-red-200 text-red-700', medium: 'bg-amber-50 border-amber-200 text-amber-700', low: 'bg-blue-50 border-blue-200 text-blue-700' }
const PRIORITY_LABELS = { high: '高', medium: '中', low: '低' }

type GapAnalysis = {
  gaps: { title: string; description: string; researchQuestion: string; priority: 'high' | 'medium' | 'low' }[]
  contradictions: { relationship: string; explanation: string }[]
  synthesis: string
}

function MetaModelInner() {
  const { papers, variables, relationships, addTokenUsage } = useStore()
  const [showGapEdges, setShowGapEdges] = useState(true)
  const [panelOpen, setPanelOpen] = useState(true)
  const [analysis, setAnalysis] = useState<GapAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')

  const meta = useMemo(() => buildMetaModel(variables, relationships), [variables, relationships])
  const positions = useMemo(() => autoLayout(meta.variables), [meta.variables])

  const initialNodes: Node[] = useMemo(() => {
    return Array.from(meta.variables.values()).map((v) => {
      const pos = positions[v.key] ?? { x: 0, y: 0 }
      const size = Math.min(44 + v.paperIds.length * 8, 80)
      const color = TYPE_COLORS[v.type] ?? '#6b7280'
      return {
        id: v.key,
        position: pos,
        data: { label: v.name },
        style: {
          background: color,
          color: '#fff',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          padding: '6px 10px',
          width: 'auto',
          minWidth: size,
          maxWidth: 180,
          border: `2px solid ${color}`,
          boxShadow: `0 2px 8px ${color}33`,
        },
      }
    })
  }, [meta.variables, positions])

  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = []

    for (const rel of meta.relationships.values()) {
      const color = CONSENSUS_COLORS[rel.consensus] ?? '#9ca3af'
      const isDashed = rel.consensus === 'contradictory' || rel.consensus === 'mixed'
      edges.push({
        id: rel.key,
        source: rel.fromKey,
        target: rel.toKey,
        label: `${rel.paperIds.length}篇 · ${rel.consensus === 'contradictory' ? '⚡矛盾' : rel.consensus}`,
        style: {
          stroke: color,
          strokeWidth: Math.min(1 + rel.paperIds.length, 4),
          strokeDasharray: isDashed ? '5 3' : undefined,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color },
        labelStyle: { fontSize: 10, fill: color, fontWeight: 600 },
        labelBgStyle: { fill: '#fff', fillOpacity: 0.9 },
        data: { isGap: false },
      })
    }

    if (showGapEdges) {
      for (const gap of meta.pathGaps) {
        const edgeId = `gap-${gap.fromKey}→${gap.toKey}`
        if (edges.find((e) => e.id === edgeId)) continue
        const viaName = meta.variables.get(gap.viaKey)?.name ?? gap.viaKey
        edges.push({
          id: edgeId,
          source: gap.fromKey,
          target: gap.toKey,
          label: `缺口 via ${viaName}`,
          style: { stroke: '#d1d5db', strokeWidth: 1, strokeDasharray: '4 4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#d1d5db' },
          labelStyle: { fontSize: 9, fill: '#9ca3af' },
          labelBgStyle: { fill: '#fff', fillOpacity: 0.85 },
          data: { isGap: true },
        })
      }
    }

    return edges
  }, [meta.relationships, meta.pathGaps, showGapEdges])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true)
    setAnalyzeError('')
    try {
      const summary = buildGapSummary(meta, papers)
      const res = await fetch('/api/analyze-gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error ?? `錯誤 ${res.status}`)
      }
      const data = await res.json()
      if (data._usage) addTokenUsage(data._usage)
      setAnalysis(data)
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : '分析失敗')
    } finally {
      setAnalyzing(false)
    }
  }, [meta, papers, addTokenUsage])

  if (variables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
        <Layers size={40} className="opacity-30" />
        <p className="text-sm">尚無變數資料，請先到「模型白板」分析文獻</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* React Flow canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.2}
        >
          <Background />
          <Controls />
          <MiniMap zoomable pannable />
        </ReactFlow>

        {/* Top bar */}
        <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
          <div className="bg-white rounded-lg shadow border border-gray-200 px-3 py-1.5 flex items-center gap-4 text-xs">
            <span className="font-semibold text-gray-700 flex items-center gap-1.5"><GitMerge size={13} /> 整合模型</span>
            <span className="text-gray-500">{meta.variables.size} 構念 · {meta.relationships.size} 關係 · {meta.pathGaps.length} 路徑缺口</span>
          </div>
          <label className="bg-white rounded-lg shadow border border-gray-200 px-3 py-1.5 flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={showGapEdges} onChange={(e) => setShowGapEdges(e.target.checked)} className="w-3 h-3" />
            顯示缺口邊
          </label>
        </div>

        {/* Legend */}
        <div className="absolute bottom-12 left-3 bg-white rounded-lg shadow border border-gray-100 p-2.5 z-10 text-xs">
          <div className="font-semibold text-gray-600 mb-1.5">構念類型</div>
          {Object.entries(TYPE_COLORS).map(([t, c]) => (
            <div key={t} className="flex items-center gap-1.5 mb-0.5">
              <div className="w-2.5 h-2.5 rounded" style={{ background: c }} />
              <span className="text-gray-500">{TYPE_LABELS[t]}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 mt-1.5 pt-1.5 font-semibold text-gray-600 mb-1">關係方向</div>
          {[['positive','正向'],['negative','負向'],['contradictory','矛盾'],['unknown','不明']].map(([c, l]) => (
            <div key={c} className="flex items-center gap-1.5 mb-0.5">
              <div className="w-4 h-0.5" style={{ background: CONSENSUS_COLORS[c] }} />
              <span className="text-gray-500">{l}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-4 h-0.5 border-b border-dashed border-gray-300" />
            <span className="text-gray-500">路徑缺口</span>
          </div>
        </div>
      </div>

      {/* Side panel toggle */}
      <button
        onClick={() => setPanelOpen((o) => !o)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white border border-gray-200 rounded-l-lg p-1.5 shadow hover:bg-gray-50"
        style={{ right: panelOpen ? 320 : 0 }}
      >
        <ChevronRight size={14} className={`transition-transform ${panelOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Analysis panel */}
      {panelOpen && (
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <Lightbulb size={15} className="text-amber-500" /> 研究缺口分析
            </h3>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {analyzing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              {analyzing ? '分析中...' : 'AI 分析'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Path gaps summary */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">偵測到的路徑缺口（{meta.pathGaps.length}）</h4>
              {meta.pathGaps.length === 0 ? (
                <p className="text-gray-400 text-xs">無路徑缺口</p>
              ) : (
                <ul className="space-y-1.5">
                  {meta.pathGaps.slice(0, 8).map((g, i) => (
                    <li key={i} className="text-xs bg-gray-50 rounded p-2 text-gray-600">
                      <span className="font-medium">{meta.variables.get(g.fromKey)?.name}</span>
                      {' → '}
                      <span className="text-gray-400 italic">[{meta.variables.get(g.viaKey)?.name}]</span>
                      {' → '}
                      <span className="font-medium">{meta.variables.get(g.toKey)?.name}</span>
                      <span className="text-amber-600 ml-1">← 未驗證</span>
                    </li>
                  ))}
                  {meta.pathGaps.length > 8 && (
                    <li className="text-xs text-gray-400 text-center">還有 {meta.pathGaps.length - 8} 個缺口…</li>
                  )}
                </ul>
              )}
            </div>

            {/* Contradictions summary */}
            {Array.from(meta.relationships.values()).filter((r) => r.consensus === 'contradictory').length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                  <AlertTriangle size={11} className="text-amber-500" /> 矛盾關係
                </h4>
                <ul className="space-y-1.5">
                  {Array.from(meta.relationships.values())
                    .filter((r) => r.consensus === 'contradictory')
                    .map((r) => (
                      <li key={r.key} className="text-xs bg-amber-50 border border-amber-100 rounded p-2 text-amber-800">
                        {meta.variables.get(r.fromKey)?.name} → {meta.variables.get(r.toKey)?.name}
                        <div className="text-amber-600 mt-0.5">
                          {Object.entries(r.directionCounts).map(([d, n]) => `${d}×${n}`).join(' / ')}
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* AI Analysis results */}
            {analyzeError && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700">{analyzeError}</div>
            )}

            {analysis && (
              <>
                {analysis.synthesis && (
                  <div className="bg-blue-50 border border-blue-100 rounded p-3 text-xs text-blue-800">
                    <div className="font-semibold mb-1">整體評估</div>
                    {analysis.synthesis}
                  </div>
                )}

                {analysis.gaps.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">AI 建議研究缺口</h4>
                    <ul className="space-y-2">
                      {analysis.gaps.map((g, i) => (
                        <li key={i} className={`border rounded p-3 text-xs ${PRIORITY_COLORS[g.priority]}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold">{g.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white bg-opacity-60 font-medium">
                              優先度：{PRIORITY_LABELS[g.priority]}
                            </span>
                          </div>
                          <p className="mb-1.5 leading-relaxed">{g.description}</p>
                          <div className="bg-white bg-opacity-60 rounded px-2 py-1.5 font-medium leading-snug">
                            💡 {g.researchQuestion}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.contradictions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">矛盾解讀</h4>
                    <ul className="space-y-2">
                      {analysis.contradictions.map((c, i) => (
                        <li key={i} className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
                          <div className="font-semibold mb-1">{c.relationship}</div>
                          <p className="leading-relaxed">{c.explanation}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {!analysis && !analyzing && (
              <p className="text-gray-400 text-xs text-center py-4">按「AI 分析」讓 AI 解讀缺口並建議研究問題</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MetaModel() {
  return (
    <ReactFlowProvider>
      <MetaModelInner />
    </ReactFlowProvider>
  )
}
