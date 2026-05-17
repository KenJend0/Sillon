type Props = {
  ratings: (number | null)[];
};

export default function RatingDistribution({ ratings }: Props) {
  const counts = Array(10).fill(0) as number[];
  let total = 0;

  ratings.forEach((r) => {
    if (r !== null && r >= 1 && r <= 10) {
      counts[Math.round(r) - 1]++;
      total++;
    }
  });

  if (total === 0) return null;

  const max = Math.max(...counts);

  return (
    <div>
      <p className="text-[11px] font-semibold text-text-tertiary uppercase tracking-wider mb-4">
        Mes notes
      </p>
      <div className="flex items-end gap-[3px]" style={{ height: "48px" }}>
        {counts.map((count, i) => {
          const heightPct = max > 0 ? (count / max) * 100 : 0;
          const opacity = count > 0 ? 0.25 + (heightPct / 100) * 0.75 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end h-full">
              <div
                className="w-full rounded-[2px]"
                style={{
                  height: count > 0 ? `${Math.max(heightPct, 6)}%` : "0",
                  backgroundColor: "#8E6F5E",
                  opacity,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] text-text-disabled">1</span>
        <span className="text-[9px] text-text-disabled">10</span>
      </div>
      <p className="text-[11px] text-text-tertiary mt-2">
        {total} album{total > 1 ? "s" : ""} noté{total > 1 ? "s" : ""}
      </p>
    </div>
  );
}
