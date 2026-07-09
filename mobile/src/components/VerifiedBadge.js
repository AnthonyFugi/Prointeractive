import { Text, View } from 'react-native';
import { colors } from '../theme';

export default function VerifiedBadge({ size = 16 }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.verifyBlue, alignItems: 'center', justifyContent: 'center',
      marginLeft: 4,
    }}>
      <Text style={{ color: '#fff', fontSize: size * 0.62, fontWeight: '900' }}>✓</Text>
    </View>
  );
}
