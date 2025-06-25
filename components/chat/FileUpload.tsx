'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { apiService } from '../../lib/api';
import { toast } from 'sonner';
import { Upload, X, File, Image, FileText, FileSpreadsheet, FileBox, FileJson } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface FileUploadProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId?: number;
  groupId?: number;
  onFileUploaded?: (message: any) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  isOpen,
  onClose,
  recipientId,
  groupId,
  onFileUploaded
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File validation
  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    // Check file size
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }
    
    // Get file extension
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    // List of allowed extensions
    const allowedExtensions = [
      // Images
      '.jpg', '.jpeg', '.png', '.gif', '.webp',
      
      // Documents
      '.doc', '.docx', '.pdf', '.txt', '.rtf',
      
      // Spreadsheets
      '.xls', '.xlsx', '.csv',
      
      // Presentations
      '.ppt', '.pptx',
      
      // Other formats
      '.odt', '.ods', '.odp',
      '.zip', '.rar', '.7z',
      '.json', '.xml', '.md', '.html'
    ];
    
    if (!allowedExtensions.includes(ext)) {
      return 'File type not allowed. Supported formats include images, documents, spreadsheets, and more.';
    }
    
    return null;
  };

  // Truncate filename for display
  const truncateFilename = (filename: string, maxLength: number = 30): string => {
    if (filename.length <= maxLength) return filename;
    
    // Get the extension
    const lastDotIndex = filename.lastIndexOf('.');
    const extension = lastDotIndex !== -1 ? filename.slice(lastDotIndex) : '';
    
    // Calculate how many characters we can keep from the name
    const nameLength = maxLength - extension.length - 3; // 3 for the ellipsis
    
    // If the name is too short, just truncate from the end
    if (nameLength <= 0) {
      return filename.slice(0, maxLength - 3) + '...';
    }
    
    // Otherwise, keep the start and end of the name
    const baseName = filename.slice(0, lastDotIndex);
    const start = baseName.slice(0, Math.ceil(nameLength / 2));
    const end = baseName.slice(-(Math.floor(nameLength / 2)));
    
    return start + '...' + end + extension;
  };

  // Get file icon based on file type
  const getFileIcon = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    // Image files
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) || file.type.startsWith('image/')) {
      return <Image className="w-8 h-8 text-blue-500" />;
    }
    
    // Document files
    if (['.doc', '.docx', '.txt', '.rtf', '.odt'].includes(ext)) {
      return <FileText className="w-8 h-8 text-orange-500" />;
    }
    
    // Spreadsheet files
    if (['.xls', '.xlsx', '.csv', '.ods'].includes(ext)) {
      return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    }
    
    // PDF files
    if (ext === '.pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    
    // Archive files
    if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
      return <FileBox className="w-8 h-8 text-purple-500" />;
    }
    
    // Code or markup files
    if (['.json', '.xml', '.html', '.md', '.markdown'].includes(ext)) {
      return <FileJson className="w-8 h-8 text-gray-500" />;
    }
    
    // Default file icon
    return <File className="w-8 h-8 text-gray-500" />;
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    
    setSelectedFile(file);
  };

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Upload file
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    
    try {
      const response = await apiService.uploadFile(
        selectedFile,
        recipientId,
        groupId,
        caption
      );
      
      if (response.success) {
        toast.success('File uploaded successfully');
        onFileUploaded?.(response.data?.message);
        handleClose();
      } else {
        toast.error(response.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Handle close
  const handleClose = () => {
    setSelectedFile(null);
    setCaption('');
    setUploading(false);
    setIsDragOver(false);
    onClose();
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = Math.round(bytes / Math.pow(1024, i) * 100) / 100;
    
    return `${size} ${sizes[i]}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* File Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  {getFileIcon(selectedFile)}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-medium text-sm max-w-[200px] truncate">
                          {truncateFilename(selectedFile.name, 30)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{selectedFile.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  className="mt-2"
                >
                  <X className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 mx-auto text-gray-400" />
                <p className="text-sm text-gray-600">
                  Drag and drop a file here, or{' '}
                  <button
                    type="button"
                    className="text-blue-500 hover:text-blue-600 font-medium"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-gray-500">
                  Supports images, documents, spreadsheets and more (max 10MB)
                </p>
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleInputChange}
            className="hidden"
          />

          {/* Caption input */}
          <div className="space-y-2">
            <Label htmlFor="caption">Caption (optional)</Label>
            <Input
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              maxLength={500}
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileUpload; 