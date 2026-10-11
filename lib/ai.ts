import OpenAI from 'openai'
import type { VercelResponse } from '@vercel/node'

export type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam

const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
const DEFAULT_TEXT_MODEL = 'qwen-plus'
const DEFAULT_VISION_MODEL = 'qwen3-vl-plus'

export class AiError extends Error {
  status: number
  raw?: string

  constructor(status: number, message: string, raw?: string) {
    super(message)
    this.status = status
    this.raw = raw
  }
}

let cached: OpenAI | undefined

function client(): OpenAI {
  if (cached) return cached
  const apiKey = process.env.AI_API_KEY
  if (!apiKey) throw new AiError(500, 'AI_API_KEY 未設定')
  cached = new OpenAI({ apiKey, baseURL: process.env.AI_BASE_URL ?? DEFAULT_BASE_URL })
  return cached
}

export function textModel(): string {
  return process.env.AI_MODEL_TEXT ?? DEFAULT_TEXT_MODEL
}

export function visionModel(): string {
  return process.env.AI_MODEL_VISION ?? DEFAULT_VISION_MODEL
}

export async function completeJson<T>(params: {
  model: string
  messages: ChatMessage[]
  maxTokens?: number
}): Promise<T> {
  let completion: OpenAI.Chat.Completions.ChatCompletion
  try {
    completion = await client().chat.completions.create({
      model: params.model,
      messages: params.messages,
      response_format: { type: 'json_object' },
      max_tokens: params.maxTokens ?? 4096,
      // 非 OpenAI 標準參數。思考模式下 json_object 會靜默失效且強制要求串流，
      // 而這些路由都是一次性取回完整 JSON，所以必須顯式關閉思考模式。
      enable_thinking: false,
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming)
  } catch (e) {
    throw toAiError(e)
  }

  const text = completion.choices[0]?.message?.content ?? ''
  try {
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim()) as T
  } catch {
    throw new AiError(500, 'AI 回覆非合法 JSON', text)
  }
}

export function sendAiError(res: VercelResponse, e: unknown): void {
  const err = e instanceof AiError ? e : new AiError(500, e instanceof Error ? e.message : String(e))
  const body: { error: string; raw?: string } = { error: err.message }
  if (err.raw !== undefined) body.raw = err.raw
  res.status(err.status).json(body)
}

function toAiError(e: unknown): AiError {
  if (e instanceof AiError) return e
  const status = (e as { status?: unknown } | null)?.status
  const detail = e instanceof Error ? e.message : String(e)

  if (status === 401) return new AiError(401, 'AI_API_KEY 無效，或與 API 地區不符（北京站與新加坡站的金鑰不能互用）')
  if (status === 429) return new AiError(429, 'AI 額度用盡或觸發限流')
  if (typeof status === 'number' && status >= 400 && status < 600) return new AiError(status, `AI 服務錯誤：${detail}`)
  return new AiError(500, `AI 服務呼叫失敗：${detail}`)
}
