import { completeJson, sendAiError, visionModel } from '../lib/ai.js';
export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };
export const maxDuration = 60;
export default async function handler(req, res) {
    if (req.method !== 'POST')
        return res.status(405).end();
    const { imageBase64, mediaType = 'image/png' } = req.body;
    if (!imageBase64)
        return res.status(400).json({ error: 'Missing imageBase64' });
    try {
        const data = await completeJson({
            model: visionModel(),
            maxTokens: 4096,
            messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: { url: `data:${mediaType};base64,${imageBase64}` },
                        },
                        {
                            type: 'text',
                            text: `這是一張學術論文的理論模型圖（theoretical model / research framework）。

請仔細分析圖中所有元素，回覆 JSON（不要有任何其他文字）：
{
  "variables": [
    {
      "name": "構念/變數名稱（從圖中文字直接提取，英文為主）",
      "type": "independent 或 dependent 或 mediator 或 moderator 或 control",
      "description": "根據位置和箭頭方向判斷此構念的角色"
    }
  ],
  "relationships": [
    {
      "from": "起始構念名稱（與 variables 中的 name 完全一致）",
      "to": "終止構念名稱",
      "direction": "positive 或 negative 或 mixed 或 unknown",
      "explanation": "從圖中箭頭和標籤判斷此關係",
      "original_text": ""
    }
  ]
}

分類規則：
- 最左側、無箭頭指入 → independent（自變數）
- 最右側、多個箭頭指入 → dependent（依變數）
- 中間、有進有出 → mediator（中介變數）
- 在關係線旁影響強度 → moderator（調節變數）
- 箭頭標籤 + → positive，- → negative，± → mixed，無標籤 → unknown
- 若有多個方向判斷不確定就填 unknown`,
                        },
                    ],
                }],
        });
        res.json(data);
    }
    catch (e) {
        sendAiError(res, e);
    }
}
