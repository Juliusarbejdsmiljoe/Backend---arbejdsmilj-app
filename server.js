// server.js
// Backend - arbejdsmiljø app
// Kører med ESM ("type":"module") og Node 20+.

import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import morgan from 'morgan'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

// Middleware + routes
import { requireAppToken } from './middleware/appToken.js'
import healthRouter from './routes/health.js'
import apvRouter from './routes/apv.js'
import authRouter from './routes/auth.js'
import uploadRouter from './routes/upload.js'

// --- Paths / uploads-dir -----------------------------------------------------
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadsDir = path.join(__dirname, 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

// --- App ---------------------------------------------------------------------
const app = express()
app.set('trust proxy', 1) // Render / proxies

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Statiske filer (PDF'er m.m.)
app.use('/uploads', express.static(uploadsDir, { maxAge: '1h', etag: true }))

// --- DB (MongoDB Atlas via Mongoose) ----------------------------------------
const MONGODB_URI = process.env.MONGODB_URI

mongoose.connection.on('connected', () => {
  console.log('🟢 MongoDB connected:', mongoose.connection.host)
})
mongoose.connection.on('error', (err) => {
  console.error('🔴 MongoDB error:', err.message)
})
mongoose.connection.on('disconnected', () => {
  console.warn('🟡 MongoDB disconnected')
})

// Gør DB-state let tilgængelig for fx /api/health
app.locals.dbState = () => mongoose.connection.readyState // 0..3

async function connectDB() {
  if (!MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI mangler – starter uden database.')
    return
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 8000, // hurtigere fejlmeldinger
    })
  } catch (err) {
    console.error('❌ MongoDB connect-fejl:', err.message)
    // Vi lader stadig serveren starte, så /api/health kan rammes
  }
}

// --- Routes ------------------------------------------------------------------
// Kræv X-App-Token på ALLE API-ruter
app.use('/api', requireAppToken)

// Sundhed
app.use('/api/health', healthRouter)

// APV (start/stop → genererer PDF i /uploads)
app.use('/api/apv', apvRouter)

// Auth (login/register/me) – forventer Authorization: Bearer <JWT> inde i routeren
app.use('/api/auth', authRouter)

// Uploads (multipart/form-data) – fx POST /api/upload/apv  med felt "file"
app.use('/api/upload', uploadRouter)

// 404 for ukendte API-ruter
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Global error handler (så vi altid svarer med JSON)
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err)
  res.status(err.status || 500).json({ error: err.message || 'Server error' })
})

// --- Start -------------------------------------------------------------------
const PORT = process.env.PORT || 10000

;(async () => {
  await connectDB()

  app.listen(PORT, () => {
    const map = { 0: 'OFF', 1: 'ON', 2: 'CONNECTING', 3: 'DISCONNECTING' }
    console.log(`🚀 Server lytter på :${PORT}  (DB: ${map[app.locals.dbState()]})`)
    if (process.env.PUBLIC_BASE_URL) {
      console.log('🌍 PUBLIC_BASE_URL =', process.env.PUBLIC_BASE_URL)
    }
  })
})()
