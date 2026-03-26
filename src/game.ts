type Keys = {
  left: boolean
  right: boolean
  leftJustPressed: boolean
  rightJustPressed: boolean
  jumpJustPressed: boolean
}

type WallContact = 'left' | 'right' | null

export class Game {
  private ctx: CanvasRenderingContext2D
  private running = false
  private lastT = 0

  // Fixed world coordinate system (rendered to a scaled canvas).
  private readonly WORLD_W = 900
  private readonly WORLD_H = 500

  private dpr = Math.max(1, window.devicePixelRatio || 1)
  private displayW = this.WORLD_W
  private displayH = this.WORLD_H
  private scale = 1

  private keys: Keys = {
    left: false,
    right: false,
    leftJustPressed: false,
    rightJustPressed: false,
    jumpJustPressed: false
  }

  // Wall / jump rules.
  private wallContact: WallContact = null
  private wallJumpUsed = false
  private airJumpAvailable = false
  private wallJumpImpulseTime = 0

  // Level geometry (two fixed vertical walls + a ground platform).
  private readonly leftWallX = 60
  private readonly rightWallX = 840
  private readonly wallThickness = 18
  private readonly groundY = 430

  private readonly player = {
    w: 44,
    h: 64,
    x: 240,
    y: this.groundY - 64,
    vx: 0,
    vy: 0,
    onGround: true
  }

  private readonly movement = {
    moveSpeed: 280, // px/s
    gravity: 2200, // px/s^2
    jumpVelocity: 720, // px/s (upwards via negative vy)
    wallJumpHorizontalVel: 320, // px/s push away from wall
    wallJumpImpulseDuration: 0.14, // seconds to keep the push even without input
    wallSlideMaxFallSpeed: 200 // px/s (downwards cap when pressing into a wall)
  }

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not create 2D context')
    this.ctx = ctx

