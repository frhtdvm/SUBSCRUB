import React from 'react';
import { SafeAreaView, StatusBar, type ViewProps } from 'react-native';
import { Colors } from '../constants';

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
}

export function ScreenContainer({ children, style, ...rest }: ScreenContainerProps) {
  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor: Colors.background }, style as object]}
      {...rest}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      {children}
    </SafeAreaView>
  );
}
