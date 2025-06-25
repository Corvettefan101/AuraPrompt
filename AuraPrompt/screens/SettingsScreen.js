import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Image, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Title, useTheme, TextInput, Button, Snackbar, ActivityIndicator } from 'react-native-paper';
import { supabase } from '../supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  // AI API Keys (removed systemPrompt)
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [aiSnackbar, setAiSnackbar] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user);
      setEmail(session?.user?.email || '');
      // Fetch profile from 'profiles' table
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setUsername(data?.username || '');
      setProfileUrl(data?.avatar_url || '');
      setLoading(false);
    };
    fetchProfile();

    // Load AI keys (removed systemPrompt)
    (async () => {
      setOpenaiKey(await AsyncStorage.getItem('openaiKey') || '');
      setAnthropicKey(await AsyncStorage.getItem('anthropicKey') || '');
      setOpenrouterKey(await AsyncStorage.getItem('openrouterKey') || '');
      setGeminiKey(await AsyncStorage.getItem('geminiKey') || '');
    })();
  }, []);

  const handleUpdateProfile = async () => {
    setLoading(true);
    const updates = { id: user.id, username, avatar_url: profileUrl, updated_at: new Date() };
    const { error } = await supabase.from('profiles').upsert(updates);
    if (error) setSnackbar(error.message);
    else setSnackbar('Profile updated!');
    setLoading(false);
  };

  const handleChangePassword = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setSnackbar(error.message);
    else setSnackbar('Password updated!');
    setNewPassword('');
    setLoading(false);
  };

  const handlePickImage = async () => {
    if (Platform.OS === 'web') {
      // Trigger file input click on web
      fileInputRef.current && fileInputRef.current.click();
      return;
    }
    const ImagePicker = await import('expo-image-picker');
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const file = result.assets[0];
      const fileExt = file.uri.split('.').pop();
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `${fileName}`;
      const response = await fetch(file.uri);
      const blob = await response.blob();
      let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, blob, { upsert: true });
      if (uploadError) {
        setSnackbar(uploadError.message);
      } else {
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        setProfileUrl(data.publicUrl);
        setSnackbar('Profile picture updated!');
      }
    }
  };

  // Web file input handler
  const handleWebFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}.${fileExt}`;
    const filePath = `${fileName}`;
    let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (uploadError) {
      setSnackbar(uploadError.message);
    } else {
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setProfileUrl(data.publicUrl);
      setSnackbar('Profile picture updated!');
    }
  };

  const saveAISettings = async () => {
    await AsyncStorage.setItem('openaiKey', openaiKey);
    await AsyncStorage.setItem('anthropicKey', anthropicKey);
    await AsyncStorage.setItem('openrouterKey', openrouterKey);
    await AsyncStorage.setItem('geminiKey', geminiKey);
    setAiSnackbar('AI settings saved!');
  };

  if (loading) return <View style={styles.center}><ActivityIndicator animating color={colors.primary} /></View>;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <ScrollView contentContainerStyle={{ padding: 16, backgroundColor: colors.background }} style={{ flex: 1 }}>
        <View style={{ alignItems: 'center', minHeight: 900 }}>
          <Title style={{ color: colors.primary, marginBottom: 16 }}>Profile Settings</Title>
          <Image source={profileUrl ? { uri: profileUrl } : require('../assets/auraprompt.png')} style={styles.avatar} />
          {Platform.OS === 'web' && (
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleWebFileChange}
            />
          )}
          <Button mode="outlined" onPress={handlePickImage} style={{ marginBottom: 16 }}>Change Profile Picture</Button>
          <Text style={{ color: colors.text, marginBottom: 8 }}>Email: {email}</Text>
          <TextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            mode="outlined"
            theme={{ colors: { primary: colors.primary } }}
          />
          <Button mode="contained" onPress={handleUpdateProfile} style={{ marginBottom: 16, backgroundColor: colors.primary }}>Update Profile</Button>
          <TextInput
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            style={styles.input}
            mode="outlined"
            secureTextEntry
            theme={{ colors: { primary: colors.primary } }}
          />
          <Button mode="contained" onPress={handleChangePassword} style={{ backgroundColor: colors.primary }}>Change Password</Button>

          {/* AI Section */}
          <Title style={{ color: colors.primary, marginTop: 32, marginBottom: 8 }}>AI Settings</Title>
          <TextInput
            label="OpenAI API Key"
            value={openaiKey}
            onChangeText={setOpenaiKey}
            style={styles.input}
            mode="outlined"
            theme={{ colors: { primary: colors.primary } }}
            secureTextEntry
          />
          <TextInput
            label="Anthropic API Key"
            value={anthropicKey}
            onChangeText={setAnthropicKey}
            style={styles.input}
            mode="outlined"
            theme={{ colors: { primary: colors.primary } }}
            secureTextEntry
          />
          <TextInput
            label="OpenRouter API Key"
            value={openrouterKey}
            onChangeText={setOpenrouterKey}
            style={styles.input}
            mode="outlined"
            theme={{ colors: { primary: colors.primary } }}
            secureTextEntry
          />
          <TextInput
            label="Gemini (Google) API Key"
            value={geminiKey}
            onChangeText={setGeminiKey}
            style={styles.input}
            mode="outlined"
            theme={{ colors: { primary: colors.primary } }}
            secureTextEntry
          />
          <Button mode="contained" onPress={saveAISettings} style={{ backgroundColor: colors.primary, marginBottom: 16 }}>Save All Settings</Button>
        </View>
        <Snackbar
          visible={!!snackbar}
          onDismiss={() => setSnackbar('')}
          duration={3000}
          style={{ backgroundColor: colors.surface }}
        >
          {snackbar}
        </Snackbar>
        <Snackbar
          visible={!!aiSnackbar}
          onDismiss={() => setAiSnackbar('')}
          duration={3000}
          style={{ backgroundColor: colors.surface }}
        >
          {aiSnackbar}
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    paddingTop: 32,
  },
  input: {
    width: 300,
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    backgroundColor: '#23262F',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});