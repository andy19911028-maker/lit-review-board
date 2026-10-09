export interface Paper {
  id: string
  title: string
  authors: string
  year: number
  journal?: string
  abstract?: string
  doi?: string
  keywords: string[]
  created_at: string
  user_id?: string
}

export interface Variable {
  id: string
  name: string
  description?: string
  type: 'independent' | 'dependent' | 'mediator' | 'moderator' | 'control'
  paper_ids: string[]
  keywords: string[]
}

export interface Relationship {
  id: string
  from_variable_id: string
  to_variable_id: string
  direction: 'positive' | 'negative' | 'mixed' | 'unknown'
  strength?: 'strong' | 'moderate' | 'weak'
  explanation: string
  original_text: string
  paper_id: string
  hypothesis_ids: string[]
}

export interface Hypothesis {
  id: string
  paper_id: string
  number: string
  content: string
  type: 'hypothesis' | 'proposition'
  supported?: boolean
  variable_ids: string[]
}

export interface Keyword {
  id: string
  name: string
  paper_ids: string[]
  variable_ids: string[]
  relationship_ids: string[]
}

export interface ModelNode {
  id: string
  variable_id: string
  position: { x: number; y: number }
  paper_ids: string[]
}

export interface ModelEdge {
  id: string
  relationship_id: string
  source: string
  target: string
}
