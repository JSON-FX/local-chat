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
  
  // Image file types
  private static readonly ALLOWED_IMAGE_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'
  ];
  private static readonly ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  // Document file types
  private static readonly ALLOWED_DOCUMENT_TYPES = [
    // Office documents
    'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    
    // PDF
    'application/pdf',
    
    // Text and data formats
    'text/plain',
    'text/csv',
    'application/json',
    'application/xml',
    'text/xml',
    
    // Open document formats
    'application/vnd.oasis.opendocument.text', // .odt
    'application/vnd.oasis.opendocument.spreadsheet', // .ods
    'application/vnd.oasis.opendocument.presentation', // .odp
    
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    
    // Other common formats
    'application/rtf',
    'text/markdown',
    'text/html'
  ];
  
  private static readonly ALLOWED_DOCUMENT_EXTENSIONS = [
    // Office documents
    '.doc', '.docx', 
    '.xls', '.xlsx', 
    '.ppt', '.pptx',
    
    // PDF
    '.pdf',
    
    // Text and data formats
    '.txt', '.text',
    '.csv',
    '.json',
    '.xml',
    
    // Open document formats
    '.odt', '.ods', '.odp',
    
    // Archives
    '.zip', '.rar', '.7z', '.gz', '.tar',
    
    // Other common formats
    '.rtf',
    '.md', '.markdown',
    '.html', '.htm'
  ];
  
  // Combined allowed types and extensions
  private static readonly ALLOWED_TYPES = [
    ...FileService.ALLOWED_IMAGE_TYPES,
    ...FileService.ALLOWED_DOCUMENT_TYPES
  ];
  
  private static readonly ALLOWED_EXTENSIONS = [
    ...FileService.ALLOWED_IMAGE_EXTENSIONS,
    ...FileService.ALLOWED_DOCUMENT_EXTENSIONS
  ];

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
      allowedTypes: this.ALLOWED_TYPES,
      allowedExtensions: this.ALLOWED_EXTENSIONS
    };
    
    const config = { ...defaultOptions, ...options };
    
    // Check file size
    if (file.size > config.maxSize) {
      return {
        valid: false,
        error: `File size too large. Maximum allowed: ${this.formatFileSize(config.maxSize)}`
      };
    }

    // Get file extension
    const ext = path.extname(file.name).toLowerCase();
    
    // Check file extension first (more reliable than MIME type)
    if (!config.allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `File extension not allowed. Allowed extensions include images, documents, spreadsheets, and more.`
      };
    }
    
    // If MIME type is available, check it too
    if (file.type && !config.allowedTypes.includes(file.type)) {
      // If extension is valid but MIME type isn't recognized, allow it anyway
      // This handles cases where the browser doesn't report the correct MIME type
      console.warn(`File MIME type ${file.type} not explicitly allowed, but extension ${ext} is valid. Allowing upload.`);
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
      // Handle both direct filenames and paths with subdirectories (e.g., "avatars/filename.jpg")
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
  
  // Get file icon based on extension
  static getFileIconByExtension(extension: string): string {
    const ext = extension.toLowerCase();
    
    // Document types
    if (['.doc', '.docx', '.odt', '.rtf'].includes(ext)) {
      return 'file-text';
    }
    
    // Spreadsheet types
    if (['.xls', '.xlsx', '.ods', '.csv'].includes(ext)) {
      return 'file-spreadsheet';
    }
    
    // Presentation types
    if (['.ppt', '.pptx', '.odp'].includes(ext)) {
      return 'file-presentation';
    }
    
    // PDF
    if (ext === '.pdf') {
      return 'file-pdf';
    }
    
    // Archives
    if (['.zip', '.rar', '.7z', '.gz', '.tar'].includes(ext)) {
      return 'file-archive';
    }
    
    // Code or markup
    if (['.json', '.xml', '.html', '.htm', '.md', '.markdown'].includes(ext)) {
      return 'file-code';
    }
    
    // Default file icon
    return 'file';
  }

  // Get upload directory path
  static getUploadDir(): string {
    return this.UPLOAD_DIR;
  }
} 