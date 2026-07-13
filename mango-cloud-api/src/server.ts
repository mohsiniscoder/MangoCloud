import { FileModel } from './models/File';
import crypto from 'crypto';
import express from 'express';
import mongoose from 'mongoose';
import * as Minio from 'minio';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// ----------------------------------------
// 1. Establish MongoDB Ledger Connection
// ----------------------------------------
mongoose.connect(process.env.MONGO_URI as string)
  .then(() => console.log('✅ MongoDB Ledger Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// ----------------------------------------
// 2A. The Internal Inspector (Real Docker Network Traffic)
// ----------------------------------------
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT as string, // 'private-cloud-storage'
  port: parseInt(process.env.MINIO_PORT as string, 10),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY as string,
  secretKey: process.env.MINIO_SECRET_KEY as string
});

minioClient.listBuckets()
  .then(buckets => console.log('✅ MinIO Engine Connected. Active Buckets:', buckets.map(b => b.name)))
  .catch(err => console.error('❌ MinIO Connection Error:', err));

// ----------------------------------------
// 2B. The Public Ticket Agent (Offline Crypto Math Only)
// ----------------------------------------
const minioPublicClient = new Minio.Client({
  endPoint: process.env.MINIO_PUBLIC_ENDPOINT as string, // 'localhost' or '192.168.1.XX'
  port: parseInt(process.env.MINIO_PORT as string, 10),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY as string,
  secretKey: process.env.MINIO_SECRET_KEY as string
});
// ----------------------------------------
// 3. Health Check Endpoint
// ----------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'Mango Cloud API is online and communicating with Docker infrastructure.' });
});

// ----------------------------------------
// 4. Core Upload Mechanism (Pre-signed URL)
// ----------------------------------------
app.post('/api/upload/init', async (req, res) => {
  try {
    const { fileName, fileSize, fileType } = req.body;

    // 1. Generate a collision-proof storage name to prevent overwriting
    const fileExtension = fileName.split('.').pop();
    const storageName = `${crypto.randomUUID()}.${fileExtension}`;

    // 2. Create a 'PENDING' entry in the MongoDB Ledger
    const newFile = await FileModel.create({
      originalName: fileName,
      storageName: storageName,
      sizeBytes: fileSize,
      mimeType: fileType
    });

    // 3. Ask MinIO for the VIP Pass (Pre-signed PUT URL) valid for 60 seconds
    const bucketName = 'hello-bucket'; 
    const presignedUrl = await minioPublicClient.presignedPutObject(
      bucketName, 
      storageName, 
      60 
    );

    // 4. Hand the URL back to the client
    res.json({
      message: 'Upload authorized',
      fileId: newFile._id,
      uploadUrl: presignedUrl
    });

  } catch (error) {
    console.error('Upload Init Error:', error);
    res.status(500).json({ error: 'Failed to initialize upload' });
  }
});
// ----------------------------------------
// 5. Upload Confirmation (Two-Phase Commit)
// ----------------------------------------
app.post('/api/upload/confirm', async (req, res) => {
  try {
    const { fileId } = req.body;
    
    // Find the pending file in the ledger
    const file = await FileModel.findById(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File ledger entry not found' });
    }

    // Optional but recommended: Ask the Internal Inspector if the file actually exists in MinIO
    // await minioClient.statObject('hello-bucket', file.storageName);

    // Update status to ACTIVE
    // CORRECT
    file.uploadStatus = 'COMPLETED';
    await file.save();

    res.json({ message: 'File successfully committed to cloud ledger', file });
  } catch (error) {
    console.error('Confirmation Error:', error);
    res.status(500).json({ error: 'Failed to confirm upload' });
  }
});

// ----------------------------------------
// 6. Fetch File Ledger (The Dashboard Data)
// ----------------------------------------
app.get('/api/files', async (req, res) => {
  try {
    // Only return files that successfully finished uploading, newest first
    const files = await FileModel.find({ status: 'ACTIVE' }).sort({ createdAt: -1 });
    res.json(files);
  } catch (error) {
    console.error('Fetch Files Error:', error);
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
});

// ----------------------------------------
// 7. Generate Download Ticket (Pre-signed GET)
// ----------------------------------------
app.get('/api/files/:id/download', async (req, res) => {
  try {
    const file = await FileModel.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Ask the Public Ticket Agent for a 5-minute download link
    const downloadUrl = await minioPublicClient.presignedGetObject(
      'hello-bucket',
      file.storageName,
      5 * 60 // 5 minutes in seconds
    );

    res.json({ downloadUrl });
  } catch (error) {
    console.error('Download Ticket Error:', error);
    res.status(500).json({ error: 'Failed to generate download ticket' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Gatekeeper API listening on http://localhost:${PORT}`);
});