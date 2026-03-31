import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '../constants';

interface DemoBadgeProps {
  inline?: boolean;
}

export function DemoBadge({ inline = false }: DemoBadgeProps) {
  return (
    <View
      style={{
        backgroundColor: Colors.warningDim,
        borderWidth: 1,
        borderColor: Colors.warning,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: inline ? undefined : 'center',
      }}
    >
      <Text
        style={{
          color: Colors.warning,
          fontSize: 10,
          fontFamily: 'SpaceMono',
          letterSpacing: 1.5,
        }}
      >
        DEMO MODE
      </Text>
    </View>
  );
}
