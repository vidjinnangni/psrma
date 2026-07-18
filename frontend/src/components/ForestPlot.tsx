type ForestStudy = {
  label: string
  display_effect: number
  display_ci_low: number
  display_ci_high: number
  weight_pct: number
}

type ForestPooled = {
  display_effect: number
  display_ci_low: number
  display_ci_high: number
}

const LABEL_WIDTH = 200
const PLOT_WIDTH = 320
const RIGHT_WIDTH = 170
const ROW_HEIGHT = 34
const TOP_MARGIN = 16
const AXIS_HEIGHT = 34
const GAP_BEFORE_POOLED = 14

export default function ForestPlot({
  studies,
  pooled,
  measure,
}: {
  studies: ForestStudy[]
  pooled: ForestPooled
  measure: string
}) {
  const isRatio = measure === 'OR' || measure === 'RR'
  const toPlot = (v: number) => (isRatio ? Math.log(v) : v)
  const fromPlot = (v: number) => (isRatio ? Math.exp(v) : v)

  const allValues = [
    ...studies.flatMap((s) => [toPlot(s.display_ci_low), toPlot(s.display_ci_high)]),
    toPlot(pooled.display_ci_low),
    toPlot(pooled.display_ci_high),
    0,
  ]
  const rawMin = Math.min(...allValues)
  const rawMax = Math.max(...allValues)
  const pad = (rawMax - rawMin) * 0.12 || 1
  const domainMin = rawMin - pad
  const domainMax = rawMax + pad

  const scaleX = (v: number) => ((v - domainMin) / (domainMax - domainMin)) * PLOT_WIDTH

  const pooledY = TOP_MARGIN + studies.length * ROW_HEIGHT + GAP_BEFORE_POOLED + ROW_HEIGHT / 2
  const axisY = pooledY + ROW_HEIGHT / 2 + 16
  const totalHeight = axisY + AXIS_HEIGHT
  const totalWidth = LABEL_WIDTH + PLOT_WIDTH + RIGHT_WIDTH

  const ticks = Array.from({ length: 5 }, (_, i) => domainMin + ((domainMax - domainMin) * i) / 4)

  const fmt = (v: number) => (isRatio ? v.toFixed(2) : v.toFixed(2))

  return (
    <svg
      width={totalWidth}
      height={totalHeight}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className="max-w-full"
    >
      {/* reference line */}
      <line
        x1={LABEL_WIDTH + scaleX(0)}
        x2={LABEL_WIDTH + scaleX(0)}
        y1={TOP_MARGIN - 6}
        y2={axisY}
        style={{ stroke: 'var(--color-line)' }}
        strokeDasharray="3 3"
      />

      {studies.map((s, i) => {
        const y = TOP_MARGIN + i * ROW_HEIGHT + ROW_HEIGHT / 2
        const x1 = LABEL_WIDTH + scaleX(toPlot(s.display_ci_low))
        const x2 = LABEL_WIDTH + scaleX(toPlot(s.display_ci_high))
        const xEffect = LABEL_WIDTH + scaleX(toPlot(s.display_effect))
        const boxSize = Math.min(16, Math.max(6, 4 + s.weight_pct * 0.35))
        return (
          <g key={i}>
            <text x={0} y={y + 4} className="fill-ink text-[12px]">
              {s.label.length > 28 ? `${s.label.slice(0, 27)}…` : s.label}
            </text>
            <line x1={x1} x2={x2} y1={y} y2={y} style={{ stroke: 'var(--color-muted)' }} strokeWidth={1.5} />
            <rect
              x={xEffect - boxSize / 2}
              y={y - boxSize / 2}
              width={boxSize}
              height={boxSize}
              className="fill-ink"
            />
            <text x={LABEL_WIDTH + PLOT_WIDTH + 12} y={y + 4} className="fill-ink text-[12px]">
              {fmt(s.display_effect)} [{fmt(s.display_ci_low)}, {fmt(s.display_ci_high)}]
            </text>
          </g>
        )
      })}

      {/* pooled diamond */}
      {(() => {
        const xLow = LABEL_WIDTH + scaleX(toPlot(pooled.display_ci_low))
        const xHigh = LABEL_WIDTH + scaleX(toPlot(pooled.display_ci_high))
        const xEffect = LABEL_WIDTH + scaleX(toPlot(pooled.display_effect))
        const half = 7
        return (
          <g>
            <text x={0} y={pooledY + 4} className="fill-ink text-[12px] font-medium">
              Effet combiné
            </text>
            <polygon
              points={`${xLow},${pooledY} ${xEffect},${pooledY - half} ${xHigh},${pooledY} ${xEffect},${pooledY + half}`}
              className="fill-accent"
            />
            <text x={LABEL_WIDTH + PLOT_WIDTH + 12} y={pooledY + 4} className="fill-ink text-[12px] font-medium">
              {fmt(pooled.display_effect)} [{fmt(pooled.display_ci_low)}, {fmt(pooled.display_ci_high)}]
            </text>
          </g>
        )
      })()}

      {/* axis */}
      <line
        x1={LABEL_WIDTH}
        x2={LABEL_WIDTH + PLOT_WIDTH}
        y1={axisY}
        y2={axisY}
        style={{ stroke: 'var(--color-line)' }}
      />
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={LABEL_WIDTH + scaleX(t)}
            x2={LABEL_WIDTH + scaleX(t)}
            y1={axisY}
            y2={axisY + 4}
            style={{ stroke: 'var(--color-line)' }}
          />
          <text
            x={LABEL_WIDTH + scaleX(t)}
            y={axisY + 16}
            textAnchor="middle"
            className="fill-muted text-[11px]"
          >
            {fromPlot(t).toFixed(isRatio ? 2 : 1)}
          </text>
        </g>
      ))}
    </svg>
  )
}
