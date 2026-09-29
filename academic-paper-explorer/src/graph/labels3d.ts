import * as THREE from 'three'

export function truncateTitle(title: string | undefined, max = 22): string {
  const raw = (title ?? '').trim()
  if (raw.length <= max) return raw
  return `${raw.slice(0, max)}…`
}

export interface LabelSpriteOptions {
  height: number
  color?: string
  background?: string
}

/** Build a billboarded text sprite for a 3D node label. */
export function createLabelSprite(text: string, opts: LabelSpriteOptions): THREE.Sprite {
  const fontPx = 48
  const pad = 14
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = `600 ${fontPx}px Inter, sans-serif`
  const width = Math.ceil(ctx.measureText(text).width) + pad * 2
  const height = fontPx + pad * 2
  canvas.width = width
  canvas.height = height

  ctx.font = `600 ${fontPx}px Inter, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = opts.background ?? 'rgba(11,18,32,0.82)'
  ctx.beginPath()
  if (typeof (ctx as any).roundRect === 'function') (ctx as any).roundRect(0, 0, width, height, 10)
  else ctx.rect(0, 0, width, height)
  ctx.fill()
  ctx.fillStyle = opts.color ?? 'rgba(241,245,249,0.98)'
  ctx.fillText(text, width / 2, height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set((width / height) * opts.height, opts.height, 1)
  return sprite
}
