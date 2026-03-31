import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type TouchableOpacityProps,
} from 'react-native';
import { Colors } from '../constants';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function PrimaryButton({
  title,
  loading = false,
  variant = 'primary',
  size = 'md',
  disabled,
  style,
  ...rest
}: PrimaryButtonProps) {
  const bgColors = {
    primary: Colors.primary,
    danger: Colors.warning,
    ghost: 'transparent',
  };

  const textColors = {
    primary: Colors.background,
    danger: Colors.text,
    ghost: Colors.primary,
  };

  const paddings = { sm: 10, md: 14, lg: 18 };
  const fontSizes = { sm: 12, md: 14, lg: 16 };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      style={[
        {
          backgroundColor: bgColors[variant],
          paddingVertical: paddings[size],
          paddingHorizontal: 20,
          borderRadius: 6,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: variant === 'ghost' ? Colors.primary : undefined,
          opacity: isDisabled ? 0.5 : 1,
        },
        style as object,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} size="small" />
      ) : (
        <Text
          style={{
            color: textColors[variant],
            fontSize: fontSizes[size],
            fontFamily: 'SpaceMono',
            fontWeight: '600',
            letterSpacing: 0.5,
          }}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
