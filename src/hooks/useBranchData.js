import { useState, useEffect, useMemo } from 'react'

const BASE = import.meta.env.BASE_URL

export function useBranches() {
  const [branches, setBranches] = useState(null)
  useEffect(() => {
    fetch(`${BASE}data/branches.json`).then(r => r.json()).then(setBranches)
  }, [])
  return branches
}

export function useBranchDetail() {
  const [detail, setDetail] = useState(null)
  useEffect(() => {
    fetch(`${BASE}data/branch_detail.json`).then(r => r.json()).then(setDetail)
  }, [])
  return detail
}

// 선택된 지점(또는 전체)의 월별 rows 반환
export function useBranchRows(selectedCode, overviewData, branchDetail) {
  return useMemo(() => {
    if (selectedCode === '전체') return overviewData
    if (!branchDetail || !selectedCode) return null
    return branchDetail[selectedCode] ?? null
  }, [selectedCode, overviewData, branchDetail])
}

// rows에서 선택 가능한 기간 목록 (최신순)
export function useAvailablePeriods(rows) {
  return useMemo(() => {
    if (!rows) return []
    return [...new Set(rows.map(r => r.ym))].sort().reverse()
  }, [rows])
}

// rows에서 사용 가능한 연도 목록 (최신순)
export function useAvailableYears(rows) {
  return useMemo(() => {
    if (!rows) return []
    return [...new Set(rows.map(r => r.ym.slice(0, 4)))].sort().reverse()
  }, [rows])
}

// 연도 + 시작/종료월 범위 기준 KPI + 전년동기대비
export function useKpiForRange(rows, year, startMonth, endMonth) {
  return useMemo(() => {
    if (!rows || !year || !startMonth || !endMonth) return null

    const inRange = (ym, y) => {
      const m = parseInt(ym.slice(4, 6), 10)
      return ym.startsWith(y) && m >= startMonth && m <= endMonth
    }

    const periodRows = rows.filter(r => inRange(r.ym, year))
    if (periodRows.length === 0) return null

    const prevYear = String(parseInt(year, 10) - 1)
    const prevRows = rows.filter(r => inRange(r.ym, prevYear))

    const sum = (arr, field) => arr.reduce((s, r) => s + (r[field] ?? 0), 0)

    const ext      = sum(periodRows, '외형매출')
    const pExt     = sum(prevRows,   '외형매출')
    const pg       = sum(periodRows, '판관비')
    const pPg      = sum(prevRows,   '판관비')
    const op       = sum(periodRows, '영업이익')
    const pOp      = sum(prevRows,   '영업이익')
    const ni       = sum(periodRows, '당기순이익')
    const pNi      = sum(prevRows,   '당기순이익')

    const pgRatio     = ext  !== 0 ? pg  / ext  * 100 : null
    const opRatio     = ext  !== 0 ? op  / ext  * 100 : null
    const pgRatioPrev = pExt !== 0 ? pPg / pExt * 100 : null
    const opRatioPrev = pExt !== 0 ? pOp / pExt * 100 : null

    const pctYoY = (cur, prev) =>
      prev && prev !== 0 ? (cur - prev) / Math.abs(prev) * 100 : null
    const ppYoY = (cur, prev) =>
      cur != null && prev != null ? cur - prev : null

    return {
      year, startMonth, endMonth,
      외형매출:       ext,
      외형매출_yoy:   pctYoY(ext, pExt),
      판관비:         pg,
      판관비_yoy:     pctYoY(pg, pPg),
      판관비율:       pgRatio,
      판관비율_yoy:   ppYoY(pgRatio, pgRatioPrev),
      영업이익:       op,
      영업이익_yoy:   pctYoY(op, pOp),
      영업이익률:     opRatio,
      영업이익률_yoy: ppYoY(opRatio, opRatioPrev),
      당기순이익:     ni,
      당기순이익_yoy: pctYoY(ni, pNi),
    }
  }, [rows, year, startMonth, endMonth])
}

// 특정 기간 기준 KPI + 전년동기대비
export function useKpiForPeriod(rows, ym) {
  return useMemo(() => {
    if (!rows || !ym) return null

    const row = rows.find(r => r.ym === ym)
    if (!row) return null

    const prevYM = String(parseInt(ym, 10) - 100) // 전년 동월
    const prev = rows.find(r => r.ym === prevYM) ?? null

    const ext  = row['외형매출'] ?? 0
    const pExt = prev?.['외형매출'] ?? 0

    const pctYoY = (cur, p) =>
      p && p !== 0 ? (cur - p) / Math.abs(p) * 100 : null

    const ppYoY = (curRate, prevRate) =>
      curRate != null && prevRate != null ? curRate - prevRate : null

    const pgRatio = ext !== 0 ? row['판관비'] / ext * 100 : null
    const opRatio = ext !== 0 ? row['영업이익'] / ext * 100 : null
    const pgRatioPrev = pExt !== 0 && prev ? prev['판관비'] / pExt * 100 : null
    const opRatioPrev = pExt !== 0 && prev ? prev['영업이익'] / pExt * 100 : null

    return {
      ym,
      외형매출:     row['외형매출'],
      외형매출_yoy: pctYoY(row['외형매출'], prev?.['외형매출']),
      판관비:       row['판관비'],
      판관비_yoy:   pctYoY(row['판관비'], prev?.['판관비']),
      판관비율:     pgRatio,
      판관비율_yoy: ppYoY(pgRatio, pgRatioPrev),
      영업이익:     row['영업이익'],
      영업이익_yoy: pctYoY(row['영업이익'], prev?.['영업이익']),
      영업이익률:   opRatio,
      영업이익률_yoy: ppYoY(opRatio, opRatioPrev),
      당기순이익:     row['당기순이익'],
      당기순이익_yoy: pctYoY(row['당기순이익'], prev?.['당기순이익']),
    }
  }, [rows, ym])
}
