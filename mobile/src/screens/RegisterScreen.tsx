import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { registerUser } from '../lib/auth';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

function validatePassword(password: string) {
  return {
    minLength: password.length >= 6,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(password),
  };
}

export default function RegisterScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rules = useMemo(() => validatePassword(password), [password]);
  const passwordIsValid = Object.values(rules).every(Boolean);

  const handleRegister = async () => {
    setLoading(true);
    setError('');

    if (!passwordIsValid) {
      setError('Wachtwoord voldoet nog niet aan de regels.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen.');
      setLoading(false);
      return;
    }

    try {
      await registerUser(email.trim(), password);
      navigation.navigate('Login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registratie mislukt.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Account aanmaken</Text>
        <Text style={styles.subtitle}>Maak een account voor de native app</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="jouw@email.com"
          placeholderTextColor="#9ca3af"
          style={styles.input}
        />

        <Text style={styles.label}>Wachtwoord</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
          style={styles.input}
        />

        <View style={styles.ruleBox}>
          <Text style={styles.ruleTitle}>Wachtwoordregels</Text>
          <Text style={[styles.rule, rules.minLength ? styles.ruleOk : styles.ruleBad]}>• Minstens 6 tekens</Text>
          <Text style={[styles.rule, rules.upper ? styles.ruleOk : styles.ruleBad]}>• Minstens 1 hoofdletter</Text>
          <Text style={[styles.rule, rules.lower ? styles.ruleOk : styles.ruleBad]}>• Minstens 1 kleine letter</Text>
          <Text style={[styles.rule, rules.number ? styles.ruleOk : styles.ruleBad]}>• Minstens 1 cijfer</Text>
          <Text style={[styles.rule, rules.special ? styles.ruleOk : styles.ruleBad]}>• Minstens 1 speciaal teken</Text>
        </View>

        <Text style={styles.label}>Bevestig wachtwoord</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
          style={styles.input}
        />

        <Pressable style={styles.primaryButton} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Register</Text>}
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkButton}>
          <Text style={styles.linkText}>Al een account? Login</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f7f7f5',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 8,
  },
  subtitle: {
    color: '#6b7280',
    marginBottom: 20,
  },
  error: {
    color: '#b91c1c',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  label: {
    color: '#111111',
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111111',
    backgroundColor: '#ffffff',
  },
  ruleBox: {
    marginTop: 14,
    padding: 14,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
  },
  ruleTitle: {
    fontWeight: '700',
    marginBottom: 8,
    color: '#111111',
  },
  rule: {
    fontSize: 13,
    marginBottom: 4,
  },
  ruleOk: {
    color: '#15803d',
  },
  ruleBad: {
    color: '#6b7280',
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: '#111111',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#111111',
    fontWeight: '700',
  },
});
