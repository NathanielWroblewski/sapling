// Copyright (c) 2020 Nathaniel Wroblewski
// I am making my contributions/submissions to this project solely in my personal
// capacity and am not conveying any rights to any intellectual property of any
// third parties.

export const τ = 2 * Math.PI

export const BLUR = 2

export const ZOOM = 0.1

export const AXIOM = 'P'
export const ITERATIONS = 5
export const RULES = {
  P: 'I+[P+W]--<[--L]I[++L]-[PW]++PW', // plant
  I: 'FS[>&&L][<^^L]FS', // internode
  S: 'SFS', // segment
  L: '[#{+f-ff-f+|+f-ff-f}]', // leaf
  W: '[C##<D<<<<D<<<<D<<<<D<<<<D]', // flower
  C: 'FF', // pedicel
  D: '[#^F][{^^^^-f+f|-f+f}]' // wedge
}

export const DISTANCE = 0.72
export const ANGLE = 18

export const SCALE = 5

export const FREQUENCY = 0.2
export const AMPLITUDE = 3

export const CUBE_FACES = [
  [3, 2, 6, 7], // bottom
  [1, 3, 7, 5], // left
  [0, 1, 3, 2], // back
  [6, 7, 5, 4], // front
  [2, 6, 4, 0], // front left
  [0, 1, 5, 4], // top
]

export const MAX_FALLEN = 3
export const FALLEN_CHANCE = 0.05

export const ΔOPACITY = 0.02

export const GRAVITY = 0.5
export const WIND = 0.2
export const TWIRL = 10

export const Δt = 0.05

export const OPACITY_THRESHOLD = 0.05
export const FPS = 60
