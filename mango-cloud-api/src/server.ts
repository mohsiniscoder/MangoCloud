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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Gatekeeper API listening on http://localhost:${PORT}`);
});