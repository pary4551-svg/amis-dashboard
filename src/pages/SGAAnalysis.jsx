import { useState, useEffect, useMemo } from 'react'
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useBranches, useBranchDetail } from '../hooks/useBranchData'
import { useSgaData } from '../hooks/useOverviewData'
import { SGA_ITEMS } from '../utils/constants'

const SEL = 'text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500'
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

const SGA_COLORS = [
  '#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6',
  '#ec4899','#14b8a6','#f97316','#6366f1','#84cc16',
  '#06b6d4','#e11d48','#7c3aed','#059669','#d97706',
  '#0891b2','#65a30d','#dc2626','#7e22ce',
]

const RADIAN = Math.PI / 180
const renderDonutLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
  if (percent < 0.03) return null
  const r = outerRadius + 18
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="#4b5563"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      style={{ fontSize: '9px', pointerEvents: 'none' }}
    >
      {name}
    </text>
  )
}

export default function SGAAnalysis() {
  const branches     = useBranches()
  const branchDetail = useBranchDetail()
  const sgaData      = useSgaData()

  const [selectedCode, setSelectedCode] = useState('전체')

  const rows = useMemo(() => {
    if (selectedCode === '전체') return sgaData
    if (!branchDetail) return null
    return branchDetail[selectedCode] ?? null
  }, [selectedCode, sgaData, branchDetail])

  // 연도 목록 (오름차순)
  const chartYears = useMemo(() => {
    if (!rows) return []
    return [...new Set(rows.map(r => r.ym.slice(0, 4)))].sort()
  }, [rows])

  // 각 연도별 최대 월 계산
  const maxMonthByYear = useMemo(() => {
    if (!rows) return {}
    const map = {}
    for (const y of chartYears) {
      const ms = rows.filter(r => r.ym.startsWith(y)).map(r => parseInt(r.ym.slice(4, 6), 10))
      map[y] = ms.length > 0 ? Math.max(...ms) : 12
    }
    return map
  }, [rows, chartYears])

  const latestYear = chartYears[chartYears.length - 1] ?? null

  // ── 도넛 기간 상태 ──────────────────────────────────────
  const [barYear,      setBarYear]      = useState(null)
  const [donutYear,    setDonutYear]    = useState(null)
  const [donutStart,   setDonutStart]   = useState(1)
  const [donutEnd,     setDonutEnd]     = useState(null)

  useEffect(() => {
    if (latestYear) {
      setBarYear(latestYear)
      setDonutYear(latestYear)
    }
  }, [latestYear])

  useEffect(() => {
    if (donutYear && maxMonthByYear[donutYear]) {
      setDonutStart(1)
      setDonutEnd(maxMonthByYear[donutYear])
    }
  }, [donutYear, maxMonthByYear])

  // ── 테이블 기간 상태 ─────────────────────────────────────
  const [tblStart, setTblStart] = useState(1)
  const [tblEnd,   setTblEnd]   = useState(null)

  useEffect(() => {
    if (latestYear && maxMonthByYear[latestYear]) {
      setTblEnd(maxMonthByYear[latestYear])
    }
  }, [latestYear, maxMonthByYear])

  // 도넛 — 기간 합계 세목 비율
  const donutData = useMemo(() => {
    if (!rows || !donutYear || !donutStart || !donutEnd) return []
    const rangeRows = rows.filter(r => {
      const m = parseInt(r.ym.slice(4, 6), 10)
      return r.ym.startsWith(donutYear) && m >= donutStart && m <= donutEnd
    })
    if (rangeRows.length === 0) return []
    return SGA_ITEMS
      .map((item, i) => ({
        name: item,
        value: rangeRows.reduce((s, r) => s + (r[item] ?? 0), 0),
        color: SGA_COLORS[i],
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [rows, donutYear, donutStart, donutEnd])

  // 누적 바 — 선택 연도 월별
  const barData = useMemo(() => {
    if (!rows || !barYear) return []
    const yearRows = rows.filter(r => r.ym.startsWith(barYear))
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const row = yearRows.find(r => parseInt(r.ym.slice(4, 6), 10) === month)
      return SGA_ITEMS.reduce((acc, item) => ({ ...acc, [item]: row?.[item] ?? null }), { month })
    })
  }, [rows, barYear])

  // 연간 합계 테이블 — tblStart~tblEnd 누계
  const annualSummary = useMemo(() => {
    if (!rows || !tblEnd) return { tableRows: [], years: [] }
    const ys = [...new Set(rows.map(r => r.ym.slice(0, 4)))].sort()
    const tableRows = SGA_ITEMS.map((item, idx) => {
      const totals = {}
      for (const y of ys) {
        totals[y] = rows
          .filter(r => {
            const m = parseInt(r.ym.slice(4, 6), 10)
            return r.ym.startsWith(y) && m >= tblStart && m <= tblEnd
          })
          .reduce((s, r) => s + (r[item] ?? 0), 0)
      }
      return { item, idx, ...totals }
    })
    return { tableRows, years: ys }
  }, [rows, tblStart, tblEnd])

  const { tableRows, years: tableYears } = annualSummary
  const lastTwo = tableYears.slice(-2)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">

      {/* 헤더 + 지점 선택 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">판관비 분석</h2>
          <p className="text-sm text-gray-400 mt-0.5">억 원 단위</p>
        </div>
        <select
          value={selectedCode}
          onChange={e => setSelectedCode(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 min-w-[180px]"
        >
          <option value="전체">전체</option>
          {branches?.map(b => (
            <option key={b.code} value={b.code}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* 세목별 구성 비율 도넛 */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">세목별 구성 비율</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">기준</span>
            <select value={donutYear ?? ''} onChange={e => setDonutYear(e.target.value)} className={SEL}>
              {chartYears.map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select
              value={donutStart}
              onChange={e => { const v = Number(e.target.value); setDonutStart(v); if (donutEnd !== null && v > donutEnd) setDonutEnd(v) }}
              className={SEL}
            >
              {MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}
            </select>
            <span className="text-xs text-gray-400">~</span>
            <select value={donutEnd ?? ''} onChange={e => setDonutEnd(Number(e.target.value))} className={SEL}>
              {MONTHS.filter(m => m >= donutStart).map(m => <option key={m} value={m}>{m}월</option>)}
            </select>
          </div>
        </div>

        {donutData.length > 0 && (
          <div>
            {/* 도넛 차트 — 중앙 정렬, 외부 레이블 */}
            <div className="flex justify-center">
              <div style={{ width: 360, height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx={180}
                      cy="50%"
                      innerRadius={52}
                      outerRadius={90}
                      paddingAngle={1}
                      dataKey="value"
                      label={renderDonutLabel}
                      labelLine={false}
                    >
                      {donutData.map(d => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, name) => [`${v.toFixed(2)}억`, name]}
                      contentStyle={{ fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 범례 — 3열 그리드 */}
            <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-1.5">
              {donutData.map(d => {
                const total = donutData.reduce((s, x) => s + x.value, 0)
                const pct = total > 0 ? (d.value / total * 100).toFixed(1) : '0.0'
                return (
                  <div key={d.name} className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-[11px] text-gray-600 truncate flex-1">{d.name}</span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0 tabular-nums">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* 월별 세목 누적 바 */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">월별 세목 구성</h3>
          <div className="flex gap-1">
            {chartYears.map(y => (
              <button
                key={y}
                onClick={() => setBarYear(y)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  barYear === y
                    ? 'bg-brand-900 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={m => `${m}월`}
              tick={{ fontSize: 10 }}
              interval={0}
            />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v.toFixed(0)} width={44} />
            <Tooltip
              formatter={(v, name) => [v != null ? `${v.toFixed(2)}억` : '-', name]}
              contentStyle={{ fontSize: 11 }}
            />
            {SGA_ITEMS.map((item, i) => (
              <Bar key={item} dataKey={item} stackId="sga" fill={SGA_COLORS[i]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* 연간 세목별 합계 테이블 */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">연간 세목별 합계</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">기준</span>
            <select
              value={tblStart}
              onChange={e => { const v = Number(e.target.value); setTblStart(v); if (tblEnd !== null && v > tblEnd) setTblEnd(v) }}
              className={SEL}
            >
              {MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}
            </select>
            <span className="text-xs text-gray-400">~</span>
            <select value={tblEnd ?? ''} onChange={e => setTblEnd(Number(e.target.value))} className={SEL}>
              {MONTHS.filter(m => m >= tblStart).map(m => <option key={m} value={m}>{m}월</option>)}
            </select>
          </div>
        </div>
        {tableYears.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-3 font-medium text-gray-500 whitespace-nowrap">세목</th>
                  {tableYears.map(y => (
                    <th key={y} className="text-right py-2 px-2 font-medium text-gray-500 whitespace-nowrap">{y}</th>
                  ))}
                  <th className="text-right py-2 pl-2 font-medium text-gray-500 whitespace-nowrap">
                    전년比 {lastTwo.length === 2 ? `(${lastTwo[0]}→${lastTwo[1]})` : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map(({ item, idx, ...totals }) => {
                  const cur  = totals[lastTwo[1]] ?? 0
                  const prev = totals[lastTwo[0]] ?? 0
                  const yoy  = prev !== 0 ? (cur - prev) / Math.abs(prev) * 100 : null
                  return (
                    <tr key={item} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-1.5 pr-3 text-gray-700 whitespace-nowrap">
                        <span
                          className="inline-block w-2 h-2 rounded-sm mr-1.5 align-middle"
                          style={{ background: SGA_COLORS[idx] }}
                        />
                        {item}
                      </td>
                      {tableYears.map(y => (
                        <td key={y} className="text-right py-1.5 px-2 text-gray-600 tabular-nums">
                          {totals[y] != null ? totals[y].toFixed(1) : '-'}
                        </td>
                      ))}
                      <td className={`text-right py-1.5 pl-2 font-medium tabular-nums ${
                        yoy == null ? 'text-gray-300' : yoy < 0 ? 'text-blue-500' : 'text-red-500'
                      }`}>
                        {yoy != null ? `${yoy >= 0 ? '▲' : '▼'} ${Math.abs(yoy).toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  )
                })}

                {/* 합계 행 */}
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <td className="py-2 pr-3 text-gray-700">합계</td>
                  {tableYears.map(y => {
                    const total = tableRows.reduce((s, { item, idx, ...t }) => s + (t[y] ?? 0), 0)
                    return (
                      <td key={y} className="text-right py-2 px-2 text-gray-700 tabular-nums">
                        {total.toFixed(1)}
                      </td>
                    )
                  })}
                  {(() => {
                    const cur  = tableRows.reduce((s, { item, idx, ...t }) => s + (t[lastTwo[1]] ?? 0), 0)
                    const prev = tableRows.reduce((s, { item, idx, ...t }) => s + (t[lastTwo[0]] ?? 0), 0)
                    const yoy  = prev !== 0 ? (cur - prev) / Math.abs(prev) * 100 : null
                    return (
                      <td className={`text-right py-2 pl-2 tabular-nums ${
                        yoy == null ? 'text-gray-300' : yoy < 0 ? 'text-blue-500' : 'text-red-500'
                      }`}>
                        {yoy != null ? `${yoy >= 0 ? '▲' : '▼'} ${Math.abs(yoy).toFixed(1)}%` : '-'}
                      </td>
                    )
                  })()}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
