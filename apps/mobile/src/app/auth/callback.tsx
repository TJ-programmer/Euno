import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { supabase } from '@/lib/supabase';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { completeOnboarding } from "@/lib/onboarding";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();

  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    console.log('AUTH CALLBACK PARAMS:', params);

    const handleCallback = async () => {
      if (params.error) {
        console.error('AUTH CALLBACK ERROR:', params.error);
        console.error(
          'AUTH CALLBACK DESCRIPTION:',
          params.error_description
        );

        setMessage(
          params.error_description ?? 'Authentication failed.'
        );

        return;
      }

      if (!params.code) {
        console.error('NO AUTH CODE FOUND');
        setMessage('No authentication code found.');
        return;
      }

      console.log('AUTH CODE FOUND');

      const { data, error } =
        await supabase.auth.exchangeCodeForSession(params.code);

      if (error) {
        console.error('AUTH EXCHANGE ERROR:', error);
        setMessage(`Authentication failed: ${error.message}`);
        return;
      }

      console.log('AUTH SUCCESS:', data.session?.user?.id);
      
      const stored = await AsyncStorage.getItem("@euno/onboarding");

      if (stored) {
  	const onboarding = JSON.parse(stored);

  	console.log("SAVING ONBOARDING:", onboarding);

  	await completeOnboarding(
    		data.session.user.id,
    		onboarding
  	);

  	await AsyncStorage.removeItem("@euno/onboarding");

  	console.log("ONBOARDING SAVED");
      }
      setMessage('You are signed in!');

      // For now, go back to the main app.
      setTimeout(() => {
        router.replace('/');
      }, 500);
    };

    handleCallback();
  }, [params.code, params.error, params.error_description]);

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
