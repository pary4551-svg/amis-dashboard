import { useState } from 'react'
import { useOverviewData, useSgaData, toYearlyMonthly } from '../hooks/useOverviewData'
import YearlyLineChart from '../components/charts/YearlyLineChart'
import KpiSection from '../components/charts/KpiSection'
import { SGA_ITEMS } from '../utils/constants'

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

export default function Overview() {
  const overviewData = useOverviewData()
  const sgaData = useSgaData()
  const [selectedSga, setSelectedSga] = useState(SGA_ITEMS[0])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* 헤더 */}
      <div>
        <h2 className="text-xl font-bold text-gray-800">전체 현황</h2>
        <p className="text-sm text-gray-400 mt-0.5">전 지점 합산 · 억 원 단위</p>
      </div>

      {/* KPI 카드 + 기간 선택 */}
      <KpiSection rows={overviewData} />

      {/* 주요 지표 차트 5개 */}
      <div className="space-y-8">
        {CHARTS.map(({ title, accessor, unit }) => {
          const result = toYearlyMonthly(overviewData, accessor)
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
          const result = toYearlyMonthly(sgaData, selectedSga)
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