    window.addEventListener('keydown', (e) => this.onKeyDown(e))
    window.addEventListener('keyup', (e) => this.onKeyUp(e))
  }

  setDisplaySize(displayW: number, displayH: number) {
    this.displayW = Math.max(1, displayW)
    this.displayH = Math.max(1, displayH)
    this.scale = this.displayW / this.WORLD_W

    this.dpr = Math.max(1, window.devicePixelRatio || 1)
    this.canvas.style.width = `${this.displayW}px`
    this.canvas.style.height = `${this.displayH}px`
    this.canvas.width = Math.round(this.displayW * this.dpr)
    this.canvas.height = Math.round(this.displayH * this.dpr)
  }

  start() {
    if (this.running) return
    this.running = true
    this.lastT = performance.now()
    requestAnimationFrame((t) => this.loop(t))
  }

  private loop(t: number) {
    if (!this.running) return
    const dt = Math.min(0.033, (t - this.lastT) / 1000)
    this.lastT = t

    this.update(dt)
    this.render()
    requestAnimationFrame((nextT) => this.loop(nextT))
  }

  private onKeyDown(e: KeyboardEvent) {
    // Use codes so it works regardless of keyboard layout.
    if (e.repeat) return

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this.keys.left = true
      this.keys.leftJustPressed = true
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.keys.right = true
      this.keys.rightJustPressed = true
    }

    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      this.keys.jumpJustPressed = true
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = false
    if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = false
  }

  private update(dt: number) {
    // One-frame pulse so holding Space doesn't trigger repeated jumps.
    const jumpPressed = this.keys.jumpJustPressed
    this.keys.jumpJustPressed = false
    const leftPressed = this.keys.leftJustPressed
    const rightPressed = this.keys.rightJustPressed
    this.keys.leftJustPressed = false
    this.keys.rightJustPressed = false

    // Capture contact state from the start of the frame (from last collision resolution).
    // This avoids losing wall contact when the player taps away from the wall and moves
    // off it before the wall-jump check runs.
    const wallContactAtStart = this.wallContact
    const onGroundAtStart = this.player.onGround

    // Slight horizontal "push" after a wall jump so the player can actually move away
    // even if no left/right input is held.
    this.wallJumpImpulseTime = Math.max(0, this.wallJumpImpulseTime - dt)

    // Auto wall-jump: if touching a wall in midair and the player is holding away from it,
    // assume they want to wall-jump (no jump key required).
    if (!onGroundAtStart && wallContactAtStart && !this.wallJumpUsed) {
      const wantsWallJump =
        (wallContactAtStart === 'left' && (rightPressed || this.keys.right)) ||
        (wallContactAtStart === 'right' && (leftPressed || this.keys.left))

      if (wantsWallJump) {
        const pushDir = wallContactAtStart === 'left' ? 1 : -1
        this.player.vy = -this.movement.jumpVelocity
        this.player.vx = pushDir * this.movement.wallJumpHorizontalVel
        this.wallJumpImpulseTime = this.movement.wallJumpImpulseDuration
        this.wallJumpUsed = true
        this.airJumpAvailable = true
      }
    }

    // Horizontal movement (unless wall-jump impulse is active).
    if (this.wallJumpImpulseTime <= 0) {
      if (this.keys.left && !this.keys.right) this.player.vx = -this.movement.moveSpeed
      else if (this.keys.right && !this.keys.left) this.player.vx = this.movement.moveSpeed
      else this.player.vx = 0
    }

    // Physics.
    this.player.vy += this.movement.gravity * dt

    // Integrate.
    this.player.x += this.player.vx * dt
    this.player.y += this.player.vy * dt

    // Collisions with ground and walls (simple AABB resolution via clamps).
    this.resolveGroundCollision()
    this.resolveWallCollision()

    // Wall slide: if airborne, touching a wall, and pressing into it, cap downward speed.
    const pressingIntoLeftWall = this.wallContact === 'left' && this.keys.left
    const pressingIntoRightWall = this.wallContact === 'right' && this.keys.right
    const wallSliding = !this.player.onGround && (pressingIntoLeftWall || pressingIntoRightWall)
    if (wallSliding && this.player.vy > this.movement.wallSlideMaxFallSpeed) {
      this.player.vy = this.movement.wallSlideMaxFallSpeed
    }

    // Jump decision (after collision resolution so onGround/wallContact are current).
    if (jumpPressed) {
      if (this.player.onGround) {
        this.player.vy = -this.movement.jumpVelocity
        this.player.onGround = false
        this.airJumpAvailable = false
      } else if (this.airJumpAvailable) {
        // The second jump after the wall jump.
        this.player.vy = -this.movement.jumpVelocity
        this.airJumpAvailable = false
      }
    }
  }

  private resolveGroundCollision() {
    const { y, h } = this.player

    if (y + h >= this.groundY) {
      this.player.y = this.groundY - h
      this.player.vy = 0
      this.player.onGround = true
      this.wallContact = null
      this.wallJumpUsed = false
      this.airJumpAvailable = false
    }
  }

  private resolveWallCollision() {
    const minX = this.leftWallX + this.wallThickness
    // `rightWallX` is the wall's left edge, so the inner face is exactly at `rightWallX`.
    const maxX = this.rightWallX - this.player.w

    const beforeX = this.player.x
    this.player.x = Math.max(minX, Math.min(this.player.x, maxX))

    if (this.player.x !== beforeX) this.player.vx = 0

    // Only count as wall contact when airborne; ground should take precedence.
    if (this.player.onGround) {
      this.wallContact = null
      return
    }

    const touchingLeft = this.player.x === minX
    const touchingRight = this.player.x === maxX
    if (touchingLeft) this.wallContact = 'left'
    else if (touchingRight) this.wallContact = 'right'
    else this.wallContact = null
  }

  private render() {
    // Clear using world coordinate space.
    const ctx = this.ctx
    ctx.save()
    ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, 0, 0)
    ctx.clearRect(0, 0, this.WORLD_W, this.WORLD_H)

    // Background.
    ctx.fillStyle = '#0f1733'
    ctx.fillRect(0, 0, this.WORLD_W, this.WORLD_H)

    // Walls.
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillRect(this.leftWallX, 0, this.wallThickness, this.WORLD_H)
    ctx.fillRect(this.rightWallX, 0, this.wallThickness, this.WORLD_H)

    // Ground.
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    const groundH = this.WORLD_H - this.groundY
    ctx.fillRect(0, this.groundY, this.WORLD_W, groundH)

    // Player sprite (simple rectangle "sprite").
    const p = this.player
    ctx.fillStyle = '#37a7ff'
    ctx.fillRect(p.x, p.y, p.w, p.h)

    // Eyes.
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    const eyeY = p.y + 18
    ctx.fillRect(p.x + 12, eyeY, 6, 6)
    ctx.fillRect(p.x + p.w - 18, eyeY, 6, 6)

    // Subtle outline.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.strokeRect(p.x, p.y, p.w, p.h)

    // HUD text (rendered in-canvas too, for visibiblity on canvas-only setups).
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
    ctx.fillText(
      'A/D or Left/Right to move. Space/W/Up to jump. Wall-jump when touching walls in air.',
      16,
      26
    )

    ctx.restore()
  }
}

