import './global.css';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';

try { SplashScreen.preventAutoHideAsync(); } catch {}

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('./assets/fonts/SpaceMono-Regular.ttf'),
  });

  React.useEffect(() => {
    // Hide splash screen once fonts are ready (or after timeout fallback)
    if (fontsLoaded) {
      try { SplashScreen.hideAsync(); } catch {}
    }
  }, [fontsLoaded]);

  // Don't block rendering on web — fonts load async but layout still works
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
