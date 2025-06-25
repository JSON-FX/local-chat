import path from 'path';
import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import crypto from 'crypto';

export interface FileUploadResult {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimeType: string;
}

export interface FileValidationOptions {
  maxSize: number; // bytes
  allowedTypes: string[];
  allowedExtensions: string[];
}

export class FileService {
  private static readonly UPLOAD_DIR = path.join(process.cwd(), 'uploads');
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
  ];
  private static readonly ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  // Initialize upload directory
  static async initializeStorage(): Promise<void> {
    try {
      if (!existsSync(this.UPLOAD_DIR)) {
        await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
        console.log('Upload directory created:', this.UPLOAD_DIR);
      }
    } catch (error) {
      console.error('Error initializing file storage:', error);
      throw error;
    }
  }

  // Generate unique filename
  static generateUniqueFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const hash = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return `${timestamp}_${hash}${ext}`;
  }

  // Validate file before upload
  static validateFile(
    file: { size: number; type: string; name: string }, 
    options?: Partial<FileValidationOptions>
  ): { valid: boolean; error?: string } {
    const defaultOptions: FileValidationOptions = {
      maxSize: this.MAX_FILE_SIZE,
      allowedTypes: this.ALLOWED_IMAGE_TYPES,
      allowedExtensions: this.ALLOWED_IMAGE_EXTENSIONS
    };
    
    const config = { ...defaultOptions, ...options };
    
    // Check file size
    if (file.size > config.maxSize) {
      return {
        valid: false,
        error: `File size too large. Maximum allowed: ${this.formatFileSize(config.maxSize)}`
      };
    }

    // Check file type
    if (!config.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${config.allowedTypes.join(', ')}`
      };
    }

    // Check file extension
    const ext = path.extname(file.name).toLowerCase();
    if (!config.allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `File extension not allowed. Allowed extensions: ${config.allowedExtensions.join(', ')}`
      };
    }

    return { valid: true };
  }

  // Save uploaded file
  static async saveFile(fileData: Buffer, originalName: string, mimeType: string): Promise<FileUploadResult> {
    try {
      await this.initializeStorage();
      
      const filename = this.generateUniqueFilename(originalName);
      const filePath = path.join(this.UPLOAD_DIR, filename);
      
      await fs.writeFile(filePath, fileData);
      
      return {
        filename,
        originalName,
        path: filePath,
        size: fileData.length,
        mimeType
      };
    } catch (error) {
      console.error('Error saving file:', error);
      throw new Error('Failed to save uploaded file');
    }
  }

  // Get file for download
  static async getFile(filename: string): Promise<{ stream: NodeJS.ReadableStream; stats: any } | null> {
    try {
      const filePath = path.join(this.UPLOAD_DIR, filename);
      
      if (!existsSync(filePath)) {
        return null;
      }

      const stats = await fs.stat(filePath);
      const stream = createReadStream(filePath);
      
      return { stream, stats };
    } catch (error) {
      console.error('Error retrieving file:', error);
      throw new Error('Failed to retrieve file');
    }
  }

  // Delete file
  static async deleteFile(filename: string): Promise<void> {
    try {
      const filePath = path.join(this.UPLOAD_DIR, filename);
      
      if (existsSync(filePath)) {
        await fs.unlink(filePath);
        console.log('File deleted:', filename);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  // Get file information
  static async getFileInfo(filename: string): Promise<{ size: number; mtime: Date } | null> {
    try {
      const filePath = path.join(this.UPLOAD_DIR, filename);
      
      if (!existsSync(filePath)) {
        return null;
      }

      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      return null;
    }
  }

  // Format file size for display
  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = Math.round(bytes / Math.pow(1024, i) * 100) / 100;
    
    return `${size} ${sizes[i]}`;
  }

  // Check if file is an image
  static isImageFile(mimeType: string): boolean {
    return this.ALLOWED_IMAGE_TYPES.includes(mimeType);
  }

  // Get upload directory path
  static getUploadDir(): string {
    return this.UPLOAD_DIR;
  }
} 