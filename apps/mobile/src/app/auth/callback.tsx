import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { supabase } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    async function handleCallback() {
      if (!code) {
        router.replace('/auth');
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Auth callback error:', error);
        router.replace('/auth');
        return;
      }

      router.replace('/');
    }

    handleCallback();
  }, [code]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator />
    </View>
  );
}
