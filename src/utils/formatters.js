/** 억 원 단위 포맷 (소수점 1자리) */
export function fmtEok(val) {
  if (val == null || isNaN(val)) return '-'
  return `${val.toFixed(1)}억`
}

/** 퍼센트 포맷 (소수점 1자리) */
export function fmtPct(val) {
  if (val == null || isNaN(val)) return '-'
  return `${val.toFixed(1)}%`
}

/** YYYYMM → YYYY.MM */
export function fmtYM(ym) {
  const s = String(ym)
  return `${s.slice(0, 4)}.${s.slice(4, 6)}`
}

/** 증감률에 따른 색상 클래스 (이익 지표는 양수가 좋음) */
export function yoyColor(val) {
  if (val == null) return 'text-gray-400'
  return val >= 0 ? 'text-blue-600' : 'text-red-500'
}
