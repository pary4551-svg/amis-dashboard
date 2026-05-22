import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'

// 연도별 색상
const YEAR_COLORS = {
  '2022': '#94a3b8',
  '2023': '#3b82f6',
  '2024': '#10b981',
  '2025': '#f59e0b',
  '2026': '#ef4444',
}

const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null
  const suffix = unit === '%' ? '%' : '억'
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{MONTH_LABELS[label - 1]}</p>
      {payload.map(p => (
        p.value != null && (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.dataKey}년: {p.value.toFixed(1)}{suffix}
          </p>
        )
      ))}
    </div>
  )
}

export default function YearlyLineChart({ title, chartData, years, unit = '억원' }) {
  if (!chartData) return (
    <div className="h-56 flex items-center justify-center text-gray-300 text-sm">로딩 중...</div>
  )

  // y축 범위: 양수 데이터는 0에서 시작, 음수 있으면 아래로 확장
  const allVals = chartData.flatMap(d => years.map(y => d[y]).filter(v => v != null && isFinite(v)))
  if (allVals.length === 0) return null
  const rawMin = Math.min(...allVals)
  const rawMax = Math.max(...allVals)
  const pad = Math.abs(rawMax) * 0.08 || 1
  const yMin = rawMin < 0 ? rawMin - pad : 0
  const yMax = rawMax + pad

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 24, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tickFormatter={m => `${m}월`}
            tick={{ fontSize: 10, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tickFormatter={v => v.toFixed(0)}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            width={48}
            domain={[yMin, yMax]}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={v => `${v}년`}
          />
          {rawMin < 0 && <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1} />}
          {years.map(year => (
            <Line
              key={year}
              type="monotone"
              dataKey={year}
              stroke={YEAR_COLORS[year] ?? '#6b7280'}
              strokeWidth={year === '2026' ? 2 : 1.5}
              strokeDasharray={year === '2026' ? '5 3' : undefined}
              dot={false}
              connectNulls={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
