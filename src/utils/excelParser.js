/**
 * AMIS 엑셀 파일 파서
 * preprocess.py 로직을 브라우저에서 실행
 */
import * as XLSX from 'xlsx'

const SEQ_LABELS = {
  1010: '외형매출',
  1700: '순매출액',
  2900: '매출원가',
  4100: '매출총이익',
  5100: '판관비',
  5200: '급료와임금',
  5300: '성과상여',
  5400: '퇴충단퇴충',
  5500: '복리후생비',
  5600: '지급수수료',
  5700: '감가상각비',
  5800: '지급임차료',
  5900: '광고선전비',
  6000: '수도광열비',
  6100: '세금과공과',
  6200: '소모품비',
  6300: '운반비',
  6400: '여비교통비',
  6500: '교육훈련비',
  6600: '포장비',
  6700: '대손상각비',
  6800: '기타판관비',
  6900: 'CO안분경비',
  7000: '지급수수료사내대여',
  7100: '영업이익',
  7200: '기타영업손익',
  7600: '금융손익',
  7900: '법인세전이익',
  8000: '법인세비용',
  8100: '당기순이익',
}

const SGA_SEQS = [
  5200, 5300, 5400, 5500, 5600, 5700, 5800, 5900,
  6000, 6100, 6200, 6300, 6400, 6500, 6600, 6700, 6800, 6900, 7000,
]

function toEok(val) {
  return Math.round((val / 1e8) * 10) / 10
}

