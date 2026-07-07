import crypto from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3, BUCKET } from '../config/s3.js';

const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/uploads/presign
 * Body: { contentType, fileSize }
 * Returns a short-lived presigned PUT URL. The client uploads the file
 * directly to S3, then stores publicUrl on the product. The server never
 * proxies image bytes.
 */
export const presignUpload = async (req, res, next) => {
  try {
    if (!BUCKET || !process.env.AWS_REGION) {
      return res.status(503).json({
        success: false,
        message: 'Image uploads are not configured. Set AWS_REGION and S3_BUCKET.',
      });
    }
    const { contentType, fileSize } = req.body;
    const ext = ALLOWED_TYPES[contentType];
    if (!ext) {
      return res.status(400).json({ success: false, message: 'Only JPEG, PNG, or WebP images are allowed' });
    }
    if (!fileSize || fileSize > MAX_SIZE) {
      return res.status(400).json({ success: false, message: 'Image must be 5 MB or smaller' });
    }

    const key = `products/${req.user._id}/${crypto.randomUUID()}.${ext}`;
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      ContentLength: fileSize,
    });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    const publicUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    res.json({ success: true, uploadUrl, publicUrl });
  } catch (err) {
    next(err);
  }
};
