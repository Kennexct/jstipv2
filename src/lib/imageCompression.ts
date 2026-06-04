import imageCompression from 'browser-image-compression';
import { toast } from 'sonner';

/**
 * Compresses an image File and returns it as a base64 string.
 * This is crucial to prevent localStorage from overflowing and crashing the app.
 */
export async function compressImageToBase64(file: File): Promise<string> {
  const options = {
    maxSizeMB: 0.5, // 500 KB limit
    maxWidthOrHeight: 800, // 800px max dimension
    useWebWorker: true,
    fileType: 'image/webp' // webp is usually smaller
  };

  try {
    // Compress the file
    const compressedFile = await imageCompression(file, options);
    
    // Convert to Base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error("FileReader result is not a string"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(compressedFile);
    });
  } catch (error) {
    console.error('Image compression failed:', error);
    toast.error('Gagal mengompres gambar. Coba gambar lain.');
    throw error;
  }
}