export function parseAmisExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb = XLSX.read(data, { type: 'array' })

        // ── Sheet1: 원본 재무 데이터 ──────────────────────────────
        const ws1 = wb.Sheets['Sheet1']
        if (!ws1) throw new Error("'Sheet1' 시트를 찾을 수 없습니다.")
        // header:1 → 배열 형태로 읽기 (첫 행 = 헤더, 인덱스로 접근)
        const raw = XLSX.utils.sheet_to_json(ws1, { header: 1, defval: null })
        // 컬럼 순서: [년월, 법인, 지점, SEQ, SETNAME_BI, SETNAME_BI_T, AMT]

        // ── Sheet2: 사업장 코드 ───────────────────────────────────
        const ws2 = wb.Sheets[wb.SheetNames[1]]
        if (!ws2) throw new Error('사업장코드 시트를 찾을 수 없습니다.')
        const codeRaw = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: null })
        // 컬럼 순서: [법인, Plnt, 지점명]

        // 지점명 맵 구축
        const branchNames = {}
        for (let i = 1; i < codeRaw.length; i++) {
          const row = codeRaw[i]
          if (!row[1] || !row[2]) continue
          const code = String(row[1]).padStart(4, '0')
          branchNames[code] = String(row[2]).trim()
        }

        // 대상 지점: 72xx, 82xx
        const targetFromSheet = new Set(
          Object.keys(branchNames).filter(c => c.startsWith('72') || c.startsWith('82'))
        )

        // ── 집계: agg[ym][code][seq] = 합계 AMT ──────────────────
        const agg = {}
        let totalRows = 0

        for (let i = 1; i < raw.length; i++) {
          const row = raw[i]
          if (!row || row.length < 7) continue
          const ym  = row[0]
          const branch = row[2]
          const seq = row[3]
          const amt = row[6]
          if (ym == null || seq == null || amt == null || isNaN(Number(amt))) continue

          const code = String(branch).padStart(4, '0')
          if (!targetFromSheet.has(code)) continue

          const ymStr  = String(ym)
          const seqNum = Number(seq)
          const amtNum = Number(amt)

          if (!agg[ymStr]) agg[ymStr] = {}
          if (!agg[ymStr][code]) agg[ymStr][code] = {}
          agg[ymStr][code][seqNum] = (agg[ymStr][code][seqNum] || 0) + amtNum
          totalRows++
        }

        // 실제 데이터에 존재하는 대상 지점
        const actualCodes = new Set()
        for (const ymData of Object.values(agg)) {
          for (const code of Object.keys(ymData)) actualCodes.add(code)
        }
        const targetCodes = [...targetFromSheet].filter(c => actualCodes.has(c)).sort()
        const sortedYMs   = Object.keys(agg).sort()

        // ── 1. branches.json ──────────────────────────────────────
        const branches = targetCodes.map(code => ({
          code,
          name: branchNames[code] || code,
        }))

        // ── 2. overview.json ──────────────────────────────────────
        const overview = []
        for (const ym of sortedYMs) {
          const totals = {}
          for (const code of targetCodes) {
            for (const [seqStr, val] of Object.entries(agg[ym][code] || {})) {
              const s = Number(seqStr)
              totals[s] = (totals[s] || 0) + val
            }
          }
          const entry = { ym }
          for (const [seq, label] of Object.entries(SEQ_LABELS)) {
            entry[label] = toEok(totals[Number(seq)] || 0)
          }
          const nm = totals[1700] || 0
          const op = totals[7100] || 0
          entry['영업이익률'] = nm !== 0 ? Math.round(op / nm * 1000) / 10 : 0
          overview.push(entry)
        }

        // ── 3. branch_detail.json ─────────────────────────────────
        const branchDetail = {}
        for (const code of targetCodes) {
          const months = []
          for (const ym of sortedYMs) {
            const cd = agg[ym]?.[code] || {}
            const entry = { ym }
            for (const [seq, label] of Object.entries(SEQ_LABELS)) {
              entry[label] = toEok(cd[Number(seq)] || 0)
            }
            const nm = cd[1700] || 0
            const op = cd[7100] || 0
            entry['영업이익률'] = nm !== 0 ? Math.round(op / nm * 1000) / 10 : 0
            months.push(entry)
          }
          branchDetail[code] = months
        }

        // ── 4. sga_monthly.json ───────────────────────────────────
        const sgaMonthly = []
        for (const ym of sortedYMs) {
          const entry = { ym }
          for (const seq of SGA_SEQS) {
            let total = 0
            for (const code of targetCodes) {
              total += agg[ym]?.[code]?.[seq] || 0
            }
            entry[SEQ_LABELS[seq]] = toEok(total)
          }
          sgaMonthly.push(entry)
        }

        // ── 5. yoy.json ───────────────────────────────────────────
        const yoy = []
        for (const ym of sortedYMs) {
          const ymNum    = parseInt(ym, 10)
          const prevYmStr = String(ymNum - 100)
          if (!agg[prevYmStr]) continue

          const cur  = {}
          const prev = {}
          for (const code of targetCodes) {
            for (const seq of [1010, 1700, 7100, 8100]) {
              cur[seq]  = (cur[seq]  || 0) + (agg[ym]?.[code]?.[seq]  || 0)
              prev[seq] = (prev[seq] || 0) + (agg[prevYmStr]?.[code]?.[seq] || 0)
            }
          }
          const entry = { ym }
          for (const [seq, label] of [[1010, '외형매출'], [1700, '순매출액'], [7100, '영업이익'], [8100, '당기순이익']]) {
            const c = cur[seq]  || 0
            const p = prev[seq] || 0
            entry[`${label}_당기`] = toEok(c)
            entry[`${label}_전기`] = toEok(p)
            entry[`${label}_YoY`]  = p !== 0 ? Math.round((c - p) / Math.abs(p) * 1000) / 10 : null
          }
          yoy.push(entry)
        }

        // ── 통계 ─────────────────────────────────────────────────
        const stats = {
          totalRows,
          branchCount: targetCodes.length,
          ymRange: sortedYMs.length > 0
            ? `${sortedYMs[0].slice(0, 4)}.${sortedYMs[0].slice(4)} ~ ${sortedYMs.at(-1).slice(0, 4)}.${sortedYMs.at(-1).slice(4)}`
            : '-',
        }

        resolve({ branches, overview, branchDetail, sgaMonthly, yoy, stats })
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = () => reject(new Error('파일 읽기 실패'))
    reader.readAsArrayBuffer(file)
  })
}
