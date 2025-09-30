// models/Report.js
import mongoose from 'mongoose'

const ReportSchema = new mongoose.Schema(
  {
    type:   { type: String, required: true },   // "gennemgang", "kemi", "amo", "hp_apv", "apv" ...
    title:  { type: String, required: true },
    date:   { type: Date,   required: true },
    pdfUrl: { type: String, required: true },   // absolut URL til den uploadede PDF
    userId: { type: String },                   // valgfrit: hvis du vil binde til bruger
  },
  { timestamps: true }
)

export default mongoose.model('Report', ReportSchema)
