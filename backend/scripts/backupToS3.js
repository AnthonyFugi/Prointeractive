import 'dotenv/config';
import mongoose from 'mongoose';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from '../config/s3.js';

export const runBackup = async () => {
  const wasConnected = mongoose.connection.readyState === 1;
  if (!wasConnected) await mongoose.connect(process.env.MONGO_URI);

  const stamp = new Date().toISOString().slice(0, 10);
  const collections = await mongoose.connection.db.listCollections().toArray();
  let total = 0;

  for (const { name } of collections) {
    const docs = await mongoose.connection.db.collection(name).find({}).toArray();
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: `backups/${stamp}/${name}.json`,
      Body: JSON.stringify(docs),
      ContentType: 'application/json',
    }));
    total += docs.length;
    console.log(`[backup] ${name}: ${docs.length} docs`);
  }
  console.log(`[backup] done — ${collections.length} collections, ${total} docs -> s3://backups/${stamp}/`);
  if (!wasConnected) await mongoose.disconnect();
};

// Run directly: npm run backup
if (process.argv[1] && process.argv[1].endsWith('backupToS3.js')) {
  runBackup().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
