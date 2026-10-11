import type { VercelRequest, VercelResponse } from '@vercel/node'
import { completeJson, sendAiError, textModel } from '../lib/ai.js'

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } }
export const maxDuration = 60

type HypothesesResult = {
  hypotheses: { number: string; type: string; content: string }[]
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { title, abstract } = req.body as { title: string; abstract?: string }
  if (!title) return res.status(400).json({ error: 'Missing title' })

  try {
    const { data, usage } = await completeJson<HypothesesResult>({
      model: textModel(),
      maxTokens: 4096,
      messages: [{
        role: 'user',
        content: `你是研究方法專家。請從此學術論文中找出所有正式的假設（Hypothesis）和命題（Proposition）。

論文標題：${title}

摘要：
${abstract ?? '（無摘要）'}

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
      }],
    })

    res.json({ ...data, _usage: usage })
  } catch (e) {
    sendAiError(res, e)
  }
}
