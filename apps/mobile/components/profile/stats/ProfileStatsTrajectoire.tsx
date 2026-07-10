import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import type { StatsEntry } from '../../../lib/profile-stats';
import { StatsCard, StatsEmptyState } from './StatsCard';

type Props = { entries: StatsEntry[] };

type Dot = {
  x: number;
  y: number;
  rating: number;
  album_title: string;
  artist_name: string;
  listened_at: string;
};

const W = 340;
const H = 200;
const PAD = { top: 16, right: 20, bottom: 32, left: 32 };
const DOT_R = 4.5;

function ratingColor(r: number): string {
  if (r <= 3) return '#C86C6C';
  if (r <= 5) return '#C8A84B';
  if (r <= 7) return '#7BA67A';
  return '#3D7A3B';
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Miroir de ProfileStatsTrajectoire (web) — scatter plot, tooltip au tap (pas de hover en tactile). */
export default function ProfileStatsTrajectoire({ entries }: Props) {
  const [tooltip, setTooltip] = useState<Dot | null>(null);

  const { dots, xLabels } = useMemo(() => {
    const rated = entries.filter((e) => e.rating !== null && e.rating > 0);
    if (rated.length === 0) return { dots: [] as Dot[], xLabels: [] as { decade: number; x: number }[] };

    const sorted = [...rated].sort((a, b) => new Date(a.listened_at).getTime() - new Date(b.listened_at).getTime());
    const minTime = new Date(sorted[0].listened_at).getTime();
    const maxTime = new Date(sorted[sorted.length - 1].listened_at).getTime();
    const timeSpan = maxTime - minTime || 1;

    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;

    const ds: Dot[] = sorted.map((e, i) => {
      const t = new Date(e.listened_at).getTime();
      const jitter = ((i % 5) - 2) * 0.8;
      return {
        x: PAD.left + ((t - minTime) / timeSpan) * plotW + jitter,
        y: PAD.top + plotH - (e.rating! / 10) * plotH,
        rating: e.rating!,
        album_title: e.album_title,
        artist_name: e.artist_name,
        listened_at: e.listened_at,
      };
    });

    const minYear = new Date(minTime).getFullYear();
    const maxYear = new Date(maxTime).getFullYear();
    const firstDecade = Math.floor(minYear / 10) * 10;
    const decadeLabels: { decade: number; x: number }[] = [];
    for (let d = firstDecade; d <= maxYear + 10; d += 10) {
      const t = new Date(`${d}-01-01`).getTime();
      const x = PAD.left + ((t - minTime) / timeSpan) * plotW;
      if (x >= PAD.left - 4 && x <= W - PAD.right + 4) decadeLabels.push({ decade: d, x });
    }

    return { dots: ds, xLabels: decadeLabels };
  }, [entries]);

  const plotH = H - PAD.top - PAD.bottom;

  if (dots.length < 3) {
    return (
      <StatsCard title={<>Ta <Text style={{ fontStyle: 'italic', color: '#5C4538' }}>trajectoire</Text></>} subtitle="">
        <StatsEmptyState>Pas encore assez d'écoutes notées.</StatsEmptyState>
      </StatsCard>
    );
  }

  return (
    <StatsCard
      title={<>Ta <Text style={{ fontStyle: 'italic', color: '#5C4538' }}>trajectoire</Text></>}
      subtitle="Chaque point = un album noté, dans le temps"
    >
      <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={200}>
        {[0, 2, 4, 6, 8, 10].map((v) => {
          const y = PAD.top + plotH - (v / 10) * plotH;
          return (
            <G key={v}>
              <Line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#D4C9B0" strokeWidth={1} strokeDasharray="3 5" />
              <SvgText x={PAD.left - 5} y={y + 3} textAnchor="end" fontSize={8} fill="#A8956D">{v}</SvgText>
            </G>
          );
        })}

        {dots.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={DOT_R} fill={ratingColor(d.rating)} fillOpacity={0.75} onPress={() => setTooltip(d)} />
        ))}

        {xLabels.map(({ decade, x }) => (
          <SvgText key={decade} x={x} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={8} fill="#A8956D">{decade}s</SvgText>
        ))}
      </Svg>

      {tooltip && (
        <View className="bg-background border border-border rounded-button px-3 py-2 self-center -mt-2">
          <Text numberOfLines={1} className="text-text-primary" style={{ fontFamily: 'Inter_500Medium', fontSize: 11 }}>
            {tooltip.album_title}
          </Text>
          <Text className="text-text-tertiary" style={{ fontFamily: 'Inter_400Regular', fontSize: 10 }}>{tooltip.artist_name}</Text>
          <Text className="text-accent-deep" style={{ fontFamily: 'Inter_500Medium', fontSize: 10 }}>
            {tooltip.rating}/10 · {formatDate(tooltip.listened_at)}
          </Text>
        </View>
      )}
    </StatsCard>
  );
}
