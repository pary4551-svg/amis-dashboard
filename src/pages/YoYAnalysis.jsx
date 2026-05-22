import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Cell,
} from 'recharts'
import { useBranches, useBranchDetail } from '../hooks/useBranchData'
import { useOverviewData } from '../hooks/useOverviewData'

// ── 상수 ─────────────────────────────────────────────────────────────────────
const METRICS = [
  { key: '외형매출',   label: '외형매출',   isRate: false, unit: '%',  positiveGood: true  },
  { key: '판관비',     label: '판관비',     isRate: false, unit: '%',  positiveGood: false },
  { key: '판관비율',   label: '판관비율',   isRate: true,  unit: 'pp', positiveGood: false },
  { key: '영업이익',   label: '영업이익',   isRate: false, unit: '%',  positiveGood: true  },
  { key: '영업이익률', label: '영업이익률', isRate: true,  unit: 'pp', positiveGood: true  },
  { key: '당기순이익', label: '당기순이익', isRate: false, unit: '%',  positiveGood: true  },
]

const YEAR_COLORS = { '2023': '#3b82f6', '2024': '#10b981', '2025': '#f59e0b', '2026': '#ef4444' }
const SEL    = 'text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500'
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

// ── 유틸 ─────────────────────────────────────────────────────────────────────
// 단일 행에서 지표값 (비율 지표는 직접 계산)
function rowMetric(row, key) {
  if (!row) return null
  if (key === '판관비율')   return row['외형매출'] ? row['판관비']   / row['외형매출'] * 100 : null
  if (key === '영업이익률') return row['외형매출'] ? row['영업이익'] / row['외형매출'] * 100 : null
  return row[key] ?? null
}

// 복수 행 합산에서 지표값
function periodMetric(rows, key) {
  if (!rows?.length) return null
  if (key === '판관비율') {
    const ext = rows.reduce((s, r) => s + (r['외형매출'] ?? 0), 0)
    return ext ? rows.reduce((s, r) => s + (r['판관비'] ?? 0), 0) / ext * 100 : null
  }
  if (key === '영업이익률') {
    const ext = rows.reduce((s, r) => s + (r['외형매출'] ?? 0), 0)
    return ext ? rows.reduce((s, r) => s + (r['영업이익'] ?? 0), 0) / ext * 100 : null
  }
  return rows.reduce((s, r) => s + (r[key] ?? 0), 0)
}

