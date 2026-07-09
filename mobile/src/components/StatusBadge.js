import { Text, View } from 'react-native';
import { colors } from '../theme';

const STYLES = {
  pending:   { bg: '#f5f0e0', fg: '#7a6200' },
  paid:      { bg: colors.navySoft, fg: colors.navy },
  shipped:   { bg: '#e3ecfa', fg: colors.navy },
  delivered: { bg: '#e7f0e9', fg: '#1b4332' },
  cancelled: { bg: colors.redSoft, fg: colors.red },
  open:      { bg: '#f5f0e0', fg: '#7a6200' },
  answered:  { bg: '#e7f0e9', fg: '#1b4332' },
  closed:    { bg: colors.line, fg: colors.muted },
};

export default function StatusBadge({ status }) {
  const s = STYLES[status] || STYLES.closed;
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ color: s.fg, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }}>{status}</Text>
    </View>
  );
}
