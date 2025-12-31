export interface FileObject {
  id: string;
  name: string;
  type: string;           // MIME type
  size: number;           // Bytes
  url: string;            // Download/view URL
  thumbnailUrl?: string;  // Preview thumbnail
  uploadedAt: Date;
}

export interface FileUpload {
  file: File;
  progress: number;       // 0-100
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
  result?: FileObject;
}