// YoY 계산 (isRate → pp 차이, 나머지 → %)
function yoy(cur, prev, isRate) {
  if (cur == null || prev == null) return null
  if (isRate) return cur - prev
  return prev !== 0 ? (cur - prev) / Math.abs(prev) * 100 : null
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────
export default function YoYAnalysis() {
  const overviewData = useOverviewData()
  const branches     = useBranches()
  const branchDetail = useBranchDetail()

  // ── 공통 파생 데이터 ───────────────────────────────────────────────────────
  const allYears = useMemo(() => {
    if (!overviewData) return []
    return [...new Set(overviewData.map(r => r.ym.slice(0, 4)))].sort()
  }, [overviewData])

  const maxMonthByYear = useMemo(() => {
    const map = {}
    for (const y of allYears) {
      const ms = overviewData?.filter(r => r.ym.startsWith(y)).map(r => parseInt(r.ym.slice(4, 6), 10)) ?? []
      map[y] = ms.length ? Math.max(...ms) : 12
    }
    return map
  }, [overviewData, allYears])

  const yoyYears  = allYears.filter(y => y !== allYears[0])   // YoY 계산 가능 연도
  const latestYear = allYears[allYears.length - 1] ?? null

  // ── Section 1 상태: 월별 YoY 추이 ─────────────────────────────────────────
  const [s1Metric, setS1Metric]   = useState('외형매출')
  const [s1Branch, setS1Branch]   = useState('전체')

  const s1Rows = useMemo(() => {
    if (s1Branch === '전체') return overviewData
    return branchDetail?.[s1Branch] ?? null
  }, [s1Branch, overviewData, branchDetail])

  const s1MetricInfo = METRICS.find(m => m.key === s1Metric) ?? METRICS[0]

  const monthlyYoYData = useMemo(() => {
    if (!s1Rows) return []
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const pad   = String(month).padStart(2, '0')
      const entry = { month }
      for (const year of yoyYears) {
        const prev    = String(parseInt(year, 10) - 1)
        const curVal  = rowMetric(s1Rows.find(r => r.ym === `${year}${pad}`), s1Metric)
        const prevVal = rowMetric(s1Rows.find(r => r.ym === `${prev}${pad}`), s1Metric)
        entry[year]             = yoy(curVal, prevVal, s1MetricInfo.isRate)
        entry[`${year}_cur`]    = curVal   // 실제값 (툴팁용)
        entry[`${year}_prev`]   = prevVal
      }
      return entry
    })
  }, [s1Rows, s1Metric, s1MetricInfo, yoyYears])

  // Section 1 커스텀 툴팁
  const s1ValUnit = s1MetricInfo.isRate ? '%' : '억'
  const renderS1Tooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const validItems = payload.filter(p => /^\d{4}$/.test(p.dataKey) && p.value != null)
    if (!validItems.length) return null
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[160px]">
        <p className="font-semibold text-gray-700 mb-2">{label}월</p>
        {validItems.map(p => {
          const yr   = p.dataKey
          const prev = String(parseInt(yr, 10) - 1)
          const cur  = p.payload[`${yr}_cur`]
          const prv  = p.payload[`${yr}_prev`]
          const good = s1MetricInfo.positiveGood ? p.value >= 0 : p.value < 0
          return (
            <div key={yr} className="mb-2.5 last:mb-0">
              <span className="font-semibold" style={{ color: p.stroke }}>{yr}년</span>
              <div className="ml-2 mt-0.5 space-y-0.5 text-gray-500">
                <div>{prev}년 {label}월: <span className="tabular-nums text-gray-700">{prv != null ? `${prv.toFixed(1)}${s1ValUnit}` : '-'}</span></div>
                <div>{yr}년 {label}월:  <span className="tabular-nums text-gray-700">{cur != null ? `${cur.toFixed(1)}${s1ValUnit}` : '-'}</span></div>
                <div className={`font-medium ${good ? 'text-blue-500' : 'text-red-500'}`}>
                  YoY: {p.value >= 0 ? '+' : ''}{p.value.toFixed(1)}{s1MetricInfo.unit}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Section 2 상태: 지점별 YoY 순위 ──────────────────────────────────────
  const [s2Metric, setS2Metric] = useState('외형매출')
  const [s2Year,   setS2Year]   = useState(null)
  const [s2Start,  setS2Start]  = useState(1)
  const [s2End,    setS2End]    = useState(null)

  useEffect(() => {
    if (latestYear) setS2Year(latestYear)
  }, [latestYear])

  useEffect(() => {
    if (s2Year) { setS2Start(1); setS2End(maxMonthByYear[s2Year] ?? 12) }
  }, [s2Year])

  const s2MetricInfo = METRICS.find(m => m.key === s2Metric) ?? METRICS[0]
  const s2ValUnit = s2MetricInfo.isRate ? '%' : '억'
  const prevYear  = s2Year ? String(parseInt(s2Year, 10) - 1) : '-'

  const renderS2Tooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    const good = s2MetricInfo.positiveGood ? d.yoy >= 0 : d.yoy < 0
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[170px]">
        <p className="font-semibold text-gray-700 mb-2">{d.name}</p>
        <div className="space-y-0.5 text-gray-500">
          <div>{prevYear}년: <span className="tabular-nums text-gray-700">{d.prev != null ? `${d.prev.toFixed(1)}${s2ValUnit}` : '-'}</span></div>
          <div>{s2Year}년:  <span className="tabular-nums text-gray-700">{d.cur  != null ? `${d.cur.toFixed(1)}${s2ValUnit}`  : '-'}</span></div>
          <div className={`font-medium mt-1 ${good ? 'text-blue-500' : 'text-red-500'}`}>
            YoY: {d.yoy >= 0 ? '+' : ''}{d.yoy.toFixed(1)}{s2MetricInfo.unit}
          </div>
        </div>
      </div>
    )
  }

  const branchRankData = useMemo(() => {
    if (!branchDetail || !branches || !s2Year || !s2End) return []
    const prev = String(parseInt(s2Year, 10) - 1)
    return branches
      .map(b => {
        const bRows    = branchDetail[b.code] ?? []
        const inRange  = (y) => bRows.filter(r => {
          const m = parseInt(r.ym.slice(4, 6), 10)
          return r.ym.startsWith(y) && m >= s2Start && m <= s2End
        })
        const cur  = periodMetric(inRange(s2Year), s2Metric)
        const prv  = periodMetric(inRange(prev),    s2Metric)
        const val  = yoy(cur, prv, s2MetricInfo.isRate)
        return { name: b.name, code: b.code, yoy: val, cur, prev: prv }
      })
      .filter(d => d.yoy != null)
      .sort((a, b) => b.yoy - a.yoy)
  }, [branchDetail, branches, s2Year, s2Start, s2End, s2Metric, s2MetricInfo])

  // ── Section 3: 지표 × 연도 요약 테이블 (동기간 비교) ─────────────────────
  // 각 연도의 최대월까지만 비교 → 2026은 1~4월 vs 2025 1~4월
  const summaryData = useMemo(() => {
    if (!overviewData || !allYears.length) return { rows: [], years: [] }
    const rows = METRICS.map(m => {
      const vals = {}
      for (const year of yoyYears) {
        const prev  = String(parseInt(year, 10) - 1)
        const endMo = maxMonthByYear[year] ?? 12
        const flt   = (y) => overviewData.filter(r => {
          const mo = parseInt(r.ym.slice(4, 6), 10)
          return r.ym.startsWith(y) && mo <= endMo
        })
        vals[year] = yoy(periodMetric(flt(year), m.key), periodMetric(flt(prev), m.key), m.isRate)
      }
      return { ...m, ...vals }
    })
    return { rows, years: yoyYears }
  }, [overviewData, allYears, yoyYears, maxMonthByYear])

  // ── 렌더 ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">

      {/* 헤더 */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">YoY 분석</h2>
        <p className="text-sm text-gray-400 mt-0.5">전년 동기간 대비 증감</p>
      </div>

      {/* ── Section 1: 월별 YoY 추이 라인 차트 ──────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">월별 YoY 추이</h3>
          <div className="flex items-center gap-2">
            <select value={s1Branch} onChange={e => setS1Branch(e.target.value)} className={SEL}>
              <option value="전체">전체</option>
              {branches?.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
            </select>
            <select value={s1Metric} onChange={e => setS1Metric(e.target.value)} className={SEL}>
              {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyYoYData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tickFormatter={m => `${m}월`} tick={{ fontSize: 10 }} interval={0} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={v => `${v.toFixed(0)}${s1MetricInfo.unit}`}
              width={52}
            />
            <Tooltip content={renderS1Tooltip} />
            <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1.5} />
            {yoyYears.map(y => (
              <Line
                key={y}
                type="monotone"
                dataKey={y}
                stroke={YEAR_COLORS[y] ?? '#6366f1'}
                strokeWidth={y === latestYear ? 2.5 : 1.8}
                strokeDasharray={y === latestYear ? '5 3' : undefined}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* 범례 */}
        <div className="flex gap-5 justify-center mt-3">
          {yoyYears.map(y => (
            <div key={y} className="flex items-center gap-1.5">
              <svg width="22" height="10" className="flex-shrink-0">
                <line
                  x1="0" y1="5" x2="22" y2="5"
                  stroke={YEAR_COLORS[y] ?? '#6366f1'}
                  strokeWidth="2"
                  strokeDasharray={y === latestYear ? '4 2' : undefined}
                />
              </svg>
              <span className="text-[11px] text-gray-500">{y}년</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: 지점별 YoY 순위 바 차트 ─────────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">지점별 YoY 순위</h3>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <select value={s2Metric} onChange={e => setS2Metric(e.target.value)} className={SEL}>
              {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <select value={s2Year ?? ''} onChange={e => setS2Year(e.target.value)} className={SEL}>
              {yoyYears.map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select
              value={s2Start}
              onChange={e => { const v = Number(e.target.value); setS2Start(v); if (s2End !== null && v > s2End) setS2End(v) }}
              className={SEL}
            >
              {MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}
            </select>
            <span className="text-xs text-gray-400">~</span>
            <select value={s2End ?? ''} onChange={e => setS2End(Number(e.target.value))} className={SEL}>
              {MONTHS.filter(m => m >= s2Start).map(m => <option key={m} value={m}>{m}월</option>)}
            </select>
          </div>
        </div>

        {branchRankData.length > 0 && (
          <div className="overflow-y-auto" style={{ maxHeight: 500 }}>
            <ResponsiveContainer width="100%" height={branchRankData.length * 24 + 24}>
              <BarChart
                layout="vertical"
                data={branchRankData}
                margin={{ top: 0, right: 56, left: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={v => `${v.toFixed(0)}${s2MetricInfo.unit}`}
                />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={76} />
                <Tooltip content={renderS2Tooltip} />
                <ReferenceLine x={0} stroke="#9ca3af" strokeWidth={1.5} />
                <Bar dataKey="yoy" radius={[0, 3, 3, 0]} label={{ position: 'right', fontSize: 9, formatter: v => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}${s2MetricInfo.unit}` : '' }}>
                  {branchRankData.map((d, i) => {
                    const good = s2MetricInfo.positiveGood ? d.yoy >= 0 : d.yoy < 0
                    return <Cell key={i} fill={good ? '#3b82f6' : '#ef4444'} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ── Section 3: 지표 × 연도 YoY 요약 테이블 ─────────────────────── */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">전체 지표별 YoY 요약</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              전년 동기간 대비 · 각 연도 최대 보유월 기준
              {latestYear && maxMonthByYear[latestYear] < 12 &&
                ` (${latestYear}년은 1~${maxMonthByYear[latestYear]}월)`}
            </p>
          </div>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 pr-4 font-medium text-gray-500">지표</th>
              {summaryData.years.map(y => (
                <th key={y} className="text-right py-2 px-3 font-medium text-gray-500">
                  {y}년
                  {maxMonthByYear[y] < 12 && (
                    <span className="text-gray-300 font-normal ml-0.5">(~{maxMonthByYear[y]}월)</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summaryData.rows.map(({ key, label, unit, isRate, positiveGood, ...vals }) => (
              <tr key={key} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 pr-4 text-gray-700 font-medium">{label}</td>
                {summaryData.years.map(y => {
                  const v    = vals[y]
                  const good = v != null && (positiveGood ? v >= 0 : v < 0)
                  return (
                    <td key={y} className={`text-right py-2 px-3 font-medium tabular-nums ${
                      v == null ? 'text-gray-300' : good ? 'text-blue-500' : 'text-red-500'
                    }`}>
                      {v != null
                        ? `${v >= 0 ? '▲' : '▼'} ${Math.abs(v).toFixed(1)}${unit}`
                        : '-'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
