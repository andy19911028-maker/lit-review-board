import { completeJson, sendAiError, textModel } from '../lib/ai.js';
import { extractPdfText } from '../lib/pdf.js';
export const config = { api: { bodyParser: { sizeLimit: '20mb' } } };
export const maxDuration = 60;
export default async function handler(req, res) {
    if (req.method !== 'POST')
        return res.status(405).end();
    const { pdfBase64 } = req.body;
    if (!pdfBase64)
        return res.status(400).json({ error: 'Missing pdfBase64' });
    try {
        // 書目資訊都在前幾頁，只取前三頁以控制 token 用量
        const paperText = await extractPdfText(pdfBase64, 3);
        const data = await completeJson({
            model: textModel(),
            maxTokens: 2048,
            messages: [{
                    role: 'user',
                    content: `論文內容如下：\n\n${paperText}\n\n從這篇學術論文中提取資訊，只回覆 JSON（不要有任何其他文字或 markdown 代碼塊）：
{
  "title": "論文完整標題",
  "authors": "Author1, Author2, Author3",
  "year": 2024,
  "journal": "期刊名稱（若無則為 null）",
  "doi": "DOI 字串（若無則為 null）",
  "abstract": "完整摘要",
  "keywords": ["關鍵詞1", "關鍵詞2", "關鍵詞3", "關鍵詞4", "關鍵詞5"]
}`,
                }],
        });
        res.json(data);
    }
    catch (e) {
        sendAiError(res, e);
    }
}
