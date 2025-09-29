// server.js
// Backend - arbejdsmiljø app
// ESM ("type":"module"), Node >=20

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

// --- Build tag (så vi kan se i logs/svar at den NYE kode kører) ------------
const BUILD_TAG =
  process.env.RENDER_GIT_COMMIT?.slice(0, 7) ||
  new Date().toISOString().replace(/[:.]/g, '-')

// --- Paths / uploads-dir -----------------------------------------------------
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsDir = path.join(__dirname, 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

// --- App ---------------------------------------------------------------------
const app = express()
app.set('trust proxy', 1)
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Statiske filer
app.use('/uploads', express.static(uploadsDir, { maxAge: '1h', etag: true }))

// --- DB (MongoDB Atlas via Mongoose) ----------------------------------------
mongoose.connection.on('connected', () => {
  console.log('🟢 MongoDB connected:', mongoose.connection.host, 'db:', mongoose.connection.name)
})
mongoose.connection.on('error', (err) => {
  console.error('🔴 MongoDB error:', err?.message || err)
})
mongoose.connection.on('disconnected', () => {
  console.warn('🟡 MongoDB disconnected')
})
app.locals.dbState = () => mongoose.connection.readyState // 0..3

async function connectDB() {
  let uri = (process.env.MONGODB_URI || '').trim()
  if (uri.startsWith('MONGODB_URI=')) uri = uri.slice('MONGODB_URI='.length).trim()
  if (!uri) {
    console.warn('⚠️  MONGODB_URI mangler – starter uden database.')
    return
  }
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    console.error('❌ MONGODB_URI har forkert format (skal starte med "mongodb://" eller "mongodb+srv://").')
    return
  }
  try {
    await mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB || 'arbejdsmiljoe',
      serverSelectionTimeoutMS: 8000,
    })
  } catch (err) {
    console.error('❌ MongoDB connect-fejl:', err?.message || err)
  }
}

// --- Routes ------------------------------------------------------------------

// 🔓 Sundhed er OFFENTLIG (både /health og /api/health for kompatibilitet)
app.use('/health', healthRouter)
app.use('/api/health', healthRouter)

// 🔒 Kræv X-App-Token på ALLE andre API-ruter
app.use('/api', requireAppToken)

// APV / Auth / Upload
app.use('/api/apv', apvRouter)
app.use('/api/auth', authRouter)
app.use('/api/upload', uploadRouter)

// 404 for ukendte API-ruter
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Global error handler
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
    console.log(`🚀 Server lytter på :${PORT} (DB: ${map[app.locals.dbState()]})`)
    const publicBase =
      process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`
    console.log('🌍 PUBLIC_BASE_URL =', publicBase)
    console.log('🧩 BUILD_TAG =', BUILD_TAG)
  })
})()

export { BUILD_TAG }
