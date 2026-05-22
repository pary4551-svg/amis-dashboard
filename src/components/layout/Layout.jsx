import { NavLink, Outlet } from 'react-router-dom'

const NAV = [
  { to: '/overview', label: '전체 현황' },
  { to: '/branch',   label: '지점별 분석' },
  { to: '/sga',      label: '판관비 분석' },
  { to: '/yoy',      label: 'YoY 분석' },
]

const NAV_BOTTOM = [
  { to: '/upload', label: '📊 데이터 업데이트' },
]

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* 사이드바 */}
      <aside className="w-52 flex-shrink-0 bg-brand-900 text-white flex flex-col">
        <div className="px-5 py-5 border-b border-brand-700">
          <p className="text-xs text-brand-100 font-medium tracking-widest uppercase">R100</p>
          <h1 className="text-base font-bold mt-0.5 leading-tight">유통 지점<br />AMIS 대시보드</h1>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-brand-100 hover:bg-brand-700 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-2 border-t border-brand-700 pt-2">
          {NAV_BOTTOM.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-brand-200 hover:bg-brand-700 hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
          <p className="px-3 pt-2 text-xs text-brand-300">2022.01 – 2026.04</p>
        </div>
      </aside>

      {/* 메인 영역 */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
