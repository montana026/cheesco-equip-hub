/* ── Supabase Storage Service for File Uploads ──────────────────── */

import { supabase } from '@/lib/supabase/client';

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
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    file: File,
    options: UploadOptions
  ): Promise<UploadResult> {
    try {
      const { bucket, path, isPublic = false } = options;

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}-${randomString}.${fileExt}`;

      // Construct storage path
      const storagePath = path ? `${path}/${fileName}` : fileName;

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
      }

      // Get URL
      let url: string;
      if (isPublic) {
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(storagePath);
        url = publicUrlData.publicUrl;
      } else {
        // For private files, generate signed URL (valid for 1 year)
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(storagePath, 31536000); // 1 year

        if (urlError) {
          throw new Error(`Failed to generate signed URL: ${urlError.message}`);
        }

        url = signedUrlData.signedUrl;
      }

      return {
        url,
        path: storagePath,
        publicUrl: isPublic ? url : undefined,
      };
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
   * Delete a file from storage
   */
  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Storage delete error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(bucket: string, paths: string[]): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(paths);

    if (error) {
      console.error('Storage bulk delete error:', error);
      throw new Error(`Failed to delete files: ${error.message}`);
    }
  }

  /**
   * Get a signed URL for a private file
   */
  async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600 // 1 hour default
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * Get public URL for a public file
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
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
