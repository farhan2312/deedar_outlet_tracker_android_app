import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';

/** The D-Drive mark — a delivery truck, on the translucent tile used over the
 * brand green. */
export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const box = size === 'lg' ? 'h-16 w-16 rounded-3xl' : size === 'md' ? 'h-10 w-10 rounded-2xl' : 'h-8 w-8 rounded-xl';
  const icon = size === 'lg' ? 34 : size === 'md' ? 22 : 18;
  return (
    <View className={`${box} items-center justify-center border border-white/20 bg-white/15`}>
      <MaterialCommunityIcons name="truck-delivery" size={icon} color="#fff" />
    </View>
  );
}
