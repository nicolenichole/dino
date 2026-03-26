export const WORLD_W = 900
export const WORLD_H = 500

export const leftWallX = 60
export const rightWallX = 840
export const wallThickness = 18
export const groundY = 430

/** Inner horizontal bounds for a body of width `playerW` (left wall inner face .. right wall inner face minus width). */
export function getInnerXBounds(playerW: number): { minX: number; maxX: number } {
  const minX = leftWallX + wallThickness
  const maxX = rightWallX - playerW
  return { minX, maxX }
}

export function drawWorld(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#0f1733'
  ctx.fillRect(0, 0, WORLD_W, WORLD_H)

  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillRect(leftWallX, 0, wallThickness, WORLD_H)
  ctx.fillRect(rightWallX, 0, wallThickness, WORLD_H)

  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  const groundH = WORLD_H - groundY
  ctx.fillRect(0, groundY, WORLD_W, groundH)
}
