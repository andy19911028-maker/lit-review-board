import type { VercelRequest, VercelResponse } from '@vercel/node'
import { completeJson, sendAiError, textModel } from '../lib/ai.js'

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } }
export const maxDuration = 60

type GapItem = {
  title: string
  description: string
  researchQuestion: string
  priority: 'high' | 'medium' | 'low'
}

type ContradictionItem = {
  relationship: string
  explanation: string
}

type GapAnalysisResult = {
  gaps: GapItem[]
  contradictions: ContradictionItem[]
  synthesis: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { summary } = req.body as {
    summary: {
      variables: { name: string; type: string; papers: number }[]
      relationships: { from: string; to: string; consensus: string; papers: number; breakdown: Record<string, number> }[]
      pathGaps: { from: string; via: string; to: string }[]
    }
  }
  if (!summary) return res.status(400).json({ error: 'Missing summary' })

  try {
  const { data, usage } = await completeJson<GapAnalysisResult>({
    model: textModel(),
    maxTokens: 3000,
    messages: [{
      role: 'user',
      content: `你是研究方法專家，請分析以下多篇文獻的整合模型，找出研究缺口與矛盾。

## 已研究的構念（變數）
${summary.variables.map((v) => `- ${v.name}（${v.type}，${v.papers}篇）`).join('\n')}

## 已發現的關係
${summary.relationships.map((r) => {
  const contradictNote = r.consensus === 'contradictory'
    ? `（矛盾：${Object.entries(r.breakdown).map(([d, n]) => `${d}×${n}`).join('/')}）`
    : ''
  return `- ${r.from} → ${r.to}：${r.consensus}${contradictNote}，${r.papers}篇支持`
}).join('\n')}

## 路徑缺口（間接路徑存在但直接關係未驗證）
${summary.pathGaps.length === 0 ? '（無）' : summary.pathGaps.map((g) => `- ${g.from} → [${g.via}] → ${g.to}，但 ${g.from}→${g.to} 直接關係未被研究`).join('\n')}

請回覆 JSON：
{
  "gaps": [
    {
      "title": "缺口標題（20字以內）",
      "description": "為什麼這是研究缺口（中文，60字以內）",
      "researchQuestion": "建議的研究問題（中文，一個具體問句）",
      "priority": "high 或 medium 或 low"
    }
  ],
  "contradictions": [
    {
      "relationship": "哪個關係有矛盾（如：X → Y）",
      "explanation": "可能的解釋（邊界條件、測量差異等，中文，60字以內）"
    }
  ],
  "synthesis": "整體文獻缺口的一段摘要（中文，100字以內）"
}

只列出最重要的 3-5 個缺口，並處理所有矛盾關係。`,
    }],
  })

  res.json({ ...data, _usage: usage })
  } catch (e) {
    sendAiError(res, e)
  }
}
