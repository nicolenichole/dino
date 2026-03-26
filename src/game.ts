import { createEnemy, drawEnemy, type Enemy } from './enemy'
import {
  createPlayer,
  createPlayerController,
  drawPlayer,
  type Player,
  type PlayerController,
  type PlayerKeys,
  updatePlayer
} from './player'
import { WORLD_H, WORLD_W, drawWorld, groundY } from './world'

export class Game {
  private ctx: CanvasRenderingContext2D
  private running = false
  private lastT = 0

  private dpr = Math.max(1, window.devicePixelRatio || 1)
  private displayW = WORLD_W
  private displayH = WORLD_H
  private scale = 1

  private keys: PlayerKeys = {
    left: false,
    right: false,
    leftJustPressed: false,
    rightJustPressed: false,
    jumpJustPressed: false
  }

  private readonly playerController: PlayerController = createPlayerController()
  private readonly player: Player = createPlayer(groundY)
  private readonly enemy: Enemy = createEnemy()

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
    this.scale = this.displayW / WORLD_W

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
    updatePlayer(dt, this.player, this.playerController, this.keys)
  }

  private render() {
    const ctx = this.ctx
    ctx.save()
    ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, 0, 0)
    ctx.clearRect(0, 0, WORLD_W, WORLD_H)

    drawWorld(ctx)
    drawEnemy(ctx, this.enemy)
    drawPlayer(ctx, this.player)

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
