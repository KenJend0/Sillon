import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { MoreHorizontal, Ban, CircleSlash } from 'lucide-react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { showToast } from '../ui/Toast';
import { toggleBlock } from '../../lib/social';
import { metaStyle, metaMediumStyle, labelStyle } from '../../lib/typography';

type Props = {
  userId: string;
  initialIsBlocking: boolean;
  onBlockChange?: (blocking: boolean) => void;
};

/** Miroir de ProfileActionsMenu (web) — menu 3 points avec bloquer/débloquer, dans un BottomSheet. */
export function ProfileActionsMenu({ userId, initialIsBlocking, onBlockChange }: Props) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isBlocking, setIsBlocking] = useState(initialIsBlocking);
  const [loading, setLoading] = useState(false);

  const handleBlockPress = () => {
    if (isBlocking) {
      handleConfirm();
    } else {
      setConfirming(true);
    }
  };

  const handleConfirm = async () => {
    setOpen(false);
    setConfirming(false);
    setLoading(true);
    try {
      const result = await toggleBlock(userId);
      if (result.success) {
        setIsBlocking(result.blocking ?? false);
        onBlockChange?.(result.blocking ?? false);
        showToast(result.blocking ? 'Utilisateur bloqué' : 'Utilisateur débloqué', 'success');
      } else {
        showToast(result.error ?? 'Une erreur est survenue', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={loading}
        hitSlop={8}
        className="w-9 h-9 rounded-input items-center justify-center"
        style={{ opacity: loading ? 0.6 : 1 }}
      >
        {loading ? <ActivityIndicator size="small" color="#9A9A9A" /> : <MoreHorizontal size={18} color="#9A9A9A" />}
      </Pressable>

      <BottomSheet isOpen={open && !confirming} onClose={() => setOpen(false)} title="Options" snapPoint="25%">
        <View className="px-6 py-2">
          <Pressable onPress={handleBlockPress} className="flex-row items-center gap-2.5 py-3">
            {isBlocking ? <CircleSlash size={15} color="#6B6B6B" /> : <Ban size={15} color="#C86C6C" />}
            <Text className={isBlocking ? 'text-text-secondary' : 'text-[#C86C6C]'} style={metaStyle}>
              {isBlocking ? 'Débloquer' : 'Bloquer'}
            </Text>
          </Pressable>
        </View>
      </BottomSheet>

      <BottomSheet isOpen={confirming} onClose={() => setConfirming(false)} title="Bloquer ?" snapPoint="30%">
        <View className="px-6 py-4">
          <Text className="text-text-primary mb-5" style={labelStyle}>
            Son contenu disparaîtra de ton feed et il ne pourra plus te suivre.
          </Text>
          <View className="flex-row gap-2">
            <Pressable onPress={() => setConfirming(false)} className="flex-1 bg-background-secondary rounded-button py-2.5 items-center">
              <Text className="text-text-primary" style={metaStyle}>Annuler</Text>
            </Pressable>
            <Pressable onPress={handleConfirm} className="flex-1 bg-[#C86C6C] rounded-button py-2.5 items-center">
              <Text className="text-[#F5F3EF]" style={metaMediumStyle}>Bloquer</Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </>
  );
}
