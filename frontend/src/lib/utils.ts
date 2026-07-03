import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(num: number): string {
  if (!num || isNaN(num)) return "0"

  // Dưới 100,000 -> 1,234 / 12,345 (Giữ nguyên, có phẩy ngăn cách)
  if (num < 100_000) {
    return Math.floor(num).toLocaleString("en-US")
  }

  // Từ 100,000 đến 999,999 -> 100K, 999K (Làm tròn xuống, không thập phân)
  if (num < 1_000_000) {
    return `${Math.floor(num / 1000)}K`
  }

  // Từ 1 triệu đến dưới 1 tỷ -> 1M, 1.01M (Làm tròn xuống, tối đa 2 số thập phân)
  if (num < 1_000_000_000) {
    // Chia 10,000 rồi floor, sau đó chia 100 để đảm bảo làm tròn xuống đúng 2 chữ số thập phân
    const mValue = Math.floor(num / 10_000) / 100
    return `${mValue}M` // Mặc định JS sẽ bỏ số 0 vô nghĩa (1.00 -> 1)
  }

  // Từ 1 tỷ trở lên -> 1B, 1.23B, 1,234.56B
  const bValue = Math.floor(num / 10_000_000) / 100
  return `${bValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}B`
}

'use client';

/**
 * Convert mọi loại ảnh (JPG, PNG) sang chuẩn WebP, tối ưu hiệu năng và độ tin cậy.
 * @param file File ảnh gốc
 * @param quality Chất lượng ảnh WebP từ 0 - 1 (Mặc định 0.8). Sẽ được clamp về khoảng [0, 1].
 * @returns Promise<File> Trả về file ảnh đã convert sang WebP.
 */
export const convertToWebP = (file: File, quality = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error("Selected file is not an image."));
      return;
    }

    const safeQuality = Math.min(1, Math.max(0, quality));

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas is not supported in this browser."));
        return;
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);
        
        if (!blob) {
          reject(new Error("Canvas to Blob conversion failed."));
          return;
        }

        const newFileName = file.name.replace(/\.[^/.]+$/, ".webp");
        const webpFile = new File([blob], newFileName, { type: 'image/webp' });
        
        resolve(webpFile);
      }, 'image/webp', safeQuality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image from file."));
    };

    img.src = objectUrl;
  });
};