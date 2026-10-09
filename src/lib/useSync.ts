import { useEffect } from 'react'
import { supabase, isSupabaseEnabled } from './supabase'
import { useStore } from './store'
import type { Paper, Variable, Relationship, Hypothesis } from '../types'

// 從 Supabase 載入所有資料進 store
export function useSupabaseSync() {
  const { papers, addPaper, addVariable, addRelationship, addHypothesis, setNodePositions, syncKeywords } = useStore()

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) return
    // Only load if local store is empty
    if (papers.length > 0) return

    const load = async () => {
      const db = supabase!
      const [p, v, r, h, np] = await Promise.all([
        db.from('papers').select('*').order('created_at'),
        db.from('variables').select('*'),
        db.from('relationships').select('*'),
        db.from('hypotheses').select('*'),
        db.from('node_positions').select('*'),
      ])
      ;(p.data ?? []).forEach((row: Paper) => addPaper(row))
      ;(v.data ?? []).forEach((row: Variable) => addVariable(row))
      ;(r.data ?? []).forEach((row: Relationship) => addRelationship(row))
      ;(h.data ?? []).forEach((row: Hypothesis) => addHypothesis(row))
      const positions: Record<string, { x: number; y: number }> = {}
      ;(np.data ?? []).forEach((row: { variable_id: string; x: number; y: number }) => {
        positions[row.variable_id] = { x: row.x, y: row.y }
      })
      setNodePositions(positions)
      syncKeywords()
    }

    load()
  }, [])
}

// 推送單一 paper 到 Supabase
export async function pushPaper(paper: Paper) {
  if (!isSupabaseEnabled || !supabase) return
  await supabase.from('papers').upsert(paper)
}

export async function deletePaperRemote(id: string) {
  if (!isSupabaseEnabled || !supabase) return
  await supabase.from('papers').delete().eq('id', id)
}

export async function pushVariable(v: Variable) {
  if (!isSupabaseEnabled || !supabase) return
  await supabase.from('variables').upsert(v)
}

export async function deleteVariableRemote(id: string) {
  if (!isSupabaseEnabled || !supabase) return
  await supabase.from('variables').delete().eq('id', id)
}

export async function pushRelationship(r: Relationship) {
  if (!isSupabaseEnabled || !supabase) return
  await supabase.from('relationships').upsert(r)
}

export async function deleteRelationshipRemote(id: string) {
  if (!isSupabaseEnabled || !supabase) return
  await supabase.from('relationships').delete().eq('id', id)
}

export async function pushHypothesis(h: Hypothesis) {
  if (!isSupabaseEnabled || !supabase) return
  await supabase.from('hypotheses').upsert(h)
}

export async function deleteHypothesisRemote(id: string) {
  if (!isSupabaseEnabled || !supabase) return
  await supabase.from('hypotheses').delete().eq('id', id)
}

export async function pushNodePosition(variableId: string, pos: { x: number; y: number }) {
  if (!isSupabaseEnabled || !supabase) return
  await supabase.from('node_positions').upsert({ variable_id: variableId, x: pos.x, y: pos.y })
}
