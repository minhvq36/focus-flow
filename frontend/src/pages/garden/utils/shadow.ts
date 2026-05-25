// Tính toán độ nghiêng (skew) và độ mờ (alpha) của bóng dựa theo giờ local
export function getShadowTransform(date: Date = new Date()) {
  const hour = date.getHours()
  const minutes = date.getMinutes()
  const time = hour + minutes / 60

  let skewX = 0
  let alpha = 0.3

  // Giả sử mặt trời mọc lúc 6h sáng, lặn lúc 18h
  if (time >= 6 && time <= 18) {
    // Progress từ 0 (6h sáng) -> 1 (18h chiều)
    const progress = (time - 6) / 12
    
    // Sáng (0): bóng ngả dài sang trái (skewX dương)
    // Trưa (0.5): bóng ở ngay dưới chân (skewX = 0)
    // Chiều (1): bóng ngả dài sang phải (skewX âm)
    // Chuyển đổi dải [0, 1] thành [1.5, -1.5] (1.5 là độ nghiêng tối đa)
    skewX = 1.5 - (progress * 3)

    // Trưa nắng thì bóng đậm hơn một chút, sáng/chiều thì nhạt hơn
    // Trưa progress = 0.5 -> abs(0.5 - 0.5) = 0 -> alpha = 0.4
    // Sáng/chiều progress = 0 hoặc 1 -> abs = 0.5 -> alpha = 0.2
    alpha = 0.4 - Math.abs(progress - 0.5) * 0.4
  } else {
    skewX = -0.8 // Trăng cố định ngả sang phải
    alpha = 0.15 // Bóng trăng rất nhạt
  }

  return { skewX, alpha }
}