import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the root uploads directory relative to this file (utils/ -> ../uploads/)
// We use path.resolve for reliability across different environments
const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

let s3Client;

const getS3Client = () => {
  if (s3Client) return s3Client;

  const isPlaceholder = (val) => !val || val.includes('your_') || val.includes('<your') || val === '';

  const hasValidConfig = !(
    isPlaceholder(process.env.AWS_REGION) ||
    isPlaceholder(process.env.AWS_ACCESS_KEY_ID) ||
    isPlaceholder(process.env.AWS_SECRET_ACCESS_KEY) ||
    isPlaceholder(process.env.AWS_S3_BUCKET_NAME)
  );

  if (!hasValidConfig) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn("⚠️ AWS S3 environment variables are not fully configured. Using local storage as primary.");
    }
    return null;
  }

  try {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    return s3Client;
  } catch (err) {
    console.error("❌ Failed to initialize S3 Client:", err.message);
    return null;
  }
};

/**
 * Save a buffer to local disk as a fallback.
 * Files are served from /uploads/<subFolder>/<fileName>
 */
const saveFileLocally = (buffer, subFolder = '', originalName = 'file.jpg') => {
  try {
    const extension = originalName.split('.').pop() || 'jpg';
    const fileName = `${uuidv4()}-${originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9.-]/g, '_')}.${extension}`;
    
    // Ensure the directory exists
    const dir = subFolder ? path.join(UPLOADS_DIR, subFolder) : UPLOADS_DIR;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, buffer);
    
    // Return a URL path that will be served by Express static middleware
    const urlPath = subFolder ? `/uploads/${subFolder}/${fileName}` : `/uploads/${fileName}`;
    console.log(`[Storage] Local file saved: ${urlPath}`);
    return urlPath;
  } catch (error) {
    console.error(`[Storage] Error in saveFileLocally:`, error.message);
    throw error;
  }
};

/**
 * Save a buffer — tries AWS S3 first, falls back to local disk on failure.
 */
export const saveFile = async (buffer, subFolder = '', originalName = 'file.jpg') => {
  // ---- Try S3 ----
  const client = getS3Client();
  if (client) {
    try {
      console.log(`[Storage] Attempting AWS S3 upload...`);

      const extension = originalName.split('.').pop() || 'jpg';
      const fileName = `${uuidv4()}-${originalName.replace(/\.[^/.]+$/, "")}.${extension}`;
      const key = subFolder ? `${subFolder}/${fileName}` : fileName;

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: getContentType(extension),
      });

      await client.send(command);

      const publicUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
      console.log(`[Storage] AWS S3 upload successful: ${publicUrl}`);
      return publicUrl;
    } catch (s3Error) {
      console.error(`[Storage] AWS S3 upload failed (${s3Error.name}: ${s3Error.message}). Falling back to local storage.`);
    }
  } else {
    console.warn(`[Storage] S3 client not configured. Using local storage.`);
  }

  // ---- Fallback: local disk ----
  try {
    return saveFileLocally(buffer, subFolder, originalName);
  } catch (localError) {
    console.error(`[Storage] Local file save also failed:`, localError.message);
    throw new Error(`Failed to save file: ${localError.message}`);
  }
};

/**
 * Delete a file from AWS S3 or local disk, depending on the URL.
 */
export const deleteFile = async (fileUrl) => {
  try {
    if (!fileUrl || typeof fileUrl !== 'string') return;

    // Local file (path starting with /uploads/)
    if (fileUrl.startsWith('/uploads/')) {
      // Remove leading slash if present for path.join
      const relativePath = fileUrl.startsWith('/') ? fileUrl.substring(1) : fileUrl;
      // We need to resolve from the project root. Since UPLOADS_DIR is root/uploads,
      // and relativePath is uploads/sub/file, we go up one level from uploads.
      const localPath = path.join(UPLOADS_DIR, '..', relativePath);
      
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        console.log(`[Storage] Deleted local file: ${localPath}`);
      } else {
        console.warn(`[Storage] Local file not found for deletion: ${localPath}`);
      }
      return;
    }

    // S3 file
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const region = process.env.AWS_REGION;
    const s3Domain = `https://${bucket}.s3.${region}.amazonaws.com/`;
    
    if (fileUrl.startsWith(s3Domain)) {
      const key = fileUrl.replace(s3Domain, '');
      const client = getS3Client();
      if (!client) {
        console.warn(`[Storage] Cannot delete S3 file: S3 client not configured.`);
        return;
      }
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      await client.send(command);
      console.log(`[Storage] Deleted file from AWS S3: ${key}`);
    }
  } catch (error) {
    console.error("[Storage] Error deleting file:", error.message);
  }
};

const getContentType = (extension) => {
  const types = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'tiff': 'image/tiff',
    'bmp': 'image/bmp',

    // Videos
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    'flv': 'video/x-flv',
    'wmv': 'video/x-ms-wmv',

    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac',
    'flac': 'audio/x-flac',

    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'html': 'text/html',
    'xml': 'text/xml',
    'json': 'application/json',

    // Archives
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip'
  };
  return types[extension.toLowerCase()] || 'application/octet-stream';
};
