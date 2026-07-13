interface Point {
  year: number;
  price: number;
  source: string;
}

/**
 * A player's cost by year — a single-series magnitude-over-time bar chart.
 * One hue (brand), recessive baseline, direct value labels (few enough
 * points that labels beat a hover layer), text in ink/muted tokens rather
 * than the series color. Source (keeper vs drafted) rides along as a small
 * label, not a second color, to keep the series single-hue.
 */
export function KeeperCostChart({ points }: { points: Point[] }) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-muted">No draft or keeper history recorded.</p>
    );
  }

  const data = [...points].sort((a, b) => a.year - b.year);
  const maxPrice = Math.max(...data.map((d) => d.price), 1);

  const W = Math.max(360, data.length * 64);
  const H = 220;
  const padX = 24;
  const padTop = 28; // room for value labels
  const padBottom = 40; // room for year + source labels
  const plotW = W - padX * 2;
  const plotH = H - padTop - padBottom;
  const slot = plotW / data.length;
  const barW = Math.min(40, slot * 0.55);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: W, height: "auto" }}
        role="img"
        aria-label="Keeper cost by year"
      >
        {/* baseline */}
        <line
          x1={padX}
          y1={padTop + plotH}
          x2={W - padX}
          y2={padTop + plotH}
          stroke="var(--color-line)"
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const h = (d.price / maxPrice) * plotH;
          const x = padX + slot * i + (slot - barW) / 2;
          const y = padTop + plotH - h;
          const isKeeper = d.source === "keeper";
          return (
            <g key={d.year}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 2)}
                rx={4}
                fill="var(--color-brand)"
                opacity={isKeeper ? 1 : 0.5}
              />
              {/* value label */}
              <text
                x={x + barW / 2}
                y={y - 8}
                textAnchor="middle"
                fill="var(--color-ink)"
                fontSize={13}
                fontFamily="var(--font-mono)"
              >
                ${d.price}
              </text>
              {/* year */}
              <text
                x={x + barW / 2}
                y={padTop + plotH + 18}
                textAnchor="middle"
                fill="var(--color-muted)"
                fontSize={12}
                fontFamily="var(--font-mono)"
              >
                {d.year}
              </text>
              {/* source */}
              <text
                x={x + barW / 2}
                y={padTop + plotH + 33}
                textAnchor="middle"
                fill="var(--color-muted)"
                fontSize={10}
              >
                {d.source}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-brand" /> Kept
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-brand opacity-50" /> Drafted /
          waiver
        </span>
      </div>
    </div>
  );
}
