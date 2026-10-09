import { NavLink } from 'react-router-dom'
import { BookOpen, GitBranch, Network, ListChecks, LayoutDashboard } from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: '總覽' },
  { to: '/literature', icon: BookOpen, label: '文獻庫' },
  { to: '/model', icon: GitBranch, label: '模型白板' },
  { to: '/hypotheses', icon: ListChecks, label: '假設命題' },
  { to: '/network', icon: Network, label: '關鍵詞網絡' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-gray-900 text-gray-200 flex flex-col py-6 gap-1 shrink-0">
      <div className="px-5 mb-6">
        <h1 className="text-lg font-bold text-white leading-tight">文獻研究</h1>
        <p className="text-xs text-gray-500 mt-0.5">Literature Review Board</p>
      </div>
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex items-center gap-3 px-5 py-2.5 text-sm rounded-lg mx-2 transition-colors ${
              isActive
                ? 'bg-blue-600 text-white font-medium'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`
          }
        >
          <Icon size={16} />
          {label}
        </NavLink>
      ))}
    </aside>
  )
}
