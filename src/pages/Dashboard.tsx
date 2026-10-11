import { useStore } from '../lib/store'
import { BookOpen, GitBranch, Tag, ListChecks, Zap } from 'lucide-react'

export default function Dashboard() {
  const { papers, variables, relationships, hypotheses, keywords, tokenUsage } = useStore()

  const stats = [
    { label: '文獻', value: papers.length, icon: BookOpen, color: 'bg-blue-500' },
    { label: '變數', value: variables.length, icon: GitBranch, color: 'bg-violet-500' },
    { label: '關係', value: relationships.length, icon: Tag, color: 'bg-amber-500' },
    { label: '假設/命題', value: hypotheses.length, icon: ListChecks, color: 'bg-emerald-500' },
  ]

  const topKeywords = [...keywords]
    .sort((a, b) => b.paper_ids.length - a.paper_ids.length)
    .slice(0, 10)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">研究概覽</h2>
      <p className="text-gray-500 mb-8 text-sm">管理你的文獻、模型與變數關係</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className={`${color} text-white p-2.5 rounded-lg`}>
              <Icon size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-800">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Token Usage */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-orange-500 text-white p-2 rounded-lg"><Zap size={16} /></div>
          <h3 className="font-semibold text-gray-700">AI Token 用量（本機累計）</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl font-bold text-gray-800">{tokenUsage.calls}</div>
            <div className="text-xs text-gray-500 mt-0.5">呼叫次數</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{tokenUsage.promptTokens.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-0.5">輸入 tokens</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-violet-600">{tokenUsage.completionTokens.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-0.5">輸出 tokens</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-emerald-600">{tokenUsage.totalTokens.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-0.5">合計 tokens</div>
          </div>
        </div>
        {tokenUsage.calls === 0 && (
          <p className="text-gray-400 text-xs text-center mt-3">上傳 PDF 或使用 AI 功能後會在此顯示用量</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-700 mb-4">最近新增文獻</h3>
          {papers.length === 0 ? (
            <p className="text-gray-400 text-sm">尚無文獻，前往「文獻庫」新增</p>
          ) : (
            <ul className="space-y-3">
              {[...papers].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5).map((p) => (
                <li key={p.id} className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700 line-clamp-1">{p.title}</span>
                  <span className="text-xs text-gray-400">{p.authors} · {p.year}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-700 mb-4">熱門關鍵詞</h3>
          {topKeywords.length === 0 ? (
            <p className="text-gray-400 text-sm">尚無關鍵詞</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topKeywords.map((kw) => (
                <span
                  key={kw.id}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                  style={{ fontSize: `${Math.max(11, 11 + kw.paper_ids.length * 2)}px` }}
                >
                  {kw.name} ({kw.paper_ids.length})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
