import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  storageName: { type: String, required: true, unique: true }, // The unique name inside MinIO
  sizeBytes: { type: Number, required: true },
  mimeType: { type: String, required: true },
  uploadStatus: { type: String, enum: ['PENDING', 'COMPLETED'], default: 'PENDING' },
  createdAt: { type: Date, default: Date.now }
});

export const FileModel = mongoose.model('File', fileSchema);