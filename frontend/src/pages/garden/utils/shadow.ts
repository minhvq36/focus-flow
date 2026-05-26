import { Sprite, Container, BlurFilter, Texture } from 'pixi.js'
import type { AssetConfig } from '@/constants/assets'

export function getShadowTransform(date: Date = new Date()) {
  const hour = date.getHours()
  const minutes = date.getMinutes()
  const time = hour + minutes / 60

  let skewX = 0
  let alpha = 0.3
  let scaleYMultiplier = 1.0

  if (time >= 6 && time <= 18) {
    const progress = (time - 6) / 12
    skewX = 0.8 - (progress * 1.6)
    const distFromNoon = Math.abs(progress - 0.5)
    alpha = 0.35 - (Math.pow(distFromNoon, 1.5) * 0.4)
    scaleYMultiplier = 0.55 + (distFromNoon * 1.6)

  } else {
    skewX = -0.6
    alpha = 0.15
    scaleYMultiplier = 0.8
  }

  return { skewX, alpha, scaleYMultiplier }
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