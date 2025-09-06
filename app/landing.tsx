
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function LandingScreen() {
	const router = useRouter();
	const [loading, setLoading] = useState(true);

		useEffect(() => {
			// Check if user has already seen the landing page
			AsyncStorage.getItem('hasSeenLanding').then((value) => {
				if (value === 'true') {
					router.replace('/login');
				} else {
					setLoading(false);
				}
			});
		}, [router]);

	const handleGetStarted = async () => {
		await AsyncStorage.setItem('hasSeenLanding', 'true');
		router.replace('/login');
	};

	if (loading) {
		return (
			<View style={styles.container}>
				<ActivityIndicator size="large" color={Colors.light.tint} />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Welcome to Muse</Text>
			<Text style={styles.subtitle}>Your creative journey starts here.</Text>
			<TouchableOpacity style={styles.button} onPress={handleGetStarted}>
				<Text style={styles.buttonText}>Get Started</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: Colors.light.background,
		padding: 24,
	},
	title: {
		fontSize: 32,
		fontWeight: 'bold',
		color: Colors.light.tint,
		marginBottom: 12,
	},
	subtitle: {
		fontSize: 18,
		color: Colors.light.text,
		marginBottom: 32,
		textAlign: 'center',
	},
	button: {
		backgroundColor: Colors.light.tint,
		paddingVertical: 12,
		paddingHorizontal: 32,
		borderRadius: 8,
		marginBottom: 16,
	},
	secondaryButton: {
		backgroundColor: '#222',
	},
	buttonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
	},
});
