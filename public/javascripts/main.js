import Vector from './models/vector.js'
import FourByFour from './models/four_by_four.js'
import Camera from './models/orthographic.js'
import angles from './isomorphisms/angles.js'
import renderLine from './views/line.js'
import renderPolygon from './views/polygon.js'
import { seed, noise } from './utilities/noise.js'
import { stableSort, grid, sample } from './utilities/index.js'
import { COLORS, LEAF, TILE, BACKGROUND } from './constants/colors.js'
import {
  BLUR, ZOOM, ITERATIONS, SCALE, AXIOM, DISTANCE, ANGLE, AMPLITUDE,
  FREQUENCY, CUBE_FACES, MAX_FALLEN, FALLEN_CHANCE, ΔOPACITY, GRAVITY, WIND,
  TWIRL, Δt, OPACITY_THRESHOLD, FPS
} from './constants/dimensions.js'
import {
  RULES, FORWARD, FORWARD_NO_LINE, TURN_LEFT, TURN_RIGHT, PITCH_UP, PITCH_DOWN,
  ROLL_LEFT, ROLL_RIGHT, TURN_AROUND, NEXT_COLOR, START_POLYGON, END_POLYGON,
  START_BRANCH, END_BRANCH
 } from './constants/grammar.js'

// Copyright (c) 2020 Nathaniel Wroblewski
// I am making my contributions/submissions to this project solely in my personal
// capacity and am not conveying any rights to any intellectual property of any
// third parties.

const canvas = document.querySelector('.canvas')
const context = canvas.getContext('2d')
const { sin, cos } = Math

const perspective = FourByFour.identity()
  .rotX(angles.toRadians(-20))

const camera = new Camera({
  position: Vector.zeroes(),
  direction: Vector.zeroes(),
  up: Vector.from([0, 1, 0]),
  width: canvas.width,
  height: canvas.height,
  zoom: ZOOM
})

const TILE_VERTICES = [
  Vector.from([ 1,  0.3,  1]),
  Vector.from([-1,  0.3,  1]),
  Vector.from([ 1, -0.3,  1]),
  Vector.from([-1, -0.3,  1]),
  Vector.from([ 1,  0.3, -1]),
  Vector.from([-1,  0.3, -1]),
  Vector.from([ 1, -0.3, -1]),
  Vector.from([-1, -0.3, -1]),
]

const tiles = []

grid({ from: Vector.from([-2, -2]), to: Vector.from([2, 2]), by: Vector.from([1, 1]) }, ([x, z]) => {
  tiles.push(TILE_VERTICES.map(vertex => Vector.from([x * 2 * SCALE + SCALE, 0, z * 2 * SCALE + SCALE]).add(vertex.multiply(SCALE))))
})

const iterations = new Array(ITERATIONS).fill(0)

const Lsystem = iterations.reduce((memo, element) => {
  return memo.replace(/\w/g, character => RULES[character] || character)
}, AXIOM)

const α = angles.toRadians(ANGLE)

const walk = (system, handlers) => {
  const stack = []
  const coordinates = []
  let Δposition = Vector.from([0, DISTANCE, 0])
  let state = {
    headings: Vector.zeroes(), // H heading, L left, U up
    position: Vector.zeroes(), // x, y, z
    geometry: [Vector.zeroes()],
    rotations: Vector.from([false, false, false]), // RH, RL, RU
    color: 0
  }

  for (let index = 0, len = system.length; index < len; index++) {
    switch (system[index]) {
      case TURN_LEFT:
        state.headings[2] = state.headings[2] + α
        state.rotations[2] = true
        break;
      case TURN_RIGHT:
        state.headings[2] = state.headings[2] - α
        state.rotations[2] = true
        break;
      case PITCH_DOWN:
        state.headings[1] = state.headings[1] + α
        state.rotations[1] = true
        break;
      case PITCH_UP:
        state.headings[1] = state.headings[1] - α
        state.rotations[1] = true
        break;
      case ROLL_LEFT:
        state.headings[0] = state.headings[0] + α
        state.rotations[0] = true
        break;
      case ROLL_RIGHT:
        state.headings[0] = state.headings[0] - α
        state.rotations[0] = true
        break;
      case TURN_AROUND:
        state.headings[2] = state.headings[2] + Math.PI
        state.rotations[2] = true
        break;
      case START_BRANCH:
        stack.push({
          headings: state.headings.slice(),
          position: state.position.slice(),
          geometry: state.geometry.slice(),
          rotations: state.rotations.slice(),
          color: state.color,
        })
        state.geometry = [state.position]
        break;
      case END_BRANCH:
        if (state.geometry.length > 1) {
          coordinates.push(state.geometry)
        }
        state = stack.pop()
        break;
      case NEXT_COLOR:
        state.color = state.color + 1
        break;
      case FORWARD:
      case FORWARD_NO_LINE:
        Δposition = Vector.from([0, DISTANCE, 0])
        const next = system[index + 1]
        const { H, L, U } = state.headings

        if (state.rotations[2]) {
          const { x, y } = Δposition
          Δposition[0] = (x * cos(U)) + (y * -sin(U))
          Δposition[1] = (x * sin(U)) + (y * cos(U))
        }

        if (state.rotations[1]) {
          const { x, z } = Δposition
          Δposition[0] = (x * cos(L)) + (z * sin(L))
          Δposition[2] = (x * -sin(L)) + (z * cos(L))
        }

        if (state.rotations[0]) {
          const { y, z } = Δposition
          Δposition[1] = (y * cos(H)) + (z * sin(H))
          Δposition[2] = (y * -sin(H)) + (z * cos(H))
        }

        handlers[system[index]](state.position, state.position.add(Δposition), state.color)
        state.position = state.position.add(Δposition)
        state.geometry.push(state.position)
        break;
      case START_POLYGON:
      case END_POLYGON:
        handlers[system[index]](state.position, state.color)
        break;
    }
  }

  coordinates.push(state.geometry)

  return coordinates
}

