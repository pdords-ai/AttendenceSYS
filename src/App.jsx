import React, { useEffect, useRef, useState } from 'react'

const COLS = 10
const ROWS = 20
const BLOCK = 30

const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
}

function createMatrix(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(0))
}

function rotate(matrix) {
  const N = matrix.length
  const res = Array.from({ length: N }, () => Array(N).fill(0))
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      res[x][N - 1 - y] = matrix[y][x]
    }
  }
  return res
}

function randomPiece() {
  const keys = Object.keys(SHAPES)
  const key = keys[Math.floor(Math.random() * keys.length)]
  const shape = SHAPES[key]
  return { key, shape, x: Math.floor(COLS / 2) - Math.ceil(shape[0].length / 2), y: 0 }
}

function App() {
  const canvasRef = useRef(null)
  const [board, setBoard] = useState(() => createMatrix(ROWS, COLS))
  const [piece, setPiece] = useState(() => randomPiece())
  const [nextPiece, setNextPiece] = useState(() => randomPiece())
  const [hold, setHold] = useState(null)
  const [canHold, setCanHold] = useState(true)
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)
  const [paused, setPaused] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.scale(1, 1)
    draw()
  })

  useEffect(() => {
    let last = 0
    let dropCounter = 0
    const dropInterval = () => Math.max(1000 - (level - 1) * 100, 100)

    function update(time = 0) {
      if (paused || gameOver) return
      const delta = time - last
      last = time
      dropCounter += delta
      if (dropCounter > dropInterval()) {
        drop()
        dropCounter = 0
      }
      draw()
      requestAnimationFrame(update)
    }

    const id = requestAnimationFrame(update)
    return () => cancelAnimationFrame(id)
  }, [piece, board, paused, gameOver, level])

  useEffect(() => {
    function onKey(e) {
      if (gameOver) return
      if (e.key === 'p' || e.key === 'P') {
        setPaused(p => !p)
        return
      }
      if (paused) return
      if (e.key === 'ArrowLeft') move(-1)
      if (e.key === 'ArrowRight') move(1)
      if (e.key === 'ArrowDown') drop()
      if (e.code === 'Space') hardDrop()
      if (e.key === 'z' || e.key === 'Z') rotatePiece(-1)
      if (e.key === 'x' || e.key === 'X') rotatePiece(1)
      if (e.key === 'Shift') holdPiece()
      if (e.key === 'r' || e.key === 'R') reset()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [piece, board, paused, gameOver, canHold, hold])

  function collides(next = piece, nextBoard = board) {
    const { shape, x: px, y: py } = next
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          const ny = py + y
          const nx = px + x
          if (ny < 0 || ny >= ROWS || nx < 0 || nx >= COLS || nextBoard[ny][nx]) return true
        }
      }
    }
    return false
  }

  function mergePiece() {
    const newBoard = board.map(row => row.slice())
    piece.shape.forEach((row, y) => {
      row.forEach((val, x) => {
        if (val) newBoard[piece.y + y][piece.x + x] = 1
      })
    })
    const [cleared, clearedBoard] = clearLines(newBoard)
    if (cleared > 0) {
      const gained = [0, 100, 300, 500, 800][cleared] || 0
      setScore(s => s + gained * level)
      setLines(l => l + cleared)
      setLevel(lv => 1 + Math.floor((lines + cleared) / 10))
    }
    setBoard(clearedBoard)
    spawnNext()
  }

  function clearLines(b) {
    const rowsToKeep = b.filter(row => row.some(v => v === 0))
    const cleared = ROWS - rowsToKeep.length
    const newBoard = Array.from({ length: cleared }, () => Array(COLS).fill(0)).concat(rowsToKeep)
    return [cleared, newBoard]
  }

  function spawnNext() {
    const incoming = nextPiece
    setPiece({ ...incoming })
    setNextPiece(randomPiece())
    setCanHold(true)
    if (collides({ ...incoming })) {
      setGameOver(true)
      saveScore()
    }
  }

  function move(dir) {
    const next = { ...piece, x: piece.x + dir }
    if (!collides(next)) setPiece(next)
  }

  function drop() {
    const next = { ...piece, y: piece.y + 1 }
    if (!collides(next)) setPiece(next)
    else mergePiece()
  }

  function hardDrop() {
    let next = { ...piece }
    while (!collides({ ...next, y: next.y + 1 })) {
      next.y += 1
    }
    setPiece(next)
    mergePiece()
  }

  function rotatePiece(dir) {
    let rotated = rotate(piece.shape)
    if (dir < 0) rotated = rotate(rotate(rotate(piece.shape)))
    let test = { ...piece, shape: rotated }
    if (!collides(test)) { setPiece(test); return }
    test = { ...piece, shape: rotated, x: piece.x + 1 }
    if (!collides(test)) { setPiece(test); return }
    test = { ...piece, shape: rotated, x: piece.x - 1 }
    if (!collides(test)) { setPiece(test); return }
  }

  function holdPiece() {
    if (!canHold) return
    if (!hold) {
      setHold({ key: piece.key, shape: piece.shape })
      spawnNext()
    } else {
      const temp = hold
      setHold({ key: piece.key, shape: piece.shape })
      const swapped = { key: temp.key, shape: temp.shape, x: Math.floor(COLS / 2) - Math.ceil(temp.shape[0].length / 2), y: 0 }
      if (!collides(swapped)) setPiece(swapped)
      else setPiece({ ...piece })
    }
    setCanHold(false)
  }

  function reset() {
    setBoard(createMatrix(ROWS, COLS))
    setPiece(randomPiece())
    setNextPiece(randomPiece())
    setHold(null)
    setCanHold(true)
    setScore(0)
    setLines(0)
    setLevel(1)
    setPaused(false)
    setGameOver(false)
  }

  async function fetchScores() {
    try {
      const res = await fetch('/api/scores')
      if (!res.ok) return
      const data = await res.json()
      setLeaderboard(data)
    } catch {}
  }

  async function saveScore() {
    try {
      const name = window.prompt('이름을 입력하세요 (최대 20자):', 'PLAYER') || 'PLAYER'
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score })
      })
      fetchScores()
    } catch {}
  }

  useEffect(() => { fetchScores() }, [])

  function drawCell(ctx, x, y, filled) {
    ctx.strokeStyle = '#222'
    ctx.lineWidth = 1
    ctx.fillStyle = filled ? '#4fc3f7' : '#0d0d0d'
    ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK)
    ctx.strokeRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK)
  }

  function draw() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        drawCell(ctx, x, y, board[y][x])
      }
    }
    piece.shape.forEach((row, y) => {
      row.forEach((val, x) => {
        if (val) drawCell(ctx, piece.x + x, piece.y + y, true)
      })
    })
  }

  return (
    <div className="app">
      <h1>Tetris</h1>
      <div className="grid">
        <canvas ref={canvasRef} width={COLS * BLOCK} height={ROWS * BLOCK} />
        <div className="info">
          <div>점수: {score}</div>
          <div>라인: {lines}</div>
          <div>레벨: {level}</div>
          <div>{paused ? '일시정지 (P)' : '진행 중'}</div>
          {gameOver && <div>게임오버 (R로 재시작)</div>}
          <div className="next-hold">
            <div>다음: {nextPiece.key}</div>
            <div>홀드: {hold ? hold.key : '-'}</div>
          </div>
          <div className="board">
            <div style={{ marginTop: 12, fontWeight: 'bold' }}>리더보드</div>
            <ol style={{ paddingLeft: 18, marginTop: 6 }}>
              {leaderboard.map((r, i) => (
                <li key={i}>{r.name} - {r.score}</li>
              ))}
            </ol>
          </div>
          <div className="help">
            ←/→ 이동, ↓ 드롭, Space 하드드롭, Z/X 회전, Shift 홀드, P 일시정지, R 재시작
          </div>
        </div>
      </div>
    </div>
  )
}

export default App


