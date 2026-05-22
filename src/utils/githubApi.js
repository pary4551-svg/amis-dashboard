/**
 * GitHub Git Data API
 * 파일 크기 제한 없이 여러 파일을 한 번의 커밋으로 업로드
 */

const API = 'https://api.github.com'

function makeHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }
}

async function api(token, method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: makeHeaders(token),
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${json.message || JSON.stringify(json)}`)
  return json
}

// UTF-8 문자열 → base64 (한글 포함 안전)
function toBase64(str) {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

/**
 * files: [{ path: 'public/data/xxx.json', content: '...' }, ...]
 * onProgress: ({ step, message?, index?, total?, path? }) => void
 */
export async function uploadDataToGitHub({ token, owner, repo, files, onProgress }) {
  const base = `/repos/${owner}/${repo}`

  // 1. main 브랜치 최신 커밋 SHA 조회
  onProgress?.({ step: 'init', message: '저장소 연결 중...' })
  const ref = await api(token, 'GET', `${base}/git/refs/heads/main`)
  const latestSha = ref.object.sha

  // 2. 현재 트리 SHA 조회
  const commit = await api(token, 'GET', `${base}/git/commits/${latestSha}`)
  const baseTreeSha = commit.tree.sha

  // 3. 파일별 blob 생성
  const treeItems = []
  for (let i = 0; i < files.length; i++) {
    const { path, content } = files[i]
    onProgress?.({ step: 'upload', index: i + 1, total: files.length, path })

    const blob = await api(token, 'POST', `${base}/git/blobs`, {
      content: toBase64(content),
      encoding: 'base64',
    })

    treeItems.push({ path, mode: '100644', type: 'blob', sha: blob.sha })
  }

  // 4. 새 트리 생성
  onProgress?.({ step: 'tree', message: '파일 구조 생성 중...' })
  const tree = await api(token, 'POST', `${base}/git/trees`, {
    base_tree: baseTreeSha,
    tree: treeItems,
  })

  // 5. 커밋 생성
  onProgress?.({ step: 'commit', message: '커밋 생성 중...' })
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).replace(/\. /g, '-').replace('.', '')

  const newCommit = await api(token, 'POST', `${base}/git/commits`, {
    message: `데이터 업데이트 ${today}`,
    tree: tree.sha,
    parents: [latestSha],
  })

  // 6. main 브랜치 ref 업데이트
  onProgress?.({ step: 'push', message: '배포 트리거 중...' })
  await api(token, 'PATCH', `${base}/git/refs/heads/main`, { sha: newCommit.sha })

  return newCommit.sha
}

// GitHub Token 유효성 간단 확인
export async function verifyToken(token) {
  try {
    const res = await fetch(`${API}/user`, { headers: makeHeaders(token) })
    if (!res.ok) return null
    const user = await res.json()
    return user.login
  } catch {
    return null
  }
}
