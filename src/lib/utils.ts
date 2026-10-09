export const nanoid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36)

export const DIRECTION_COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
  mixed: '#f59e0b',
  unknown: '#94a3b8',
}

export const DIRECTION_LABELS = {
  positive: '正相關 (+)',
  negative: '負相關 (−)',
  mixed: '混合',
  unknown: '未知',
}

export const VARIABLE_TYPE_COLORS = {
  independent: '#3b82f6',
  dependent: '#8b5cf6',
  mediator: '#f59e0b',
  moderator: '#06b6d4',
  control: '#6b7280',
}

export const VARIABLE_TYPE_LABELS = {
  independent: '自變數',
  dependent: '依變數',
  mediator: '中介變數',
  moderator: '調節變數',
  control: '控制變數',
}
