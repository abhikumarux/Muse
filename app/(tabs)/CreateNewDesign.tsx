import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { updateImageWithPrompt } from '../../api/imageApi'; // We will create this file next

export default function CreateNewDesign() {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Sorry, we need camera roll permissions to make this work!'
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleRemix = async () => {
    if (!image) {
      Alert.alert('No Image', 'Please select an image first.');
      return;
    }
    if (!prompt) {
      Alert.alert('No Prompt', 'Please enter a prompt to remix the image.');
      return;
    }

    setLoading(true);
    try {
      const newImageUri = await updateImageWithPrompt(image, prompt);
      setImage(newImageUri);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to remix the image.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DESIGN RESULTS</Text>

      <TouchableOpacity onPress={selectImage}>
        <View style={styles.imageContainer}>
          {image ? (
            <Image source={{ uri: image }} style={styles.image} />
          ) : (
            <Text>Tap to select an image</Text>
          )}
        </View>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Type your smart adjustments..."
        value={prompt}
        onChangeText={setPrompt}
      />
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={() => {}}>
          <Text style={styles.buttonText}>GET ARTWORK</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleRemix}>
          <Text style={styles.buttonText}>REMIX</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={() => {}}>
          <Text style={styles.buttonText}>SAVE DESIGN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => {}}>
          <Text style={styles.buttonText}>PHOTOSHOOT</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    paddingTop: 50,
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  imageContainer: {
    width: 300,
    height: 300,
    backgroundColor: 'grey',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 15,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  input: {
    backgroundColor: 'white',
    width: '80%',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    color: 'black',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
