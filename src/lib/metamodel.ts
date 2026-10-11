import type { Variable, Relationship } from '../types'

export interface MetaVariable {
  key: string
  name: string
  type: Variable['type']
  paperIds: string[]
}

export interface MetaRelationship {
  key: string
  fromKey: string
  toKey: string
  paperIds: string[]
  directionCounts: Partial<Record<Relationship['direction'], number>>
  consensus: Relationship['direction'] | 'contradictory'
}

export interface PathGap {
  fromKey: string
  toKey: string
  viaKey: string
}

export interface MetaModel {
  variables: Map<string, MetaVariable>
  relationships: Map<string, MetaRelationship>
  pathGaps: PathGap[]
}

function normalize(name: string): string {
  return name.toLowerCase().trim()
}

export function buildMetaModel(variables: Variable[], relationships: Relationship[]): MetaModel {
  // Step 1: Merge variables by normalized name
  const vars = new Map<string, MetaVariable>()
  for (const v of variables) {
    const key = normalize(v.name)
    const existing = vars.get(key)
    if (!existing) {
      vars.set(key, { key, name: v.name, type: v.type, paperIds: [...v.paper_ids] })
    } else {
      for (const pid of v.paper_ids) {
        if (!existing.paperIds.includes(pid)) existing.paperIds.push(pid)
      }
      // Keep most-common type (use first for now)
    }
  }

  // Build lookup: variable id → meta key
  const idToKey = new Map<string, string>()
  for (const v of variables) {
    idToKey.set(v.id, normalize(v.name))
  }

  // Step 2: Merge relationships
  const rels = new Map<string, MetaRelationship>()
  for (const r of relationships) {
    const fromKey = idToKey.get(r.from_variable_id)
    const toKey = idToKey.get(r.to_variable_id)
    if (!fromKey || !toKey || fromKey === toKey) continue

    const relKey = `${fromKey}→${toKey}`
    const existing = rels.get(relKey)
    if (!existing) {
      rels.set(relKey, {
        key: relKey,
        fromKey,
        toKey,
        paperIds: [r.paper_id],
        directionCounts: { [r.direction]: 1 },
        consensus: r.direction,
      })
    } else {
      if (!existing.paperIds.includes(r.paper_id)) existing.paperIds.push(r.paper_id)
      existing.directionCounts[r.direction] = (existing.directionCounts[r.direction] ?? 0) + 1
    }
  }

  // Step 3: Compute consensus
  for (const rel of rels.values()) {
    const entries = Object.entries(rel.directionCounts) as [Relationship['direction'], number][]
    if (entries.length === 1) {
      rel.consensus = entries[0][0]
    } else {
      const meaningful = entries.filter(([d]) => d !== 'unknown')
      if (meaningful.length > 1) {
        rel.consensus = 'contradictory'
      } else {
        rel.consensus = entries.sort((a, b) => b[1] - a[1])[0][0]
      }
    }
  }

  // Step 4: Detect path gaps (A→M→B exists but A→B is not studied)
  const pathGaps: PathGap[] = []
  const keys = Array.from(vars.keys())
  const seen = new Set<string>()

  for (const fromKey of keys) {
    for (const viaKey of keys) {
      if (viaKey === fromKey) continue
      if (!rels.has(`${fromKey}→${viaKey}`)) continue
      for (const toKey of keys) {
        if (toKey === fromKey || toKey === viaKey) continue
        if (!rels.has(`${viaKey}→${toKey}`)) continue
        // A→M and M→B exist; check if A→B is missing
        if (!rels.has(`${fromKey}→${toKey}`)) {
          const gapKey = `${fromKey}→${toKey}`
          if (!seen.has(gapKey)) {
            seen.add(gapKey)
            pathGaps.push({ fromKey, toKey, viaKey })
          }
        }
      }
    }
  }

  return { variables: vars, relationships: rels, pathGaps }
}

// Build compressed summary for LLM (avoid sending raw full data)
export function buildGapSummary(model: MetaModel, papers: { id: string; title: string }[]) {
  const paperTitle = (id: string) => papers.find((p) => p.id === id)?.title?.slice(0, 40) ?? id

  const variables = Array.from(model.variables.values()).map((v) => ({
    name: v.name,
    type: v.type,
    papers: v.paperIds.length,
  }))

  const relationships = Array.from(model.relationships.values()).map((r) => ({
    from: model.variables.get(r.fromKey)?.name ?? r.fromKey,
    to: model.variables.get(r.toKey)?.name ?? r.toKey,
    consensus: r.consensus,
    papers: r.paperIds.length,
    breakdown: r.directionCounts,
  }))

  const pathGaps = model.pathGaps.slice(0, 20).map((g) => ({
    from: model.variables.get(g.fromKey)?.name ?? g.fromKey,
    via: model.variables.get(g.viaKey)?.name ?? g.viaKey,
    to: model.variables.get(g.toKey)?.name ?? g.toKey,
  }))

  void paperTitle // kept for future use

  return { variables, relationships, pathGaps }
}

// Auto-layout: group nodes by type into columns
export function autoLayout(vars: Map<string, MetaVariable>): Record<string, { x: number; y: number }> {
  const groups: Record<string, MetaVariable[]> = {
    independent: [],
    mediator: [],
    moderator: [],
    dependent: [],
    control: [],
  }
  for (const v of vars.values()) {
    groups[v.type]?.push(v)
  }

  const COL_X: Record<string, number> = {
    independent: 80,
    mediator: 340,
    moderator: 340,
    dependent: 600,
    control: 80,
  }
  const positions: Record<string, { x: number; y: number }> = {}

  const placeGroup = (keys: MetaVariable[], x: number, startY: number) => {
    keys.forEach((v, i) => {
      positions[v.key] = { x, y: startY + i * 120 }
    })
  }

  const maxH = Math.max(groups.independent.length, groups.dependent.length, 1) * 120
  placeGroup(groups.independent, COL_X.independent, 60)
  placeGroup(groups.mediator, COL_X.mediator, 60)
  placeGroup(groups.moderator, COL_X.moderator + 220, 60)
  placeGroup(groups.dependent, COL_X.dependent + 220, 60)
  placeGroup(groups.control, COL_X.independent, maxH + 180)

  return positions
}
