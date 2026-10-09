import { useCallback, useState, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useStore } from '../lib/store'
import { nanoid, DIRECTION_COLORS, DIRECTION_LABELS, VARIABLE_TYPE_COLORS, VARIABLE_TYPE_LABELS } from '../lib/utils'
import type { Variable, Relationship } from '../types'
import { Plus, X, ChevronRight, BookOpen } from 'lucide-react'

// ── Custom Variable Node ────────────────────────────────────────────────────
function VariableNode({ data }: { data: { variable: Variable; onSelect: (v: Variable) => void } }) {
  const { variable, onSelect } = data
  const color = VARIABLE_TYPE_COLORS[variable.type]
  return (
    <div
      className="rounded-xl border-2 shadow-sm bg-white cursor-pointer hover:shadow-md transition-shadow min-w-[130px]"
      style={{ borderColor: color }}
      onClick={() => onSelect(variable)}
    >
      <Handle type="target" position={Position.Left} style={{ background: color }} />
      <div className="px-3 py-2">
        <div className="text-xs font-semibold text-gray-800 leading-tight">{variable.name}</div>
        <div className="text-[10px] mt-0.5 font-medium" style={{ color }}>
          {VARIABLE_TYPE_LABELS[variable.type]}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: color }} />
    </div>
  )
}

const nodeTypes = { variable: VariableNode }

