import { useState, useRef } from 'react'
import { parseAmisExcel } from '../utils/excelParser'
import { uploadDataToGitHub, verifyToken } from '../utils/githubApi'

const LS_TOKEN = 'amis_gh_token'
const LS_OWNER = 'amis_gh_owner'
const LS_REPO  = 'amis_gh_repo'

const STEPS = ['init', 'upload', 'tree', 'commit', 'push']
const STEP_LABEL = {
  init:   '저장소 연결',
  upload: '파일 업로드',
  tree:   '파일 구조 생성',
  commit: '커밋 생성',
  push:   '배포 트리거',
}

const FILES = [
  'branches.json',
  'overview.json',
  'branch_detail.json',
  'sga_monthly.json',
  'yoy.json',
]

export default function DataUpload() {
  const [token,   setToken]   = useState(() => localStorage.getItem(LS_TOKEN) || '')
  const [owner,   setOwner]   = useState(() => localStorage.getItem(LS_OWNER) || 'pary4551-svg')
  const [repo,    setRepo]    = useState(() => localStorage.getItem(LS_REPO)  || 'amis-dashboard')
  const [tokenOk, setTokenOk] = useState(null) // null | string(login) | false

  const [file,      setFile]      = useState(null)
  const [parsed,    setParsed]    = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState(null)  // { step, index?, total?, path? }
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState(null)

  const fileRef = useRef()

  // ── 설정 저장 ──────────────────────────────────────────────────
  function saveSettings() {
    localStorage.setItem(LS_TOKEN, token)
    localStorage.setItem(LS_OWNER, owner)
    localStorage.setItem(LS_REPO,  repo)
  }

  // ── Token 검증 ─────────────────────────────────────────────────
  async function handleVerifyToken() {
    setTokenOk(null)
    const login = await verifyToken(token)
    setTokenOk(login || false)
    if (login) saveSettings()
  }

  // ── 파일 선택 ──────────────────────────────────────────────────
  function handleFileChange(f) {
    if (!f) return
    setFile(f)
    setParsed(null)
    setDone(false)
    setError(null)
  }

  // ── 파일 분석 ──────────────────────────────────────────────────
  async function handleAnalyze() {
    if (!file) return
    setAnalyzing(true)
    setError(null)
    setParsed(null)
    try {
      const result = await parseAmisExcel(file)
      setParsed(result)
    } catch (e) {
      setError(`파싱 오류: ${e.message}`)
    } finally {
      setAnalyzing(false)
    }
  }

  // ── GitHub 배포 ────────────────────────────────────────────────
  async function handleDeploy() {
    if (!parsed || !token) return
    setUploading(true)
    setDone(false)
    setError(null)
    setProgress(null)
    saveSettings()

    try {
      const files = [
        { path: 'public/data/branches.json',     content: JSON.stringify(parsed.branches,     null, 2) },
        { path: 'public/data/overview.json',      content: JSON.stringify(parsed.overview,     null, 2) },
        { path: 'public/data/branch_detail.json', content: JSON.stringify(parsed.branchDetail, null, 2) },
        { path: 'public/data/sga_monthly.json',   content: JSON.stringify(parsed.sgaMonthly,   null, 2) },
        { path: 'public/data/yoy.json',           content: JSON.stringify(parsed.yoy,          null, 2) },
      ]

      await uploadDataToGitHub({ token, owner, repo, files, onProgress: setProgress })
      setDone(true)
    } catch (e) {
      setError(`배포 오류: ${e.message}`)
    } finally {
      setUploading(false)
    }
  }

  // ── 진행 단계 계산 ─────────────────────────────────────────────
  const currentStepIdx = progress
    ? progress.step === 'upload'
      ? 1
      : STEPS.indexOf(progress.step)
    : -1

  const uploadedCount = progress?.step === 'upload' ? progress.index : done ? FILES.length : 0

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">

      {/* 헤더 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800">데이터 업데이트</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          엑셀 파일 업로드 → 자동 변환 → GitHub 배포까지 한 번에 처리됩니다.
        </p>
      </div>

      {/* ① GitHub 설정 */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center">1</span>
          GitHub 설정
        </h3>

        <div className="space-y-3">
          {/* Token */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Personal Access Token
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=AMIS+Dashboard"
                target="_blank" rel="noopener noreferrer"
                className="ml-2 text-brand-500 hover:underline font-normal"
              >
                발급하기 →
              </a>
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={token}
                onChange={e => { setToken(e.target.value); setTokenOk(null) }}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={handleVerifyToken}
                disabled={!token}
                className="px-3 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap"
              >
                확인
              </button>
            </div>
            {tokenOk === false && (
              <p className="text-xs text-red-500 mt-1">❌ 유효하지 않은 토큰입니다</p>
            )}
            {tokenOk && (
              <p className="text-xs text-green-600 mt-1">✅ {tokenOk} 로그인 확인</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              브라우저에 암호화 없이 저장됩니다. 개인 PC 전용으로 사용하세요.
            </p>
          </div>

          {/* Owner / Repo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">GitHub 계정</label>
              <input
                value={owner}
                onChange={e => setOwner(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">저장소 이름</label>
              <input
                value={repo}
                onChange={e => setRepo(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ② 파일 업로드 */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center">2</span>
          엑셀 파일 선택
        </h3>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            file
              ? 'border-brand-300 bg-brand-50'
              : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
          }`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFileChange(e.dataTransfer.files[0]) }}
        >
          <input
            ref={fileRef} type="file" accept=".xlsx" className="hidden"
            onChange={e => handleFileChange(e.target.files[0])}
          />
          {file ? (
            <div>
              <p className="text-sm font-semibold text-brand-700">📄 {file.name}</p>
              <p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB · 클릭하면 다른 파일로 변경</p>
            </div>
          ) : (
            <div>
              <p className="text-2xl mb-2">📂</p>
              <p className="text-sm text-gray-600 font-medium">클릭하거나 파일을 끌어다 놓으세요</p>
              <p className="text-xs text-gray-400 mt-1">R100_AMIS_월별지점별_*.xlsx</p>
            </div>
          )}
        </div>

        {file && !parsed && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="w-full py-2.5 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {analyzing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                분석 중...
              </span>
            ) : '파일 분석하기'}
          </button>
        )}
      </section>

      {/* ③ 분석 결과 + 배포 */}
      {parsed && (
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center">3</span>
            분석 결과
          </h3>

          {/* 통계 카드 */}
          <div className="grid grid-cols-3 gap-3">
            {[
              ['데이터 기간', parsed.stats.ymRange],
              ['대상 지점',   `${parsed.stats.branchCount}개`],
              ['원본 행 수',  `${parsed.stats.totalRows.toLocaleString()}행`],
            ].map(([label, val]) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-sm font-bold text-gray-800 mt-1">{val}</p>
              </div>
            ))}
          </div>

          {/* 생성될 파일 목록 */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            {[
              ['branches.json',     `${parsed.branches.length}개 지점`],
              ['overview.json',     `${parsed.overview.length}개월`],
              ['branch_detail.json', `${Object.keys(parsed.branchDetail).length}개 지점`],
              ['sga_monthly.json',  `${parsed.sgaMonthly.length}개월`],
              ['yoy.json',          `${parsed.yoy.length}개 기간`],
            ].map(([name, desc], idx) => (
              <div
                key={name}
                className={`flex items-center justify-between px-4 py-2.5 text-xs ${
                  idx < 4 ? 'border-b border-gray-100' : ''
                } ${done || (progress?.step === 'upload' && progress.index > idx)
                    ? 'bg-green-50'
                    : ''
                }`}
              >
                <span className="font-mono text-gray-600">{name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{desc}</span>
                  {(done || (progress?.step === 'upload' && progress.index > idx)) && (
                    <span className="text-green-500">✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 배포 버튼 */}
          {!done ? (
            <button
              onClick={handleDeploy}
              disabled={uploading || !token}
              className="w-full py-3 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {progress ? STEP_LABEL[progress.step] + '...' : '준비 중...'}
                </span>
              ) : (
                !token ? '① Token을 먼저 입력해주세요' : 'GitHub에 배포하기 🚀'
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-700 bg-green-50 rounded-xl px-4 py-3">
                <span>✅ 배포 완료!</span>
                <span className="text-xs text-green-600 font-normal">GitHub Actions가 빌드 중... 1~2분 후 반영됩니다.</span>
              </div>
              <a
                href={`https://${owner}.github.io/${repo}/`}
                target="_blank" rel="noopener noreferrer"
                className="block text-center text-sm text-brand-600 hover:underline py-1"
              >
                → https://{owner}.github.io/{repo}/ 열기
              </a>
              <button
                onClick={() => { setFile(null); setParsed(null); setDone(false) }}
                className="w-full py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                다른 파일 업로드하기
              </button>
            </div>
          )}
        </section>
      )}

      {/* 진행 상황 (업로드 중) */}
      {uploading && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">진행 상황</h3>
          <div className="space-y-2">
            {STEPS.map((step, idx) => {
              const isDone    = idx < currentStepIdx || done
              const isCurrent = idx === currentStepIdx && uploading
              return (
                <div key={step} className="flex items-center gap-3 text-sm">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                    isDone    ? 'bg-green-500 text-white'
                    : isCurrent ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isDone ? '✓' : idx + 1}
                  </span>
                  <span className={isCurrent ? 'font-medium text-gray-800' : isDone ? 'text-gray-400 line-through' : 'text-gray-400'}>
                    {STEP_LABEL[step]}
                    {step === 'upload' && isCurrent && ` (${uploadedCount}/${FILES.length})`}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 에러 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <p className="font-semibold mb-1">오류 발생</p>
          <p className="font-mono text-xs whitespace-pre-wrap">{error}</p>
        </div>
      )}
    </div>
  )
}
