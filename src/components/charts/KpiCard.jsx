// isRate=true 이면 YoY를 pp(포인트) 단위로 표시
// positiveGood=false 이면 증가가 빨간색 (판관비 같은 비용 지표)
export default function KpiCard({ label, value, unit = '억', yoy = null, isRate = false, positiveGood = true }) {
  const suffix = isRate ? 'pp' : '%'

  let yoyColor = 'text-gray-300'
  let yoyIcon = ''
  if (yoy != null) {
    const isUp = yoy >= 0
    const good = positiveGood ? isUp : !isUp
    yoyColor = good ? 'text-blue-500' : 'text-red-500'
    yoyIcon = isUp ? '▲' : '▼'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-3">
      <p className="text-[11px] text-gray-400 font-medium mb-1 whitespace-nowrap">{label}</p>
      <p className="text-xl font-bold text-gray-800 leading-none">
        {value != null ? value.toFixed(1) : '-'}
        <span className="text-xs font-normal text-gray-400 ml-0.5">{unit}</span>
      </p>
      <p className={`text-[11px] mt-1.5 font-medium ${yoyColor}`}>
        {yoy != null
          ? `${yoyIcon} ${Math.abs(yoy).toFixed(1)}${suffix} (전년동기)`
          : '전년 데이터 없음'}
      </p>
    </div>
  )
}
