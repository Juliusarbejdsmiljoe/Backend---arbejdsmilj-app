// routes/upload.js
import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import User from '../models/User.js'
import { optionalAuth, attachUser } from '../middleware/auth.js'

const router = Router()

// Find uploads-mappe relativt til projektroden
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, '..', 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: async (req, file, cb) => {
    const ext = path.extname(file.originalname || '.pdf') || '.pdf'
    const base = path.basename(file.originalname || 'fil.pdf', ext).replace(/[^\w.-]+/g, '_')
    let prefix = 'file'
    if (req.user) {
      // Inkludér bruger-kode i filnavn hvis brugeren er logget ind
      prefix = req.user.code
    }
    const fname = `${prefix}-${Date.now()}-${base}${ext}`
    cb(null, fname)
  }
})
const upload = multer({ storage })

router.post('/:type', optionalAuth, attachUser, upload.single('file'), async (req, res) => {
  // type bruges kun til evt. kategorisering i fremtiden
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name should be "file")' })

  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`
  const downloadUrl = `${base}/uploads/${encodeURIComponent(req.file.filename)}`

  const id = path.parse(req.file.filename).name
  res.json({
    message: 'Uploaded',
    id,
    name: req.file.filename,
    downloadUrl
  })
})

export default router
