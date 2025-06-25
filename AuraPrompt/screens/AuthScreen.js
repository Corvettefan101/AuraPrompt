import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { TextInput, Button, Text, useTheme, Snackbar } from 'react-native-paper';
import { supabase } from '../supabaseClient';

export default function AuthScreen({ onAuthSuccess }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const handleAuth = async () => {
    setLoading(true);
    setError('');
    try {
      let result;
      if (mode === 'login') {
        result = await supabase.auth.signInWithPassword({ email, password });
      } else {
        result = await supabase.auth.signUp({ email, password });
      }
      if (result.error) {
        setError(result.error.message);
        setSnackbarVisible(true);
      } else if (result.data.session || result.data.user) {
        onAuthSuccess && onAuthSuccess();
      } else if (mode === 'signup') {
        setError('Check your email for a confirmation link.');
        setSnackbarVisible(true);
      }
    } catch (e) {
      setError(e.message);
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image
        source={require('../assets/auraprompt.png')}
        style={{ width: 130, height: 130, marginBottom: 18, borderRadius: 26 }}
        resizeMode="contain"
      />
      <Text style={{ color: colors.text, fontSize: 20, marginBottom: 16 }}>
        {mode === 'login' ? 'Login to your account' : 'Create a new account'}
      </Text>
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        mode="outlined"
        theme={{ colors: { primary: colors.primary } }}
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        mode="outlined"
        theme={{ colors: { primary: colors.primary } }}
      />
      <Button
        mode="contained"
        onPress={handleAuth}
        loading={loading}
        style={{ marginTop: 16, backgroundColor: colors.primary }}
        contentStyle={{ paddingVertical: 6 }}
      >
        {mode === 'login' ? 'Login' : 'Sign Up'}
      </Button>
      <Button
        onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
        style={{ marginTop: 8 }}
        textColor={colors.accent}
      >
        {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
      </Button>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={{ backgroundColor: colors.error }}
      >
        {error}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  input: {
    width: 280,
    marginBottom: 12,
  },
}); 