import { ActivityIndicator, Image, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

export default function LoadingView({ label = 'Loading…' }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }}>
      <Image
        source={require('../../assets/icon.png')}
        style={{ width: 56, height: 56, borderRadius: 14, marginBottom: spacing.m }}
      />
      <ActivityIndicator color={colors.red} size="large" />
      <Text style={{ color: colors.muted, marginTop: spacing.s, fontSize: 13 }}>{label}</Text>
    </View>
  );
}
