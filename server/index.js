import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000
const DATA_DIR = path.join(__dirname)
const SCORE_FILE = path.join(DATA_DIR, 'scores.json')

app.use(express.json())

function readScores() {
  try {
    const raw = fs.readFileSync(SCORE_FILE, 'utf-8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch (e) {
    return []
  }
}

function writeScores(scores) {
  fs.writeFileSync(SCORE_FILE, JSON.stringify(scores, null, 2), 'utf-8')
}

app.get('/api/scores', (req, res) => {
  const scores = readScores()
  const top = scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
  res.json(top)
})

app.post('/api/scores', (req, res) => {
  const { name, score } = req.body || {}
  if (typeof name !== 'string' || name.trim() === '' || typeof score !== 'number') {
    return res.status(400).json({ message: 'Invalid payload' })
  }
  const item = { name: name.trim().slice(0, 20), score: Math.max(0, Math.floor(score)), at: Date.now() }
  const scores = readScores()
  scores.push(item)
  writeScores(scores)
  res.status(201).json({ ok: true })
})

app.listen(PORT, () => {
  if (!fs.existsSync(SCORE_FILE)) writeScores([])
  console.log(`[server] listening on http://localhost:${PORT}`)
})


