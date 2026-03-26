type Keys = {
  left: boolean
  right: boolean
  jumpJustPressed: boolean
}

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

  private keys: Keys = { left: false, right: false, jumpJustPressed: false }

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
    jumpVelocity: 720 // px/s (upwards via negative vy)
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

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.keys.left = true
    if (e.code === 'ArrowRight' || e.code === 'KeyD') this.keys.right = true

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

    // Horizontal movement.
    if (this.keys.left && !this.keys.right) this.player.vx = -this.movement.moveSpeed
    else if (this.keys.right && !this.keys.left) this.player.vx = this.movement.moveSpeed
    else this.player.vx = 0

    // Physics.
    this.player.vy += this.movement.gravity * dt

    if (jumpPressed && this.player.onGround) {
      this.player.vy = -this.movement.jumpVelocity
      this.player.onGround = false
    }

    // Integrate.
    this.player.x += this.player.vx * dt
    this.player.y += this.player.vy * dt

    // Collisions with ground and walls (simple AABB resolution via clamps).
    this.resolveGroundCollision()
    this.resolveWallCollision()

    // If we ended up on ground by resolving collision, allow next jump later.
  }

  private resolveGroundCollision() {
    const { x, w, y, h } = this.player
    void x
    void w

    if (y + h >= this.groundY) {
      this.player.y = this.groundY - h
      this.player.vy = 0
      this.player.onGround = true
    }
  }

  private resolveWallCollision() {
    const minX = this.leftWallX + this.wallThickness
    const maxX = this.rightWallX - this.wallThickness - this.player.w

    const beforeX = this.player.x
    this.player.x = Math.max(minX, Math.min(this.player.x, maxX))

    if (this.player.x !== beforeX) {
      // Stop horizontal motion against the wall.
      this.player.vx = 0
    }
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

    // HUD text (rendered in-canvas too, for visibility on canvas-only setups).
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
    ctx.fillText('A/D or Left/Right to move. Space/W/Up to jump.', 16, 26)

    ctx.restore()
  }
}

