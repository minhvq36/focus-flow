import { Sprite, Container, BlurFilter, Texture } from 'pixi.js'
import type { AssetConfig } from '@/constants/assets'

export function getShadowTransform(date: Date = new Date()) {
  const hour = date.getHours()
  const minutes = date.getMinutes()
  const time = hour + minutes / 60

  // Ban ngày: bóng đổ theo góc mặt trời, ngắn và nhạt nhất lúc giữa trưa
  if (time >= 6 && time <= 18) {
    const progress = (time - 6) / 12
    const distFromNoon = Math.abs(progress - 0.5)

    return {
      skewX: 0.8 - (progress * 1.6),
      alpha: 0.28 - (Math.pow(distFromNoon, 1.5) * 0.3),
      scaleYMultiplier: 0.55 + (distFromNoon * 1.6),
    }
  }

  // Ban đêm: bóng cố định, mờ
  return { skewX: -0.6, alpha: 0.15, scaleYMultiplier: 0.8 }
}

// HÀM MỚI: Tách toàn bộ logic tạo bóng ra đây
export function createShadow(
  texture: Texture,
  config: AssetConfig,
  finalScale: number
): Container {
  const container = new Container()
  
  const actualPivotY = config.visualBaseY ?? config.anchorY
  const pixelDiffY = (config.anchorY - actualPivotY) * texture.height * finalScale
  
  const { skewX, alpha, scaleYMultiplier } = getShadowTransform()

  // 1. Bóng sau (Back - 100%)
  const shadowBack = new Sprite(texture)
  shadowBack.anchor.set(config.anchorX, actualPivotY) 
  shadowBack.y = -pixelDiffY
  shadowBack.scale.set(finalScale*0.9, finalScale * 0.55 * scaleYMultiplier)
  shadowBack.skew.x = skewX
  shadowBack.tint = 0x111120
  
  container.addChild(shadowBack)
  
  container.alpha = alpha
  container.filters = [new BlurFilter(1.1)]

  return container
}