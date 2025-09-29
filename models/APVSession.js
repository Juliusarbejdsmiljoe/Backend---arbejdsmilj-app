import mongoose from 'mongoose'


const APVSessionSchema = new mongoose.Schema({
sessionId: { type: String, required: true, unique: true },
title: { type: String, default: 'APV' },
questions: { type: [String], default: [] },
pdfPath: { type: String },
publicUrl: { type: String }
}, { timestamps: true })


export default mongoose.models.APVSession || mongoose.model('APVSession', APVSessionSchema)