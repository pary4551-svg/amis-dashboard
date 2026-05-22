import { useState, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL

export function useOverviewData() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch(`${BASE}data/overview.json`)
      .then(r => r.json())
      .then(setData)
  }, [])

  return data
}

export function useSgaData() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch(`${BASE}data/sga_monthly.json`)
      .then(r => r.json())
      .then(setData)
  }, [])

  return data
}

/**
 * overview/sga/branch 배열을 연도별 월별 차트 형식으로 변환
 * fieldOrFn: 문자열(필드명) 또는 함수 (row) => value
 * output: [{month:1, '2022':value, '2023':value, ...}, ...]
 */
export function toYearlyMonthly(rows, fieldOrFn) {
  if (!rows) return null

  const accessor = typeof fieldOrFn === 'function'
    ? fieldOrFn
    : row => row[fieldOrFn] ?? null

  const years = [...new Set(rows.map(r => r.ym.slice(0, 4)))].sort()
  const byMonth = {}

  for (const row of rows) {
    const year = row.ym.slice(0, 4)
    const month = parseInt(row.ym.slice(4, 6), 10)
    if (!byMonth[month]) byMonth[month] = { month }
    const val = accessor(row)
    byMonth[month][year] = (val != null && isFinite(val)) ? val : null
  }

  return {
    chartData: Array.from({ length: 12 }, (_, i) => byMonth[i + 1] ?? { month: i + 1 }),
    years,
  }
}
