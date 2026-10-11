import './polyfills.js'
import { PDFParse } from 'pdf-parse'
import { AiError } from './ai.js'

const MIN_TEXT_CHARS = 200

export async function extractPdfText(pdfBase64: string, firstPages?: number): Promise<string> {
  const parser = new PDFParse({ data: Buffer.from(pdfBase64, 'base64') })
  try {
    const result = await parser.getText(firstPages ? { first: firstPages } : undefined)
    const text = result.pages.map((page) => page.text).join('\n\n').trim()
    if (text.length < MIN_TEXT_CHARS) {
      throw new AiError(
        422,
        '這份 PDF 沒有文字層（可能是掃描檔），無法解析。請改用 OCR 文字版，或手動輸入書目資訊。',
      )
    }
    return text
  } catch (e) {
    if (e instanceof AiError) throw e
    throw new AiError(400, `PDF 解析失敗：${e instanceof Error ? e.message : String(e)}`)
  } finally {
    await parser.destroy().catch(() => {})
  }
}
