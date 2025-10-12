import React from 'react';
import { View, StyleSheet } from 'react-native';

interface ColorSwatchProps {
  color: string | null;
  size?: number;
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({ color, size = 16 }) => {
  // Expanded map for common color names to hex values
  const colorMap: { [key: string]: string } = {
    'white': '#FFFFFF',
    'black': '#000000',
    'natural': '#F0EAD6',
    'heather grey': '#C5C5C5',
    'sport grey': '#B0B0B0',
    'dark heather': '#6B6B6B',
    'navy': '#000080',
    'red': '#FF0000',
    'royal blue': '#4169E1',
    'bright royal': '#0078FF',
    'green': '#008000',
    'kelly green': '#4CBB17',
    'charcoal': '#36454F',
    'gold': '#FFD700',
    'maroon': '#800000',
    'ash': '#E0E0E0',
  };
  
  // Default to a light grey if color is null or not found
  let backgroundColor = '#CCCCCC';

  if (color) {
    // Use the provided color if it's a hex code, otherwise look it up in the map
    if (color.startsWith('#')) {
      backgroundColor = color;
    } else {
      backgroundColor = colorMap[color.toLowerCase()] || '#CCCCCC';
    }
  }

  return (
    <View style={[styles.swatch, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}>
      <View style={[styles.border, { borderRadius: size / 2 }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  swatch: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  border: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
});

export default ColorSwatch;