import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { v4 as uuid } from 'uuid'


const r = Router()


const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }) }


const storage = multer.diskStorage({
destination: (req, file, cb) => {
const dir = path.join(process.cwd(), 'uploads')
ensureDir(dir)
cb(null, dir)
},
filename: (_req, file, cb) => {
const id = uuid().replace(/-/g, '')
cb(null, `${id}${path.extname(file.originalname) || '.pdf'}`)
}
})


const upload = multer({
storage,
fileFilter: (_req, file, cb) => {
if ((file.mimetype || '').includes('pdf')) cb(null, true)
else cb(new Error('Kun PDF tilladt'))
}
})


r.post('/:type', upload.single('file'), (req, res) => {
const { type } = req.params
if (!req.file) return res.status(400).json({ error: 'Ingen fil' })
const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`
const downloadUrl = `${base}/uploads/${req.file.filename}`
return res.json({
message: 'Uploaded',
id: req.file.filename.split('.')[0],
name: req.file.originalname,
downloadUrl,
type
})
})


export default r