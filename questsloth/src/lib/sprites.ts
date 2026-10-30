/**
 * Hand-drawn 16x16 pixel sprites, stored as character grids so they can be
 * recoloured at runtime (boss enrage) without shipping image assets.
 * Every row must be the same length; '.' is transparent.
 */

export type SpritePalette = Record<string, string>

export type PixelRun = {
  x: number
  y: number
  width: number
  fill: string
}

export const HERO_SPRITE = [
  '................',
  '......####......',
  '.....#AAAA#.....',
  '....#AAAAAA#....',
  '....#A#AA#A#....',
  '....#AAAAAA#....',
  '.....#AAAA#.....',
  '...#GGGGGGGG#...',
  '..#GGGGGGGGGG#..',
  '..#GG#AAAA#GG#..',
  '..#GG#ARRA#GG#..',
  '..#GGGGGGGGGG#..',
  '...#GGGGGGGG#...',
  '....#AA##AA#....',
  '....#AA##AA#....',
  '....#SS##SS#....',
] as const

export const HERO_PALETTE: SpritePalette = {
  '#': '#150f14',
  A: '#b9b2a2',
  G: '#2f6b4f',
  R: '#c45c26',
  S: '#4a4034',
}

export const BOSS_SPRITE = [
  '.##..........##.',
  '.##..........##.',
  '..##........##..',
  '...##......##...',
  '..############..',
  '.#BBBBBBBBBBBB#.',
  '#BBBBBBBBBBBBBB#',
  '#BBEEBBBBBBEEBB#',
  '#BBEEBBBBBBEEBB#',
  '#BBBBBBBBBBBBBB#',
  '#BBTMMMMMMMMTBB#',
  '#BBMMMMMMMMMMBB#',
  '#BBBBBBBBBBBBBB#',
  '.#BBBBBBBBBBBB#.',
  '..#BBB#..#BBB#..',
  '..####....####..',
] as const

export const BOSS_PALETTE: SpritePalette = {
  '#': '#170f1e',
  B: '#6b3a8c',
  E: '#f07a3c',
  M: '#2c1033',
  T: '#e8dcc4',
}

export const BOSS_PALETTE_ENRAGED: SpritePalette = {
  '#': '#170f1e',
  B: '#9c3b34',
  E: '#ffd75e',
  M: '#2a0c10',
  T: '#f5e6bf',
}

export const BOSS_GRID_WIDTH = BOSS_SPRITE[0].length
export const BOSS_GRID_HEIGHT = BOSS_SPRITE.length
export const HERO_GRID_WIDTH = HERO_SPRITE[0].length
export const HERO_GRID_HEIGHT = HERO_SPRITE.length

/**
 * Collapse each horizontal run of identical pixels into a single rect. Keeps
 * the SVG small enough for low-end phones (~250 rects becomes ~70).
 */
export function pixelRuns(grid: readonly string[], palette: SpritePalette): PixelRun[] {
  const runs: PixelRun[] = []

  grid.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const char = row[x]
      let end = x + 1
      while (end < row.length && row[end] === char) end += 1
      const fill = char === '.' ? undefined : palette[char]
      if (fill) runs.push({ x, y, width: end - x, fill })
      x = end
    }
  })

  return runs
}
