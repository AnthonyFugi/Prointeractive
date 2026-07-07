import { S3Client } from '@aws-sdk/client-s3';

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  // Credentials come from env: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
  // (or an IAM role when deployed on AWS)
});

export const BUCKET = process.env.S3_BUCKET;
