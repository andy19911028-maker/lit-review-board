import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } }
export const maxDuration = 60

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { pdfBase64 } = req.body as { pdfBase64: string }
  if (!pdfBase64) return res.status(400).json({ error: 'Missing pdfBase64' })

  const msg = await client.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
        } as any,
        {
          type: 'text',
          text: `從這篇學術論文中提取資訊，只回覆 JSON（不要有任何其他文字或 markdown 代碼塊）：
{
  "title": "論文完整標題",
  "authors": "Author1, Author2, Author3",
  "year": 2024,
  "journal": "期刊名稱（若無則為 null）",
  "doi": "DOI 字串（若無則為 null）",
  "abstract": "完整摘要",
  "keywords": ["關鍵詞1", "關鍵詞2", "關鍵詞3", "關鍵詞4", "關鍵詞5"]
}`,
        },
      ],
    }],
  })

  const text = msg.content.find((b) => b.type === 'text')?.text ?? ''
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
    res.json(JSON.parse(cleaned))
  } catch {
    res.status(500).json({ error: 'Parse failed', raw: text })
  }
}
