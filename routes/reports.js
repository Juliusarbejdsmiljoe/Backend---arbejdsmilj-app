// routes/reports.js
import { Router } from 'express'
import Report from '../models/Report.js'

const router = Router()

// GET /api/reports  → liste (evt. filtrér pr. bruger senere)
router.get('/', async (req, res, next) => {
  try {
    const items = await Report.find().sort({ date: -1, createdAt: -1 }).lean()
    res.json(items)
  } catch (e) { next(e) }
})

// POST /api/reports  → opret metadata
router.post('/', async (req, res, next) => {
  try {
    const { type, title, date, pdfUrl } = req.body
    if (!type || !title || !date || !pdfUrl) {
      return res.status(400).json({ error: 'Missing fields: type,title,date,pdfUrl' })
    }
    const doc = await Report.create({
      type,
      title,
      date: new Date(date),
      pdfUrl,
      // userId: req.user?.id // hvis du har auth middleware, kan du sætte den her
    })
    // Klienten forventer bare et id tilbage (men 201 + hele objektet er også fint)
    res.status(201).json({ id: String(doc._id) })
  } catch (e) { next(e) }
})

// (valgfrit) DELETE /api/reports/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    await Report.findByIdAndDelete(id)
    res.json({ ok: true })
  } catch (e) { next(e) }
})

export default router
