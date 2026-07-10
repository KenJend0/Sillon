import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { labelStyle, metaStyle } from '../../lib/typography';

/** Miroir de components/legal/LegalSection.tsx (web). */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-8">
      <Text className="text-text-tertiary uppercase mb-3" style={[labelStyle, { letterSpacing: 1.3 }]}>
        {title}
      </Text>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}

export function LegalParagraph({ children }: { children: ReactNode }) {
  return (
    <Text className="text-text-secondary" style={[metaStyle, { lineHeight: 21 }]}>
      {children}
    </Text>
  );
}