// ── Main ────────────────────────────────────────────────────────────────────
export default function ModelBoard() {
  const {
    papers, variables, relationships, selectedPaperIds,
    addVariable, addRelationship,
    setActiveRelationship, activeRelationshipId,
    syncKeywords,
  } = useStore()

  // Filter by selected papers (or show all if none selected)
  const activePaperIds = selectedPaperIds.length > 0 ? selectedPaperIds : papers.map((p) => p.id)
  const activeVars = variables.filter((v) => v.paper_ids.some((pid) => activePaperIds.includes(pid)))
  const activeRels = relationships.filter((r) => activePaperIds.includes(r.paper_id))

  const initNodes: Node[] = useMemo(() =>
    activeVars.map((v, i) => ({
      id: v.id,
      type: 'variable',
      position: { x: 80 + (i % 4) * 180, y: 80 + Math.floor(i / 4) * 140 },
      data: { variable: v, onSelect: () => {} },
    })), [activeVars.length])

  const initEdges: Edge[] = useMemo(() =>
    activeRels.map((r) => ({
      id: r.id,
      source: r.from_variable_id,
      target: r.to_variable_id,
      label: DIRECTION_LABELS[r.direction],
      style: { stroke: DIRECTION_COLORS[r.direction], strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: DIRECTION_COLORS[r.direction] },
      labelStyle: { fontSize: 10, fill: DIRECTION_COLORS[r.direction], fontWeight: 600 },
      labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
    })), [activeRels.length])

  const [nodes, , onNodesChange] = useNodesState(initNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges)

  const [showAddVar, setShowAddVar] = useState(false)
  const [showAddRel, setShowAddRel] = useState(false)
  const [selectedVar, setSelectedVar] = useState<Variable | null>(null)

  const [varForm, setVarForm] = useState({ name: '', type: 'independent' as Variable['type'], description: '', paper_id: '' })
  const [relForm, setRelForm] = useState({
    from_variable_id: '', to_variable_id: '', direction: 'positive' as Relationship['direction'],
    explanation: '', original_text: '', paper_id: '', hypothesis_ids: [] as string[],
  })

  const nodesWithHandler: Node[] = nodes.map((n) => ({
    ...n,
    data: { ...n.data, onSelect: (v: Variable) => setSelectedVar(v) },
  }))

  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target) return
    setRelForm((f) => ({ ...f, from_variable_id: conn.source!, to_variable_id: conn.target! }))
    setShowAddRel(true)
    setEdges((e) => addEdge(conn, e))
  }, [setEdges])

  const handleAddVar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!varForm.name.trim() || !varForm.paper_id) return
    addVariable({ id: nanoid(), ...varForm, paper_ids: [varForm.paper_id], keywords: [] })
    syncKeywords()
    setShowAddVar(false)
    setVarForm({ name: '', type: 'independent', description: '', paper_id: '' })
  }

  const handleAddRel = (e: React.FormEvent) => {
    e.preventDefault()
    if (!relForm.from_variable_id || !relForm.to_variable_id || !relForm.paper_id) return
    addRelationship({ id: nanoid(), ...relForm })
    setShowAddRel(false)
  }

  const activeRel = activeRelationshipId
    ? relationships.find((r) => r.id === activeRelationshipId)
    : null
  const activeRelPaper = activeRel ? papers.find((p) => p.id === activeRel.paper_id) : null

  return (
    <div className="flex h-full">
      {/* Toolbar */}
      <div className="w-56 bg-white border-r border-gray-100 p-4 flex flex-col gap-3 shrink-0 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">工具</div>
        <button
          onClick={() => setShowAddVar(true)}
          className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100"
        >
          <Plus size={14} /> 新增變數
        </button>
        <button
          onClick={() => setShowAddRel(true)}
          className="flex items-center gap-2 px-3 py-2 bg-violet-50 text-violet-700 rounded-lg text-sm hover:bg-violet-100"
        >
          <Plus size={14} /> 新增關係
        </button>

        <div className="border-t pt-3 mt-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">顯示文獻</div>
          {papers.length === 0 ? (
            <p className="text-xs text-gray-400">先至文獻庫新增</p>
          ) : (
            papers.map((p) => (
              <label key={p.id} className="flex items-start gap-2 mb-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activePaperIds.includes(p.id)}
                  readOnly
                  className="mt-0.5 accent-blue-600"
                />
                <span className="text-xs text-gray-600 line-clamp-2">{p.title} ({p.year})</span>
              </label>
            ))
          )}
        </div>

        <div className="border-t pt-3 mt-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">圖例</div>
          {Object.entries(VARIABLE_TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
              <span className="text-xs text-gray-500">{VARIABLE_TYPE_LABELS[type as Variable['type']]}</span>
            </div>
          ))}
          <div className="mt-2 space-y-1">
            {Object.entries(DIRECTION_COLORS).map(([dir, color]) => (
              <div key={dir} className="flex items-center gap-2">
                <div className="w-5 h-0.5 rounded" style={{ background: color }} />
                <span className="text-xs text-gray-500">{DIRECTION_LABELS[dir as Relationship['direction']]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Flow Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodesWithHandler}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={(_, edge) => setActiveRelationship(edge.id)}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* Right Detail Panel */}
      {(selectedVar || activeRel) && (
        <div className="w-72 bg-white border-l border-gray-100 p-5 overflow-y-auto shrink-0">
          <button
            onClick={() => { setSelectedVar(null); setActiveRelationship(null) }}
            className="mb-4 p-1 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>

          {selectedVar && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">變數</div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">{selectedVar.name}</h3>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: VARIABLE_TYPE_COLORS[selectedVar.type] + '22', color: VARIABLE_TYPE_COLORS[selectedVar.type] }}
              >
                {VARIABLE_TYPE_LABELS[selectedVar.type]}
              </span>
              {selectedVar.description && (
                <p className="text-sm text-gray-600 mt-3">{selectedVar.description}</p>
              )}
              <div className="mt-3">
                <div className="text-xs text-gray-400 mb-1">出現於</div>
                {selectedVar.paper_ids.map((pid) => {
                  const p = papers.find((pp) => pp.id === pid)
                  return p ? <div key={pid} className="text-xs text-gray-600 flex items-center gap-1"><BookOpen size={10} />{p.title} ({p.year})</div> : null
                })}
              </div>
              <div className="mt-4">
                <div className="text-xs text-gray-400 mb-1">相關關係</div>
                {relationships
                  .filter((r) => r.from_variable_id === selectedVar.id || r.to_variable_id === selectedVar.id)
                  .map((r) => {
                    const other = variables.find((v) => v.id === (r.from_variable_id === selectedVar.id ? r.to_variable_id : r.from_variable_id))
                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer hover:text-blue-600 mb-1"
                        onClick={() => { setActiveRelationship(r.id); setSelectedVar(null) }}
                      >
                        <ChevronRight size={10} style={{ color: DIRECTION_COLORS[r.direction] }} />
                        {other?.name}
                        <span style={{ color: DIRECTION_COLORS[r.direction] }}>({DIRECTION_LABELS[r.direction]})</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {activeRel && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">關係</div>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-medium text-sm text-gray-700">
                  {variables.find((v) => v.id === activeRel.from_variable_id)?.name}
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: DIRECTION_COLORS[activeRel.direction] + '22', color: DIRECTION_COLORS[activeRel.direction] }}
                >
                  {DIRECTION_LABELS[activeRel.direction]}
                </span>
                <span className="font-medium text-sm text-gray-700">
                  {variables.find((v) => v.id === activeRel.to_variable_id)?.name}
                </span>
              </div>

              {activeRelPaper && (
                <div className="text-xs text-gray-400 flex items-center gap-1 mb-3">
                  <BookOpen size={10} /> {activeRelPaper.title} ({activeRelPaper.year})
                </div>
              )}

              {activeRel.explanation && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-gray-500 mb-1">解釋</div>
                  <p className="text-sm text-gray-700 leading-relaxed">{activeRel.explanation}</p>
                </div>
              )}

              {activeRel.original_text && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-lg">
                  <div className="text-xs font-semibold text-amber-700 mb-1">原文引用</div>
                  <p className="text-xs text-amber-800 leading-relaxed italic">"{activeRel.original_text}"</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Variable */}
      {showAddVar && (
        <Modal title="新增變數" onClose={() => setShowAddVar(false)}>
          <form onSubmit={handleAddVar} className="space-y-3">
            <Field label="變數名稱 *">
              <input required value={varForm.name} onChange={(e) => setVarForm((f) => ({ ...f, name: e.target.value }))} className={INPUT} />
            </Field>
            <Field label="類型">
              <select value={varForm.type} onChange={(e) => setVarForm((f) => ({ ...f, type: e.target.value as Variable['type'] }))} className={INPUT}>
                {Object.entries(VARIABLE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="說明">
              <textarea rows={2} value={varForm.description} onChange={(e) => setVarForm((f) => ({ ...f, description: e.target.value }))} className={INPUT + ' resize-none'} />
            </Field>
            <Field label="所屬文獻 *">
              <select required value={varForm.paper_id} onChange={(e) => setVarForm((f) => ({ ...f, paper_id: e.target.value }))} className={INPUT}>
                <option value="">請選擇</option>
                {papers.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.year})</option>)}
              </select>
            </Field>
            <ModalActions onCancel={() => setShowAddVar(false)} />
          </form>
        </Modal>
      )}

      {/* Modal: Add Relationship */}
      {showAddRel && (
        <Modal title="新增關係" onClose={() => setShowAddRel(false)}>
          <form onSubmit={handleAddRel} className="space-y-3">
            <Field label="起始變數 *">
              <select required value={relForm.from_variable_id} onChange={(e) => setRelForm((f) => ({ ...f, from_variable_id: e.target.value }))} className={INPUT}>
                <option value="">請選擇</option>
                {variables.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Field>
            <Field label="終止變數 *">
              <select required value={relForm.to_variable_id} onChange={(e) => setRelForm((f) => ({ ...f, to_variable_id: e.target.value }))} className={INPUT}>
                <option value="">請選擇</option>
                {variables.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Field>
            <Field label="方向">
              <select value={relForm.direction} onChange={(e) => setRelForm((f) => ({ ...f, direction: e.target.value as Relationship['direction'] }))} className={INPUT}>
                {Object.entries(DIRECTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="解釋">
              <textarea rows={2} value={relForm.explanation} onChange={(e) => setRelForm((f) => ({ ...f, explanation: e.target.value }))} className={INPUT + ' resize-none'} placeholder="為什麼是正/負相關？" />
            </Field>
            <Field label="原文引用">
              <textarea rows={3} value={relForm.original_text} onChange={(e) => setRelForm((f) => ({ ...f, original_text: e.target.value }))} className={INPUT + ' resize-none'} placeholder="貼上文獻原文..." />
            </Field>
            <Field label="所屬文獻 *">
              <select required value={relForm.paper_id} onChange={(e) => setRelForm((f) => ({ ...f, paper_id: e.target.value }))} className={INPUT}>
                <option value="">請選擇</option>
                {papers.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.year})</option>)}
              </select>
            </Field>
            <ModalActions onCancel={() => setShowAddRel(false)} />
          </form>
        </Modal>
      )}
    </div>
  )
}

const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function ModalActions({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">儲存</button>
    </div>
  )
}
