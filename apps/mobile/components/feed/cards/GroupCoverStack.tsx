import { View } from 'react-native';
import { Disc3 } from 'lucide-react-native';
import { CoverImage } from '../../album/CoverImage';
import type { ListenGroupItem } from '../groupFeedEvents';

function GroupCover({ src, size, iconSize }: { src?: string | null; size: number; iconSize: number }) {
  const placeholder = (
    <View className="w-full h-full bg-background-tertiary items-center justify-center">
      <Disc3 size={iconSize} color="#BDBDBD" />
    </View>
  );

  if (!src) return placeholder;

  return (
    <CoverImage
      src={src}
      style={{ width: size, height: size }}
      placeholder={placeholder}
    />
  );
}

/** Pile de covers en éventail — miroir de ListenGroupCoverStack (web). */
export function GroupCoverStack({ items }: { items: ListenGroupItem[] }) {
  const shown = items.slice(0, 3);

  return (
    <View style={{ width: 44, height: 52 }}>
      {shown.map((item, index) => (
        <View
          key={item.id}
          className="absolute rounded-cover-sm overflow-hidden bg-background-secondary border border-background"
          style={{ width: 44, height: 44, right: 0, top: index * 4, zIndex: shown.length - index }}
        >
          <GroupCover src={item.coverUrl} size={44} iconSize={16} />
          {index > 0 && (
            <View
              className="absolute inset-0"
              style={{ backgroundColor: `rgba(28,28,28,${0.05 * index})` }}
            />
          )}
        </View>
      ))}
    </View>
  );
}

