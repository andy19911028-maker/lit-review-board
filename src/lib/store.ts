import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Paper, Variable, Relationship, Hypothesis, Keyword } from '../types'

interface AppState {
  papers: Paper[]
  variables: Variable[]
  relationships: Relationship[]
  hypotheses: Hypothesis[]
  keywords: Keyword[]
  selectedPaperIds: string[]
  activeRelationshipId: string | null
  nodePositions: Record<string, { x: number; y: number }>

  // Papers
  addPaper: (paper: Paper) => void
  updatePaper: (id: string, data: Partial<Paper>) => void
  deletePaper: (id: string) => void

  // Variables
  addVariable: (v: Variable) => void
  updateVariable: (id: string, data: Partial<Variable>) => void
  deleteVariable: (id: string) => void

  // Relationships
  addRelationship: (r: Relationship) => void
  updateRelationship: (id: string, data: Partial<Relationship>) => void
  deleteRelationship: (id: string) => void

  // Hypotheses
  addHypothesis: (h: Hypothesis) => void
  updateHypothesis: (id: string, data: Partial<Hypothesis>) => void
  deleteHypothesis: (id: string) => void

  // Keywords
  syncKeywords: () => void

  // UI
  setSelectedPapers: (ids: string[]) => void
  toggleSelectedPaper: (id: string) => void
  setActiveRelationship: (id: string | null) => void
  setNodePosition: (id: string, pos: { x: number; y: number }) => void
  setNodePositions: (positions: Record<string, { x: number; y: number }>) => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      papers: [],
      variables: [],
      relationships: [],
      hypotheses: [],
      keywords: [],
      selectedPaperIds: [],
      activeRelationshipId: null,
      nodePositions: {},

      addPaper: (paper) => set((s) => ({ papers: [...s.papers, paper] })),
      updatePaper: (id, data) =>
        set((s) => ({ papers: s.papers.map((p) => (p.id === id ? { ...p, ...data } : p)) })),
      deletePaper: (id) =>
        set((s) => ({
          papers: s.papers.filter((p) => p.id !== id),
          selectedPaperIds: s.selectedPaperIds.filter((pid) => pid !== id),
        })),

      addVariable: (v) => set((s) => ({ variables: [...s.variables, v] })),
      updateVariable: (id, data) =>
        set((s) => ({ variables: s.variables.map((v) => (v.id === id ? { ...v, ...data } : v)) })),
      deleteVariable: (id) =>
        set((s) => ({ variables: s.variables.filter((v) => v.id !== id) })),

      addRelationship: (r) => set((s) => ({ relationships: [...s.relationships, r] })),
      updateRelationship: (id, data) =>
        set((s) => ({
          relationships: s.relationships.map((r) => (r.id === id ? { ...r, ...data } : r)),
        })),
      deleteRelationship: (id) =>
        set((s) => ({ relationships: s.relationships.filter((r) => r.id !== id) })),

      addHypothesis: (h) => set((s) => ({ hypotheses: [...s.hypotheses, h] })),
      updateHypothesis: (id, data) =>
        set((s) => ({
          hypotheses: s.hypotheses.map((h) => (h.id === id ? { ...h, ...data } : h)),
        })),
      deleteHypothesis: (id) =>
        set((s) => ({ hypotheses: s.hypotheses.filter((h) => h.id !== id) })),

      syncKeywords: () => {
        const { papers, variables } = get()
        const kwMap = new Map<string, Keyword>()

        const addKw = (
          name: string,
          paperId?: string,
          varId?: string,
          relId?: string
        ) => {
          const key = name.toLowerCase().trim()
          if (!key) return
          if (!kwMap.has(key)) {
            kwMap.set(key, {
              id: key,
              name: name.trim(),
              paper_ids: [],
              variable_ids: [],
              relationship_ids: [],
            })
          }
          const kw = kwMap.get(key)!
          if (paperId && !kw.paper_ids.includes(paperId)) kw.paper_ids.push(paperId)
          if (varId && !kw.variable_ids.includes(varId)) kw.variable_ids.push(varId)
          if (relId && !kw.relationship_ids.includes(relId)) kw.relationship_ids.push(relId)
        }

        papers.forEach((p) => p.keywords.forEach((k) => addKw(k, p.id)))
        variables.forEach((v) => v.keywords.forEach((k) => addKw(k, undefined, v.id)))

        set({ keywords: Array.from(kwMap.values()) })
      },

      setSelectedPapers: (ids) => set({ selectedPaperIds: ids }),
      toggleSelectedPaper: (id) =>
        set((s) => ({
          selectedPaperIds: s.selectedPaperIds.includes(id)
            ? s.selectedPaperIds.filter((pid) => pid !== id)
            : [...s.selectedPaperIds, id],
        })),
      setActiveRelationship: (id) => set({ activeRelationshipId: id }),
      setNodePosition: (id, pos) =>
        set((s) => ({ nodePositions: { ...s.nodePositions, [id]: pos } })),
      setNodePositions: (positions) =>
        set((s) => ({ nodePositions: { ...s.nodePositions, ...positions } })),
    }),
    { name: 'lit-review-store' }
  )
)
