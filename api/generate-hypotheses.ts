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
    text: `你是研究方法專家。請從此學術論文中找出所有正式的假設（Hypothesis）和命題（Proposition）。

${pdfBase64 ? '' : paperInfo}

只回覆 JSON（不要有任何其他文字）：
{
  "hypotheses": [
    {
      "number": "H1",
      "type": "hypothesis 或 proposition",
      "content": "假設/命題的完整內容（保留原文語言，若英文則保留英文）"
    }
  ]
}

規則：
- Hypothesis（假設）通常以 H1, H1a, H2... 編號
- Proposition（命題）通常以 P1, P2... 編號
- 完整提取，每個假設都要包含
- content 請直接引用論文原文，不要改寫
- 若論文無正式假設/命題，回覆 {"hypotheses": []}`,
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
