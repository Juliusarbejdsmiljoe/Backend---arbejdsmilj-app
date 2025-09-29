// models/User.js
import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true },
  code: { type: String, required: true, index: true }, // unik “bruger-kode”
}, { timestamps: true })

export default mongoose.model('User', UserSchema)
