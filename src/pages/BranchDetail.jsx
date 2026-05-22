import { useState } from 'react'
import { useOverviewData, useSgaData, toYearlyMonthly } from '../hooks/useOverviewData'
import { useBranches, useBranchDetail, useBranchRows } from '../hooks/useBranchData'
import YearlyLineChart from '../components/charts/YearlyLineChart'
import KpiSection from '../components/charts/KpiSection'
import { SGA_ITEMS } from '../utils/constants'
import { fmtYM } from '../utils/formatters'

const CHARTS = [
  {
    title: '외형매출',
    accessor: row => row['외형매출'],
    unit: '억원',
  },
  {
    title: '판매비와 관리비 (판관비)',
    accessor: row => row['판관비'],
    unit: '억원',
  },
  {
    title: '판관비율 (판관비 ÷ 외형매출)',
    accessor: row => row['외형매출'] ? row['판관비'] / row['외형매출'] * 100 : null,
    unit: '%',
  },
  {
    title: '영업이익',
    accessor: row => row['영업이익'],
    unit: '억원',
  },
  {
    title: '영업이익률 (영업이익 ÷ 외형매출)',
    accessor: row => row['외형매출'] ? row['영업이익'] / row['외형매출'] * 100 : null,
    unit: '%',
  },
]

export default function BranchDetail() {
  const overviewData   = useOverviewData()
  const sgaData        = useSgaData()
  const branches       = useBranches()
  const branchDetail   = useBranchDetail()
  const [selectedCode, setSelectedCode] = useState('전체')
  const [selectedSga,  setSelectedSga]  = useState(SGA_ITEMS[0])

  const rows    = useBranchRows(selectedCode, overviewData, branchDetail)
  const sgaRows = selectedCode === '전체' ? sgaData : rows

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* 헤더 + 지점 선택 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">지점별 분석</h2>
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

      {/* KPI 카드 + 기간 선택 */}
      <KpiSection rows={rows} />

      {/* 차트 5개 */}
      <div className="space-y-8">
        {CHARTS.map(({ title, accessor, unit }) => {
          const result = toYearlyMonthly(rows, accessor)
          return (
            <section key={title} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <YearlyLineChart
                title={title}
                chartData={result?.chartData}
                years={result?.years}
                unit={unit}
              />
            </section>
          )
        })}
      </div>

      {/* 판관비 세목 상세 */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">판관비 세목 상세</h3>
          <select
            value={selectedSga}
            onChange={e => setSelectedSga(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {SGA_ITEMS.map(item => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        {(() => {
          const result = toYearlyMonthly(sgaRows, selectedSga)
          return (
            <YearlyLineChart
              title={selectedSga}
              chartData={result?.chartData}
              years={result?.years}
            />
          )
        })()}
      </section>
    </div>
  )
}
