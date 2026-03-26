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
  /** Seconds left for swing animation; 0 means idle (rest pose). */
  clubSwingRemaining: number
  /** 1 = face right, -1 = face left; updated when `vx !== 0`. */
  facing: 1 | -1
}

const CLUB_SWING_DURATION = 0.22
/** Angle (radians): idle / chambered—tip offset uses y'=-L*cos(θ) under ctx.rotate. */
const CLUB_ANGLE_REST = 0.5
/** Angle (radians): follow-through—larger than REST so rotation is clockwise (canvas +θ = CW). Same |θ| as before keeps tip low. */
const CLUB_ANGLE_DOWN = 2.35
const CLUB_LENGTH = 50
const CLUB_THICKNESS = 9

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
    onGround: true,
    clubSwingRemaining: 0,
    facing: 1
  }
}

export function startClubSwing(player: Player): void {
  player.clubSwingRemaining = CLUB_SWING_DURATION
}

export function updateClubSwing(dt: number, player: Player): void {
  if (player.clubSwingRemaining <= 0) return
  player.clubSwingRemaining = Math.max(0, player.clubSwingRemaining - dt)
}

function clubSwingAngle(player: Player): number {
  if (player.clubSwingRemaining <= 0) return CLUB_ANGLE_REST
  const t = 1 - player.clubSwingRemaining / CLUB_SWING_DURATION
  const eased = t * t * (3 - 2 * t)
  return CLUB_ANGLE_REST + eased * (CLUB_ANGLE_DOWN - CLUB_ANGLE_REST)
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

  if (player.vx !== 0) player.facing = player.vx > 0 ? 1 : -1
}

export function drawPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
  const p = player
  const w = p.w
  const h = p.h
  const cx = p.x + w / 2
  const baseY = p.y

  ctx.save()
  ctx.translate(cx, baseY)
  ctx.scale(p.facing, 1)

  ctx.fillStyle = '#37a7ff'
  ctx.beginPath()
  ctx.roundRect(-w / 2, 0, w, h, 8)
  ctx.fill()

  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  ctx.beginPath()
  ctx.ellipse(w * 0.12, h * 0.52, w * 0.22, h * 0.2, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#2d8bc4'
  ctx.beginPath()
  ctx.roundRect(w / 2 - 16, 20, 14, 16, 5)
  ctx.fill()

  const eyeY = 18
  const eyeSize = 6
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(-w / 2 + 12, eyeY, eyeSize, eyeSize)
  ctx.fillRect(w / 2 - 18, eyeY, eyeSize, eyeSize)

  ctx.fillStyle = 'rgba(0,0,0,0.75)'
  const pupilOff = 2
  ctx.fillRect(-w / 2 + 12 + pupilOff, eyeY + 2, 2, 2)
  ctx.fillRect(w / 2 - 18 + pupilOff, eyeY + 2, 2, 2)

  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(-w / 2, 0, w, h, 8)
  ctx.stroke()

  ctx.restore()

  drawClub(ctx, p)
}

export function drawClub(ctx: CanvasRenderingContext2D, player: Player): void {
  const p = player
  const handT = p.facing > 0 ? 0.86 : 0.14
  const pivotX = p.x + p.w * handT
  const pivotY = p.y + p.h * 0.4
  const angle = clubSwingAngle(p)
  ctx.save()
  ctx.translate(pivotX, pivotY)
  ctx.scale(p.facing, 1)
  ctx.rotate(angle)
  ctx.fillStyle = '#6b4a2d'
  ctx.beginPath()
  ctx.roundRect(-CLUB_THICKNESS / 2, -CLUB_LENGTH, CLUB_THICKNESS, CLUB_LENGTH, 4)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}
