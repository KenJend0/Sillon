import { Text } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Text as SvgText, TSpan } from 'react-native-svg';
import { buildFamilyWeights } from '../../../lib/stats-dimensions';
import type { StatsGenreEntry } from '../../../lib/profile-stats';
import { StatsCard, StatsEmptyState } from './StatsCard';

type Props = { genreData: StatsGenreEntry[] };

const CX = 180;
const CY = 170;
const R = 120;
const LABEL_R = 152;

function polarPoint(axisIndex: number, n: number, value: number) {
  const angle = (axisIndex * (360 / n) - 90) * (Math.PI / 180);
  return { x: CX + value * R * Math.cos(angle), y: CY + value * R * Math.sin(angle) };
}

function gridPolygonPath(n: number, value: number) {
  return Array.from({ length: n }, (_, i) => {
    const p = polarPoint(i, n, value);
    return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }).join(' ') + ' Z';
}

function splitLabel(label: string): [string, string | null] {
  const idx = label.indexOf(' / ');
  if (idx !== -1) return [label.slice(0, idx), label.slice(idx + 3)];
  return [label, null];
}

/** Miroir de ProfileStatsEmpreinte (web) — radar des familles de genres, react-native-svg. */
export default function ProfileStatsEmpreinte({ genreData }: Props) {
  const families = buildFamilyWeights(genreData).slice(0, 6);
  const n = families.length;
  const hasData = n >= 3;

  const maxWeight = hasData ? Math.max(...families.map((f) => f.weight)) : 1;
  const scores = families.map((f) => f.weight / maxWeight);

  const polygonPoints = families
    .map((_, i) => {
      const p = polarPoint(i, n, scores[i]);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <StatsCard
      title={<>Ton <Text style={{ fontStyle: 'italic', color: '#5C4538' }}>empreinte</Text></>}
      subtitle="Tes genres dominants, pondérés par le nombre d'albums"
    >
      {!hasData ? (
        <StatsEmptyState>Pas assez de données genre pour l'instant.</StatsEmptyState>
      ) : (
        <Svg viewBox="-20 -20 400 380" width="100%" height={280}>
          {[0.25, 0.5, 0.75, 1].map((v) => (
            <Path
              key={v}
              d={gridPolygonPath(n, v)}
              fill="none"
              stroke="#D4C9B0"
              strokeWidth={v === 1 ? 1.5 : 1}
              strokeDasharray={v < 1 ? '4 4' : undefined}
              opacity={0.55}
            />
          ))}

          {families.map((_, i) => {
            const outer = polarPoint(i, n, 1);
            return (
              <Line key={i} x1={CX} y1={CY} x2={outer.x} y2={outer.y} stroke="#D4C9B0" strokeWidth={1} opacity={0.45} />
            );
          })}

          <Polygon points={polygonPoints} fill="#B08D57" fillOpacity={0.2} stroke="#8B6914" strokeWidth={2} strokeLinejoin="round" />

          {families.map((_, i) => {
            const p = polarPoint(i, n, scores[i]);
            return <Circle key={i} cx={p.x} cy={p.y} r={4.5} fill="#8B6914" stroke="#FAF8F4" strokeWidth={1.5} />;
          })}

          {families.map((f, i) => {
            const p = polarPoint(i, n, LABEL_R / R);
            const [line1, line2] = splitLabel(f.label);
            return (
              <SvgText key={f.slug} x={p.x} y={p.y} textAnchor="middle" fontSize={10} fill="#6B5D45" fontWeight="500">
                {line2 ? (
                  <>
                    <TSpan x={p.x} dy={-6}>{line1}</TSpan>
                    <TSpan x={p.x} dy={13}>{line2}</TSpan>
                  </>
                ) : (
                  line1
                )}
              </SvgText>
            );
          })}
        </Svg>
      )}
    </StatsCard>
  );
}
