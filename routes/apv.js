// routes/apv.js
import { Router } from 'express'
import PDFDocument from 'pdfkit'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import { optionalAuth, attachUser } from '../middleware/auth.js'

const router = Router()

// uploads-dir
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, '..', 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

// Minimal in-memory sessions
const sessions = new Map()

function makeId() {
  return crypto.randomBytes(8).toString('hex')
}

// POST /api/apv/start  { title, questions[] }
router.post('/start', optionalAuth, attachUser, (req, res) => {
  const { title, questions } = req.body || {}
  if (!title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'title and questions[] are required' })
  }
  const sessionId = makeId()
  sessions.set(sessionId, {
    title,
    questions: questions.map(q => String(q)),
    userCode: req.user?.code || null,
    startedAt: Date.now()
  })

  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`
  const publicUrl = `${base}/apv/${sessionId}` // (valgfri – simpel side nederst)
  res.json({ sessionId, publicUrl })
})

// POST /api/apv/stop { sessionId }
router.post('/stop', optionalAuth, attachUser, (req, res) => {
  const { sessionId } = req.body || {}
  const s = sessionId && sessions.get(sessionId)
  if (!s) return res.status(404).json({ error: 'Session not found' })

  // Generér PDF
  const codePart = s.userCode ? `${s.userCode}-` : ''
  const fileName = `apv-${codePart}${sessionId}.pdf`
  const filePath = path.join(uploadsDir, fileName)

  const doc = new PDFDocument({ size: 'A4', margin: 48 })
  doc.pipe(fs.createWriteStream(filePath))

  doc.fontSize(20).text(s.title || 'APV', { underline: true })
  doc.moveDown()

  doc.fontSize(12).text(`Genereret: ${new Date().toLocaleString()}`)
  if (s.userCode) doc.text(`Bruger-kode: ${s.userCode}`)
  doc.moveDown()

  doc.fontSize(14).text('Spørgsmål:', { bold: true })
  doc.moveDown(0.5)
  s.questions.forEach((q, i) => {
    doc.fontSize(12).text(`${i + 1}. ${q}`)
  })

  doc.end()

  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`
  const pdfUrl = `${base}/uploads/${encodeURIComponent(fileName)}`
  // ryd sessionen (valgfrit)
  sessions.delete(sessionId)
  res.json({ pdfUrl })
})

// Simpel “public” side (valgfrit)
router.get('/:sessionId', (req, res) => {
  const s = sessions.get(req.params.sessionId)
  if (!s) return res.status(404).send('Session not found')
  res.type('html').send(`<!doctype html>
  <meta charset="utf-8"/>
  <title>APV – ${s.title}</title>
  <body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 24px;">
    <h1>APV: ${s.title}</h1>
    <p>Session kører. Antal spørgsmål: ${s.questions.length}.</p>
    <p>Luk sessionen i appen for at generere PDF.</p>
  </body>`)
})

export default router
