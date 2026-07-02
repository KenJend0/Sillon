import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type Line = { content: ReactNode; style: object };

type Props = {
  context: ReactNode;
  title?: ReactNode | null;
  artist?: ReactNode | null;
  time: string;
};

const contextStyle = { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#9A9A9A' };
const titleStyle = { fontSize: 14, fontFamily: 'InstrumentSerif_400Regular', color: '#2A2520', marginTop: 2 };
const artistStyle = { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#9A9A9A', marginTop: 2 };

/** Empile context / titre / artiste-extrait sur 1 à 3 lignes, l'heure suit la dernière. */
export function FeedTextLines({ context, title, artist, time }: Props) {
  const lines: Line[] = [{ content: context, style: contextStyle }];
  if (title) lines.push({ content: title, style: titleStyle });
  if (artist) lines.push({ content: artist, style: artistStyle });

  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      {lines.map((line, i) => {
        const isLast = i === lines.length - 1;
        return (
          <Text key={i} numberOfLines={1} style={line.style}>
            {line.content}
            {isLast && !!time && <Text style={{ color: '#BDBDBD' }}> · {time}</Text>}
          </Text>
        );
      })}
    </View>
  );
}
