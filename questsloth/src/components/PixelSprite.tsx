import { useMemo } from 'react'
import { pixelRuns, type SpritePalette } from '../lib/sprites'

type PixelSpriteProps = {
  grid: readonly string[]
  palette: SpritePalette
  className?: string
}

/**
 * Renders a character-grid sprite as merged SVG rects. Decorative: the boss
 * name is always present as real text, so screen readers skip the artwork.
 */
export function PixelSprite({ grid, palette, className }: PixelSpriteProps) {
  const runs = useMemo(() => pixelRuns(grid, palette), [grid, palette])
  const width = grid[0]?.length ?? 0

  return (
    <svg
      viewBox={`0 0 ${width} ${grid.length}`}
      className={className}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      {runs.map((run) => (
        <rect
          key={`${run.x}-${run.y}-${run.width}`}
          x={run.x}
          y={run.y}
          width={run.width}
          height={1}
          fill={run.fill}
        />
      ))}
    </svg>
  )
}
