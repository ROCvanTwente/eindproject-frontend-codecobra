import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const fallbackBaseUrl = Platform.select({
  android: 'http://10.0.2.2:7199',
  ios: 'http://localhost:7199',
  default: 'http://localhost:7199',
});

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? fallbackBaseUrl;

export async function loginUser(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.title || 'Inloggen mislukt.');
  }

  const token = data.accessToken ?? data.token ?? data.access_token;
  if (token) {
    await AsyncStorage.setItem('token', token);
  }

  return data;
}

export async function registerUser(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data.message ||
      data.title ||
      (Array.isArray(data.errors) ? data.errors.join('\n') : '') ||
      'Registratie mislukt.';
    throw new Error(message);
  }

  return data;
}

export async function logoutUser() {
  await AsyncStorage.removeItem('token');
}