const tree = []
let polygon = []

const offset = Vector.from([0, -12.5, 0])
const handlers = {
  [FORWARD]: (from, to, color) => {
    tree.push({
      type: 'line',
      center: to.add(to.subtract(from).divide(2)),
      vertices: [
        from.add(offset),
        to.add(offset)
      ],
      stroke: COLORS[color % COLORS.length],
      fill: null,
      opacity: 1
    })
  },
  [FORWARD_NO_LINE]: (from, to, color) => {
    polygon.push(to.add(offset))
  },
  [START_POLYGON]: position => {
    polygon = [position.add(offset)]
  },
  [END_POLYGON]: (_, color) => {
    const hex = COLORS[color % COLORS.length]

    polygon.push(polygon[0])

    tree.push({
      type: 'polygon',
      center: polygon[0].add(polygon[0].subtract(polygon[2]).divide(2)),
      vertices: polygon,
      stroke: hex,
      fill: hex === LEAF ? null : hex,
      opacity: 1
    })
  }
}

walk(Lsystem, handlers)

let time = 0

const renderComparator = (a, b, campos) => {
  const a0 = campos.subtract(a.center.transform(perspective))
  const b0 = campos.subtract(b.center.transform(perspective))

  if (a0.z < b0.z) return -1
  if (a0.z > b0.z) return 1
  if (a0.y < b0.y) return -1
  if (a0.y > b0.y) return 1
  if (a0.x < b0.x) return -1
  if (a0.x > b0.x) return 1

  return 0
}

let campos = Vector.from([0, 50, -100]).transform(perspective)
let θtotal = 0
let Δθ = 0.2

let fallen = []

const render = () => {
  if (θtotal > 180) {
    θtotal = 180
    Δθ = -Δθ
  } else if (θtotal < 0) {
    θtotal = 0
    Δθ = -Δθ
  }

  θtotal += Δθ

  context.clearRect(0, 0, canvas.width, canvas.height)
  perspective.rotY(angles.toRadians(Δθ))

  if (fallen.length < MAX_FALLEN && Math.random() < FALLEN_CHANCE) {
    const leaf = sample(tree.filter(obj => obj.stroke === LEAF))

    fallen.push({ ...leaf, opacity: 1 })
  }

  fallen = fallen.filter(leaf => leaf.opacity > OPACITY_THRESHOLD)

  fallen.forEach(leaf => {
    const Δposition = Vector.from([WIND, GRAVITY, 0])

    leaf.center = leaf.center.subtract(Δposition)
    leaf.vertices = leaf.vertices.map(vertex => vertex.subtract(Δposition).rotateAround(leaf.center, [0, 1, 0], angles.toRadians(TWIRL)))
    leaf.opacity = leaf.opacity - ΔOPACITY
  })

  const objects = tree.slice().concat(fallen)
  const tilesToRender = tiles.map(tile => {
    const translation = -14 + noise(tile[0].x * 2 * SCALE * FREQUENCY, tile[0].y * tile[0].z * 2 * SCALE * FREQUENCY, time * FREQUENCY) * AMPLITUDE
    const translated = tile.map(vertex => vertex.add(Vector.from([0, translation, 0])))
    const center = translated[0].add(translated[0].subtract(translated[3]).divide(2))

    CUBE_FACES.forEach(face => {
      objects.push({
        type: 'polygon',
        center,
        vertices: face.map(index => translated[index]),
        fill: BACKGROUND,
        stroke: TILE
      })
    })
  })

  const transformedObjects = objects.map(obj => ({
    ...obj, vertices: obj.vertices.map(vertex => vertex.transform(perspective))
  }))

  stableSort(transformedObjects, (a, b) => renderComparator(a, b, campos)).forEach(obj => {
    const projected = obj.vertices.map(vertex => camera.project(vertex))

    switch (obj.type) {
      case 'polygon':
        return renderPolygon(context, projected, obj.stroke, obj.fill, 1, obj.opacity)
      case 'line':
        return renderLine(context, projected[0], projected[1], obj.stroke, 1)
    }
  })

  time += Δt
}

context.shadowBlur = BLUR

seed(Math.random())

let prevTick = 0

const step = () => {
  window.requestAnimationFrame(step)

  const now = Math.round(FPS * Date.now() / 1000)
  if (now === prevTick) return
  prevTick = now

  render()
}

step()
