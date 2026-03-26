import { getInnerXBounds, groundY } from './world'

export type WallContact = 'left' | 'right' | null

export type PlayerKeys = {
  left: boolean
  right: boolean
  leftJustPressed: boolean
  rightJustPressed: boolean
  jumpJustPressed: boolean
}

export type Player = {
  w: number
  h: number
  x: number
  y: number
  vx: number
  vy: number
  onGround: boolean
}

export type PlayerController = {
  wallContact: WallContact
  wallJumpUsed: boolean
  airJumpAvailable: boolean
  wallJumpImpulseTime: number
}

export const MOVEMENT = {
  moveSpeed: 280,
  gravity: 2200,
  jumpVelocity: 720,
  wallJumpHorizontalVel: 320,
  wallJumpImpulseDuration: 0.14,
  wallSlideMaxFallSpeed: 200
}

export function createPlayer(groundLevelY: number): Player {
  const h = 64
  const w = 44
  return {
    w,
    h,
    x: 240,
    y: groundLevelY - h,
    vx: 0,
    vy: 0,
    onGround: true
  }
}

export function createPlayerController(): PlayerController {
  return {
    wallContact: null,
    wallJumpUsed: false,
    airJumpAvailable: false,
    wallJumpImpulseTime: 0
  }
}

function resolveGroundCollision(player: Player, ctrl: PlayerController): void {
  const { y, h } = player

  if (y + h >= groundY) {
    player.y = groundY - h
    player.vy = 0
    player.onGround = true
    ctrl.wallContact = null
    ctrl.wallJumpUsed = false
    ctrl.airJumpAvailable = false
  }
}

function resolveWallCollision(player: Player, ctrl: PlayerController): void {
  const { minX, maxX } = getInnerXBounds(player.w)

  const beforeX = player.x
  player.x = Math.max(minX, Math.min(player.x, maxX))

  const hitWallThisFrame = player.x !== beforeX
  if (hitWallThisFrame) {
    player.vx = 0
    if (!player.onGround && player.vy < 0) player.vy = 0
  }

  if (player.onGround) {
    ctrl.wallContact = null
    return
  }

  const touchingLeft = player.x === minX
  const touchingRight = player.x === maxX
  if (touchingLeft) ctrl.wallContact = 'left'
  else if (touchingRight) ctrl.wallContact = 'right'
  else ctrl.wallContact = null
}

export function updatePlayer(
  dt: number,
  player: Player,
  ctrl: PlayerController,
  keys: PlayerKeys
): void {
  const jumpPressed = keys.jumpJustPressed
  keys.jumpJustPressed = false
  const leftPressed = keys.leftJustPressed
  const rightPressed = keys.rightJustPressed
  keys.leftJustPressed = false
  keys.rightJustPressed = false

  const wallContactAtStart = ctrl.wallContact
  const onGroundAtStart = player.onGround

  ctrl.wallJumpImpulseTime = Math.max(0, ctrl.wallJumpImpulseTime - dt)

  if (!onGroundAtStart && wallContactAtStart && !ctrl.wallJumpUsed) {
    const wantsWallJump =
      (wallContactAtStart === 'left' && (rightPressed || keys.right)) ||
      (wallContactAtStart === 'right' && (leftPressed || keys.left))

    if (wantsWallJump) {
      const pushDir = wallContactAtStart === 'left' ? 1 : -1
      player.vy = -MOVEMENT.jumpVelocity
      player.vx = pushDir * MOVEMENT.wallJumpHorizontalVel
      ctrl.wallJumpImpulseTime = MOVEMENT.wallJumpImpulseDuration
      ctrl.wallJumpUsed = true
      ctrl.airJumpAvailable = true
    }
  }

  if (ctrl.wallJumpImpulseTime <= 0) {
    if (keys.left && !keys.right) player.vx = -MOVEMENT.moveSpeed
    else if (keys.right && !keys.left) player.vx = MOVEMENT.moveSpeed
    else player.vx = 0
  }

  player.vy += MOVEMENT.gravity * dt

  player.x += player.vx * dt
  player.y += player.vy * dt

  resolveGroundCollision(player, ctrl)
  resolveWallCollision(player, ctrl)

  const pressingIntoLeftWall = ctrl.wallContact === 'left' && keys.left
  const pressingIntoRightWall = ctrl.wallContact === 'right' && keys.right
  const wallSliding = !player.onGround && (pressingIntoLeftWall || pressingIntoRightWall)
  if (wallSliding && player.vy > MOVEMENT.wallSlideMaxFallSpeed) {
    player.vy = MOVEMENT.wallSlideMaxFallSpeed
  }

  if (jumpPressed) {
    if (player.onGround) {
      player.vy = -MOVEMENT.jumpVelocity
      player.onGround = false
      ctrl.airJumpAvailable = false
    } else if (ctrl.airJumpAvailable) {
      player.vy = -MOVEMENT.jumpVelocity
      ctrl.airJumpAvailable = false
    }
  }
}

export function drawPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
  const p = player
  ctx.fillStyle = '#37a7ff'
  ctx.fillRect(p.x, p.y, p.w, p.h)

  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  const eyeY = p.y + 18
  ctx.fillRect(p.x + 12, eyeY, 6, 6)
  ctx.fillRect(p.x + p.w - 18, eyeY, 6, 6)

  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.strokeRect(p.x, p.y, p.w, p.h)
}
