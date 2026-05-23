import { useState, useEffect, useMemo } from 'react'
import { useAvailableYears, useKpiForRange } from '../../hooks/useBranchData'
import KpiCard from './KpiCard'

const SEL = 'text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500'
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function KpiSection({ rows }) {
  const years = useAvailableYears(rows)

  const [year,       setYear]       = useState(null)
  const [startMonth, setStartMonth] = useState(1)
  const [endMonth,   setEndMonth]   = useState(null)

  // 최신 연도 자동 선택
  useEffect(() => {
    if (years.length > 0) setYear(years[0])
  }, [years])

  // 선택 연도의 최대 월 → endMonth 기본값 (연도 변경 시도 재계산)
  const maxMonth = useMemo(() => {
    if (!rows || !year) return 12
    const ms = rows
      .filter(r => r.ym.startsWith(year))
      .map(r => parseInt(r.ym.slice(4, 6), 10))
    return ms.length > 0 ? Math.max(...ms) : 12
  }, [rows, year])

  useEffect(() => {
    setEndMonth(maxMonth)
    setStartMonth(1)
  }, [maxMonth])

  const kpi      = useKpiForRange(rows, year, startMonth, endMonth)
  const prevYear = year ? String(parseInt(year, 10) - 1) : null

  return (
    <div className="space-y-3">
      {/* 기간 선택 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">기준</span>

        {/* 연도 */}
        <select value={year ?? ''} onChange={e => setYear(e.target.value)} className={SEL}>
          {years.map(y => <option key={y} value={y}>{y}년</option>)}
        </select>

        {/* 시작월 */}
        <select
          value={startMonth}
          onChange={e => {
            const v = Number(e.target.value)
            setStartMonth(v)
            if (endMonth !== null && v > endMonth) setEndMonth(v)
          }}
          className={SEL}
        >
          {MONTHS.map(m => <option key={m} value={m}>{m}월</option>)}
        </select>

        <span className="text-xs text-gray-400">~</span>

        {/* 종료월 (시작월 이상만 표시) */}
        <select
          value={endMonth ?? ''}
          onChange={e => setEndMonth(Number(e.target.value))}
          className={SEL}
        >
          {MONTHS.filter(m => m >= startMonth).map(m => (
            <option key={m} value={m}>{m}월</option>
          ))}
        </select>

        {kpi && prevYear && (
          <span className="text-xs text-gray-300 ml-1">
            · 전년동기({prevYear}년 {startMonth}~{endMonth}월) 대비
          </span>
        )}
      </div>

      {/* KPI 카드 6개 */}
      {kpi && (
        <div className="grid grid-cols-6 gap-3">
          <KpiCard label="외형매출"   value={kpi.외형매출}   unit="억" prev={kpi.외형매출_prev}   yoy={kpi.외형매출_yoy} />
          <KpiCard label="판관비"     value={kpi.판관비}     unit="억" prev={kpi.판관비_prev}     yoy={kpi.판관비_yoy}   positiveGood={false} />
          <KpiCard label="판관비율"   value={kpi.판관비율}   unit="%" prev={kpi.판관비율_prev}   yoy={kpi.판관비율_yoy}  isRate={true} positiveGood={false} />
          <KpiCard label="영업이익"   value={kpi.영업이익}   unit="억" prev={kpi.영업이익_prev}   yoy={kpi.영업이익_yoy} />
          <KpiCard label="영업이익률" value={kpi.영업이익률} unit="%" prev={kpi.영업이익률_prev} yoy={kpi.영업이익률_yoy} isRate={true} />
          <KpiCard label="당기순이익" value={kpi.당기순이익} unit="억" prev={kpi.당기순이익_prev} yoy={kpi.당기순이익_yoy} />
        </div>
      )}
    </div>
  )
}
