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