import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import PDFDocument from 'pdfkit'
import { v4 as uuid } from 'uuid'
import APVSession from '../models/APVSession.js'


const r = Router()


function publicBase(req) {
return process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`
}


r.post('/start', async (req, res) => {
const { title = 'APV', questions = [] } = req.body || {}
const sessionId = uuid().replace(/-/g, '')
const publicUrl = `${publicBase(req)}/apv/s/${sessionId}`
await APVSession.create({ sessionId, title, questions, publicUrl })
return res.json({ sessionId, publicUrl })
})


r.post('/stop', async (req, res) => {
const { sessionId } = req.body || {}
if (!sessionId) return res.status(400).json({ error: 'sessionId mangler' })
const sess = await APVSession.findOne({ sessionId })
if (!sess) return res.status(404).json({ error: 'Session ikke fundet' })


// Generér simpel PDF (titel + liste over spørgsmål) – demo
const uploads = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploads)) fs.mkdirSync(uploads, { recursive: true })
const fileName = `apv-${sessionId}.pdf`
const outPath = path.join(uploads, fileName)
await new Promise((resolve, reject) => {
const doc = new PDFDocument({ size: 'A4', margin: 36 })
const stream = fs.createWriteStream(outPath)
doc.pipe(stream)
doc.fontSize(22).text(sess.title || 'APV', { underline: false })
doc.moveDown()
doc.fontSize(12).text(`Session: ${sessionId}`)
doc.moveDown().fontSize(14).text('Spørgsmål:')
doc.moveDown(0.5)
;(sess.questions || []).slice(0, 200).forEach((q, i) => {
doc.fontSize(12).text(`• ${q}`)
})
doc.end()
stream.on('finish', resolve)
stream.on('error', reject)
})


sess.pdfPath = `/uploads/${fileName}`
await sess.save()


return res.json({ pdfUrl: `${publicBase(req)}${sess.pdfPath}` })
})


// (valgfri) meget enkel offentlig side – ikke påkrævet af iOS klienten
r.get('/s/:sessionId', async (req, res) => {
const s = await APVSession.findOne({ sessionId: req.params.sessionId })
if (!s) return res.status(404).send('Session ikke fundet')
res.send(`<h1>${s.title}</h1><p>APV session: ${s.sessionId}</p>`)
})


export default r