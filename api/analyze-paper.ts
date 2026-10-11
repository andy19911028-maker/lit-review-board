import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } }
export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { title, abstract, pdfBase64 } = req.body as { title: string; abstract?: string; pdfBase64?: string }
  if (!title) return res.status(400).json({ error: 'Missing title' })

  const content: Anthropic.MessageParam['content'] = []

  if (pdfBase64) {
    content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } } as any)
  }

  const paperInfo = pdfBase64
    ? `以上為論文全文。論文標題：${title}`
    : `論文標題：${title}\n\n摘要：\n${abstract ?? '（無摘要）'}`

  content.push({
    type: 'text',
    text: `你是研究方法專家。請分析此學術論文，提取所有理論構念（變數）與它們之間的假設關係。

${pdfBase64 ? '' : paperInfo}

只回覆 JSON（不要有任何其他文字）：
{
  "variables": [
    {
      "name": "構念名稱（英文為主，保留原文）",
      "type": "independent 或 dependent 或 mediator 或 moderator 或 control",
      "description": "構念的簡短定義（用中文說明）"
    }
  ],
  "relationships": [
    {
      "from": "起始構念名稱（與 variables 中的 name 完全一致）",
      "to": "終止構念名稱（與 variables 中的 name 完全一致）",
      "direction": "positive 或 negative 或 mixed 或 unknown",
      "explanation": "為什麼是正/負相關（中文說明，50字以內）",
      "original_text": "論文中支持此關係的原文引用（英文原文，直接引用）"
    }
  ]
}

分類規則：
- independent（自變數）：影響其他構念但不被影響的
- dependent（依變數）：被多個構念影響的結果
- mediator（中介變數）：解釋自變數如何影響依變數的
- moderator（調節變數）：影響其他關係強度的
- control（控制變數）：需要排除的干擾因素

${pdfBase64 ? '' : '注意：只根據摘要分析，盡量提取有把握的關係'}`,
  })

  const msg = await client.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content }],
  })

  const text = msg.content.find((b) => b.type === 'text')?.text ?? ''
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
    res.json(JSON.parse(cleaned))
  } catch {
    res.status(500).json({ error: 'Parse failed', raw: text })
  }
}
