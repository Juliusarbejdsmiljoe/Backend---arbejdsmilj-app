// routes/apv.js
import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import PDFDocument from 'pdfkit'

const router = Router()
const uploadsDir = path.join(process.cwd(), 'uploads')

function baseUrlFrom(req) {
  return process.env.PUBLIC_BASE_URL ||
         `${req.protocol}://${req.get('host')}`
}

// simpel in-memory session store
const sessions = new Map()

router.post('/start', (req, res) => {
  const { title, questions } = req.body || {}
  if (!title || !Array.isArray(questions)) {
    return res.status(400).json({ error: 'title og questions kræves' })
  }
  const sessionId = crypto.randomBytes(8).toString('hex')
  sessions.set(sessionId, { title, questions, startedAt: Date.now() })

  // et link du kan vise i app’en (kan være en landingsside senere)
  const publicUrl = `${baseUrlFrom(req)}/apv/${sessionId}`
  res.json({ sessionId, publicUrl })
})

router.post('/stop', async (req, res) => {
  const { sessionId } = req.body || {}
  const s = sessionId && sessions.get(sessionId)
  if (!s) return res.status(404).json({ error: 'Ukendt sessionId' })

  // sørg for uploads/
  await fs.promises.mkdir(uploadsDir, { recursive: true })

  // generér en simpel PDF med spørgsmålene
  const fileName = `apv-${sessionId}.pdf`
  const outPath = path.join(uploadsDir, fileName)

  await new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 36 })
      const stream = fs.createWriteStream(outPath)
      doc.pipe(stream)

      doc.fontSize(22).text(s.title || 'APV', { underline: false })
      doc.moveDown(0.5)
      doc.fontSize(12).fillColor('#444')
        .text(`Dato: ${new Date().toLocaleString()}`)
      doc.moveDown()

      doc.fillColor('black').fontSize(14).text('Spørgsmål:', { underline: true })
      doc.moveDown(0.3)
      doc.fontSize(12)
      s.questions.forEach((q, i) => {
        doc.text(`${i + 1}. ${q}`)
      })

      doc.end()
      stream.on('finish', resolve)
      stream.on('error', reject)
    } catch (e) {
      reject(e)
    }
  })

  // giv app’en en URL den kan downloade fra
  const pdfUrl = `${baseUrlFrom(req)}/uploads/${fileName}`

  // ryd op i memory-sessionen
  sessions.delete(sessionId)

  res.json({ pdfUrl })
})

export default router
