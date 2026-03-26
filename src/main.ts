import './styles.css'
import { Game } from './game'

const canvas = document.getElementById('game') as HTMLCanvasElement | null
if (!canvas) {
  throw new Error('Missing canvas element with id="game"')
}

const game = new Game(canvas)

function fitCanvasToWindow() {
  // Keep a consistent "world" coordinate system inside the Game class.
  // We scale the canvas display size and then scale rendering accordingly.
  const WORLD_W = 900
  const WORLD_H = 500
  const padding = 24
  const maxW = Math.max(320, window.innerWidth - padding * 2)
  const targetW = Math.min(WORLD_W, maxW)
  const targetH = Math.round((targetW / WORLD_W) * WORLD_H)

  game.setDisplaySize(targetW, targetH)
}

window.addEventListener('resize', fitCanvasToWindow)
fitCanvasToWindow()
game.start()

