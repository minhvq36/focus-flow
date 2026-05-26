export function getShadowTransform(date: Date = new Date()) {
  const hour = date.getHours()
  const minutes = date.getMinutes()
  const time = hour + minutes / 60

  let skewX = 0
  let alpha = 0.3
  let scaleYMultiplier = 1.0 // Hệ số giãn bóng theo chiều Y

  if (time >= 6 && time <= 18) {
    const progress = (time - 6) / 12
    
    // GIẢI QUYẾT 6H SÁNG: 
    // Giảm Skew tối đa từ 1.5 xuống 0.8 (khoảng 45 độ)
    skewX = 0.8 - (progress * 1.6)

    // Khoảng cách thời gian tới 12h trưa (Trưa = 0, Sáng/Chiều = 0.5)
    const distFromNoon = Math.abs(progress - 0.5)
    
    // GIẢI QUYẾT 12H TRƯA:
    // Sáng/chiều (0.5): Bóng dài ra -> nhân scaleY lên 1.2
    // Trưa (0): Bóng tụ lại chân -> nhân scaleY tụt xuống 0.4
    scaleYMultiplier = 0.4 + (distFromNoon * 1.6)

    // Trưa thì bóng đậm (0.45), Sáng chiều thì nhạt (0.2)
    alpha = 0.45 - (distFromNoon * 0.5)
  } else {
    skewX = -0.6
    alpha = 0.15
    scaleYMultiplier = 0.8
  }

  return { skewX, alpha, scaleYMultiplier }
}