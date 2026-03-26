import { groundY, rightWallX } from './world'

export type Enemy = {
  x: number
  y: number
  w: number
  h: number
}

/** Stationary enemy on the ground, right side of the arena (inside inner wall bounds). */
export function createEnemy(): Enemy {
  const w = 78
  const h = 56
  const marginFromRightInner = 72
  const x = rightWallX - marginFromRightInner - w
  const y = groundY - h
  return { x, y, w, h }
}

/**
 * Simple blocky silhouette facing left (toward the player): tail, body, head, jaw, eye, legs.
 * Drawn in world space; colors match the game's flat geometric style.
 */
export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy): void {
  const { x, y, w, h } = enemy
  const bodyColor = '#3d7a4a'
  const bodyStroke = 'rgba(0,0,0,0.25)'
  const bellyColor = 'rgba(255,255,255,0.12)'

  // Outer bounds outline (subtle, like the player).
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.lineWidth = 1
  ctx.strokeRect(x, y, w, h)

  const tailW = Math.round(w * 0.22)
  const tailH = Math.round(h * 0.35)
  const tailX = x + w - tailW
  const tailY = y + h - tailH - 6
  ctx.fillStyle = bodyColor
  ctx.fillRect(tailX, tailY, tailW, tailH)

  const bodyX = x + 14
  const bodyY = y + 10
  const bodyW = w - 36
  const bodyH = h - 18
  ctx.fillRect(bodyX, bodyY, bodyW, bodyH)

  ctx.fillStyle = bellyColor
  ctx.fillRect(bodyX + 6, bodyY + bodyH * 0.45, bodyW - 14, bodyH * 0.38)

  ctx.fillStyle = bodyColor
  const headW = 28
  const headH = 26
  const headX = x + 4
  const headY = y + 14
  ctx.fillRect(headX, headY, headW, headH)

  const snoutH = 10
  ctx.fillRect(headX - 8, headY + headH - snoutH - 2, 14, snoutH)

  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(headX + headW - 14, headY + 6, 5, 5)

  const legW = 8
  const legH = 12
  const footY = y + h - legH
  ctx.fillStyle = bodyColor
  ctx.fillRect(bodyX + 8, footY, legW, legH)
  ctx.fillRect(bodyX + bodyW - legW - 8, footY, legW, legH)

  ctx.strokeStyle = bodyStroke
  ctx.strokeRect(tailX, tailY, tailW, tailH)
  ctx.strokeRect(bodyX, bodyY, bodyW, bodyH)
  ctx.strokeRect(headX, headY, headW, headH)
}
