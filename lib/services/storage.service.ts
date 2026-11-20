/* ── Supabase Storage Service for File Uploads ──────────────────── */

export interface UploadResult {
  url: string;
  path: string;
  publicUrl?: string;
}

export interface UploadOptions {
  bucket: 'equipment-images' | 'equipment-documents' | 'inspection-photos' | 'merchant-documents';
  path?: string;
  isPublic?: boolean;
}

class StorageService {
  /**
   * Upload a file to Supabase Storage via /api/upload
   * Authenticated via user session cookies, rate-limited, and enforced with strict file validation.
   * Never directly imports server-side Supabase credentials into client bundles.
   */
  async uploadFile(
    file: File,
    options: UploadOptions
  ): Promise<UploadResult> {
    try {
      const { bucket, path, isPublic = false } = options;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      if (path) formData.append('path', path);
      formData.append('isPublic', String(isPublic));

      const baseUrl = typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '') : '';
      const res = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        credentials: 'same-origin',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to upload file');
      }

      return json.data;
    } catch (error: any) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: File[],
    options: UploadOptions
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, options));
    return Promise.all(uploadPromises);
  }

  /**
   * Get public URL for a public file
   */
  getPublicUrl(bucket: string, path: string): string {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set; cannot construct public storage URL');
    }
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
  }

  /**
   * Upload equipment images (public)
   */
  async uploadEquipmentImages(
    files: File[],
    equipmentId: string
  ): Promise<UploadResult[]> {
    return this.uploadFiles(files, {
      bucket: 'equipment-images',
      path: equipmentId,
      isPublic: true,
    });
  }

  /**
   * Upload equipment documents (private)
   */
  async uploadEquipmentDocuments(
    files: File[],
    equipmentId: string
  ): Promise<UploadResult[]> {
    return this.uploadFiles(files, {
      bucket: 'equipment-documents',
      path: equipmentId,
      isPublic: false,
    });
  }

  /**
   * Upload inspection photos (private)
   */
  async uploadInspectionPhotos(
    files: File[],
    rentalRequestId: string
  ): Promise<UploadResult[]> {
    return this.uploadFiles(files, {
      bucket: 'inspection-photos',
      path: rentalRequestId,
      isPublic: false,
    });
  }

  /**
   * Upload merchant verification documents (private)
   */
  async uploadMerchantDocuments(
    files: File[],
    merchantId: string
  ): Promise<UploadResult[]> {
    return this.uploadFiles(files, {
      bucket: 'merchant-documents',
      path: merchantId,
      isPublic: false,
    });
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File, options: {
    maxSizeMB?: number;
    allowedTypes?: string[];
  }): { valid: boolean; error?: string } {
    const { maxSizeMB = 10, allowedTypes } = options;

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File size must be less than ${maxSizeMB}MB`,
      };
    }

    // Check file type
    if (allowedTypes && allowedTypes.length > 0) {
      const fileType = file.type;
      const fileExt = file.name.split('.').pop()?.toLowerCase();

      const isValidType = allowedTypes.some(type => {
        if (type.includes('*')) {
          // Handle wildcards like 'image/*'
          const baseType = type.split('/')[0];
          return fileType.startsWith(baseType);
        }
        // Check extension or mime type
        return fileType === type || fileExt === type.replace('.', '');
      });

      if (!isValidType) {
        return {
          valid: false,
          error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate multiple files
   */
  validateFiles(
    files: File[],
    options: {
      maxSizeMB?: number;
      allowedTypes?: string[];
      maxFiles?: number;
    }
  ): { valid: boolean; error?: string } {
    const { maxFiles } = options;

    if (maxFiles && files.length > maxFiles) {
      return {
        valid: false,
        error: `Maximum ${maxFiles} files allowed`,
      };
    }

    for (const file of files) {
      const validation = this.validateFile(file, options);
      if (!validation.valid) {
        return validation;
      }
    }

    return { valid: true };
  }
}

export const storageService = new StorageService();
