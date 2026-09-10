import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    const handleUrl = async (url: string) => {
      console.log('AUTH CALLBACK URL:', url);

      const parsed = Linking.parse(url);

      console.log('AUTH CALLBACK PARAMS:', parsed.queryParams);

      const code = parsed.queryParams?.code;

      if (typeof code !== 'string') {
        setMessage('No authentication code found.');
        return;
      }

      const { error } =
        await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Auth callback error:', error);
        setMessage(`Authentication failed: ${error.message}`);
        return;
      }

      console.log('AUTH SUCCESS');
      setMessage('You are signed in!');
    };

    const subscription = Linking.addEventListener(
      'url',
      ({ url }) => {
        handleUrl(url);
      }
    );

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <ActivityIndicator />

      <Text style={{ marginTop: 16 }}>
        {message}
      </Text>
    </View>
  );
}
