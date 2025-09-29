// server.js
import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import morgan from 'morgan'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Middleware & routes
import { requireAppToken } from './middleware/appToken.js'
import healthRouter from './routes/health.js'
import authRouter from './routes/auth.js'
import uploadRouter from './routes/upload.js'
import apvRouter from './routes/apv.js'

// ---- App setup --------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.disable('x-powered-by')
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Statisk serve af uploads (Render har ephemeral disk, men ok til test)
const uploadsDir = path.join(__dirname, 'uploads')
app.use('/uploads', express.static(uploadsDir, { fallthrough: true }))

// Kræv app token på alle /api/* (før routes)
app.use('/api', requireAppToken)

// Routes
app.use('/api/health', healthRouter)
app.use('/api/auth', authRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/apv', apvRouter)

// 404 for ukendte /api-stier
app.use('/api/*', (req, res) => res.status(404).json({ error: 'Not found' }))

// Fælles fejl-håndtering (JSON)
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err)
  res.status(err.status || 500).json({ error: err.message || 'Server error' })
})

// ---- Start ------------------------------------------------------------------

const PORT = process.env.PORT || 10000
const MONGODB_URI = process.env.MONGODB_URI

async function start() {
  let dbOk = false
  if (MONGODB_URI) {
    try {
      // gør connect robust så processen ikke dør på Render
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
      dbOk = true
      console.log('✅ MongoDB forbundet')
    } catch (e) {
      console.error('⚠️  MongoDB forbindelsesfejl:', e.message)
      console.error('   Fortsætter uden database (API kører stadig).')
    }
  } else {
    console.warn('⚠️  MONGODB_URI mangler – kører uden database.')
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server lytter på :${PORT}  (DB: ${dbOk ? 'OK' : 'OFF'})`)
  })
}

// Pæne logs for uventede fejl
process.on('unhandledRejection', (e) => {
  console.error('unhandledRejection:', e)
})
process.on('uncaughtException', (e) => {
  console.error('uncaughtException:', e)
})

start()
