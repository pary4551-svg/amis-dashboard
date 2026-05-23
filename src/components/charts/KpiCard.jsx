// isRate=true 이면 YoY를 pp(포인트) 단위로 표시
// positiveGood=false 이면 증가가 빨간색 (판관비 같은 비용 지표)
export default function KpiCard({
  label,
  value,
  unit = '억',
  yoy = null,
  prev = null,
  isRate = false,
  positiveGood = true,
}) {
  const yoySuffix = isRate ? 'pp' : '%'

  let yoyColor = 'text-gray-300'
  let yoyIcon  = ''
  if (yoy != null) {
    const isUp = yoy >= 0
    const good = positiveGood ? isUp : !isUp
    yoyColor = good ? 'text-blue-500' : 'text-red-500'
    yoyIcon  = isUp ? '▲' : '▼'
  }

  // ── 툴팁 내용 ─────────────────────────────────────────────────
  const hasTip = prev != null && value != null && yoy != null

  // 절대 증감 (금액 지표만)
  const delta      = !isRate && prev != null && value != null ? value - prev : null
  const deltaSign  = delta != null ? (delta >= 0 ? '+' : '') : ''
  const deltaColor = delta != null
    ? (positiveGood ? (delta >= 0 ? 'text-blue-400' : 'text-red-400') : (delta >= 0 ? 'text-red-400' : 'text-blue-400'))
    : ''

  const fmt = (v) => v != null ? v.toFixed(1) : '-'

  return (
    <div className="relative group bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-3">

      {/* 툴팁 */}
      {hasTip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5
                        opacity-0 group-hover:opacity-100
                        transition-opacity duration-150
                        z-30 pointer-events-none">
          <div className="bg-gray-900 text-white rounded-xl shadow-xl px-3.5 py-2.5 whitespace-nowrap text-[11px] leading-relaxed">
            {/* 전년 → 당해 */}
            <div className="flex items-center gap-2 text-gray-300">
              <span>전년동기</span>
              <span className="font-semibold text-white">{fmt(prev)}{unit}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-300">당해기간</span>
              <span className="font-bold text-white">{fmt(value)}{unit}</span>
            </div>
            {/* 구분선 */}
            <div className="border-t border-gray-700 my-1.5" />
            {/* 증감 */}
            <div className="flex items-center gap-2">
              <span className="text-gray-300">전년대비</span>
              <span className={`font-semibold ${yoyColor}`}>
                {yoyIcon} {Math.abs(yoy).toFixed(1)}{yoySuffix}
              </span>
              {delta != null && (
                <span className={`text-[10px] ${deltaColor}`}>
                  ({deltaSign}{fmt(delta)}{unit})
                </span>
              )}
            </div>
          </div>
          {/* 말풍선 꼬리 */}
          <div className="absolute top-full left-1/2 -translate-x-1/2
                          border-[5px] border-transparent border-t-gray-900" />
        </div>
      )}

      {/* 카드 본문 */}
      <p className="text-[11px] text-gray-400 font-medium mb-1 whitespace-nowrap">{label}</p>
      <p className="text-xl font-bold text-gray-800 leading-none">
        {value != null ? value.toFixed(1) : '-'}
        <span className="text-xs font-normal text-gray-400 ml-0.5">{unit}</span>
      </p>
      <p className={`text-[11px] mt-1.5 font-medium ${yoyColor}`}>
        {yoy != null
          ? `${yoyIcon} ${Math.abs(yoy).toFixed(1)}${yoySuffix} (전년동기)`
          : '전년 데이터 없음'}
      </p>
    </div>
  )
}
