import { Image } from 'react-native';

// npm install colorthief --save

// Placeholder fun
export const getDominantColor = async (imageUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    Image.getSize(
      imageUrl,
      (width, height) => {
        if (imageUrl.includes('black')) return resolve('#000000');
        if (imageUrl.includes('white')) return resolve('#FFFFFF');
        if (imageUrl.includes('hoodie')) return resolve('#d9d9d9');
        if (imageUrl.includes('tank-top')) return resolve('#333333');
        resolve('#d9d9d9');
      },
      (error) => {
        console.warn('Failed to get image size to determine dominant color:', error);
        resolve('#d9d9d9'); // Fallback to a safe light grey on error
      }
    );
  });
};

// Helper to determine if text should be dark or light based on background color
export const getContrastTextColor = (hexColor: string): 'black' | 'white' => {
  if (!hexColor || hexColor.length < 7) {
    return 'black';
  }
  const r = parseInt(hexColor.substring(1, 3), 16);
  const g = parseInt(hexColor.substring(3, 5), 16);
  const b = parseInt(hexColor.substring(5, 7), 16);
  const y = (r * 299 + g * 587 + b * 114) / 1000;
  return y >= 128 ? 'black' : 'white';
};