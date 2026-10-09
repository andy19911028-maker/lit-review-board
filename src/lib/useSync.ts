import { useEffect, useState } from 'react'
import { supabase, isSupabaseEnabled } from './supabase'
import { useStore } from './store'
import type { Paper, Variable, Relationship, Hypothesis } from '../types'

export type SyncStatus = 'idle' | 'loading' | 'ready' | 'error' | 'no_tables'

// 從 Supabase 載入所有資料進 store
export function useSupabaseSync() {
  const [status, setStatus] = useState<SyncStatus>(isSupabaseEnabled ? 'loading' : 'idle')
  const [error, setError] = useState<string | null>(null)
  const { papers, addPaper, addVariable, addRelationship, addHypothesis, setNodePositions, syncKeywords } = useStore()

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) { setStatus('idle'); return }

    const db = supabase
    const load = async () => {
      try {
        // 先測試資料表是否存在
        const test = await db.from('papers').select('id').limit(1)
        if (test.error?.code === 'PGRST205' || test.status === 404) {
          setStatus('no_tables')
          return
        }
        if (test.error) throw new Error(test.error.message)

        // 只有本地沒有資料時才從雲端載入（避免覆蓋）
        if (papers.length > 0) { setStatus('ready'); return }

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
        setStatus('ready')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
        setStatus('error')
      }
    }

    load()
  }, [])

  return { status, error }
}

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

// 將本地 localStorage 資料推送到 Supabase（一次性遷移）
export async function migrateLocalToCloud(
  papers: Paper[], variables: Variable[], relationships: Relationship[], hypotheses: Hypothesis[],
  nodePositions: Record<string, { x: number; y: number }>
) {
  if (!isSupabaseEnabled || !supabase) return { ok: false, error: 'Supabase not configured' }
  const db = supabase
  try {
    if (papers.length) await db.from('papers').upsert(papers)
    if (variables.length) await db.from('variables').upsert(variables)
    if (relationships.length) await db.from('relationships').upsert(relationships)
    if (hypotheses.length) await db.from('hypotheses').upsert(hypotheses)
    const posRows = Object.entries(nodePositions).map(([variable_id, p]) => ({ variable_id, ...p }))
    if (posRows.length) await db.from('node_positions').upsert(posRows)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
