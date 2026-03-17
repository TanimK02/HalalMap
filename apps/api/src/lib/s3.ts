import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

const PRESIGN_EXPIRY_SECONDS = 10 * 60; // 10 minutes

function sanitizeFilename(filename: string): string {
  // Remove path segments and keep only base name; limit length
  const base = filename.replace(/^.*[/\\]/, '').slice(0, 128);
  // Allow only alphanumeric, dash, underscore, dot
  return base.replace(/[^a-zA-Z0-9._-]/g, '_') || 'image';
}

export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION &&
    process.env.AWS_S3_BUCKET
  );
}

export interface PresignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
}

export async function getPresignedUploadUrl(
  keyPrefix: string,
  filename: string,
  contentType: string
): Promise<PresignedUploadResult> {
  // Normalize: strip params (e.g. "image/jpeg; charset=utf-8") and accept "image/jpg" as alias for "image/jpeg"
  const normalized = contentType.split(';')[0].trim().toLowerCase();
  const accepted = normalized === 'image/jpg' ? 'image/jpeg' : normalized;
  if (!ALLOWED_CONTENT_TYPES.includes(accepted as (typeof ALLOWED_CONTENT_TYPES)[number])) {
    throw new Error(`Invalid content type: ${contentType}. Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}`);
  }

  const bucket = process.env.AWS_S3_BUCKET!;
  const region = process.env.AWS_REGION!;
  const sanitized = sanitizeFilename(filename);
  const ext = sanitized.includes('.') ? sanitized.slice(sanitized.lastIndexOf('.')) : '';
  const key = `${keyPrefix}/${randomUUID()}${ext || (accepted === 'image/jpeg' ? '.jpg' : accepted === 'image/png' ? '.png' : accepted === 'image/webp' ? '.webp' : '.gif')}`;

  const endpoint = process.env.S3_ENDPOINT;
  const client = new S3Client({
    region,
    ...(endpoint && { endpoint, forcePathStyle: true }),
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: accepted,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: PRESIGN_EXPIRY_SECONDS });

  const publicUrlBase = process.env.S3_PUBLIC_URL_BASE;
  const publicUrl = publicUrlBase
    ? `${publicUrlBase.replace(/\/$/, '')}/${key}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return { uploadUrl, publicUrl };
}
