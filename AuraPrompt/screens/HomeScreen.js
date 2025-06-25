import * as React from 'react';
import { View, Image } from 'react-native';
import { Text, Title, useTheme, Button, Snackbar } from 'react-native-paper';
import { supabase } from '../supabaseClient';

export default function HomeScreen() {
  const { colors } = useTheme();
  const [snackbar, setSnackbar] = React.useState('');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSnackbar('Logged out successfully!');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <Image
        source={require('../assets/auraprompt.png')}
        style={{ width: 120, height: 120, marginBottom: 16, borderRadius: 24 }}
        resizeMode="contain"
      />
      <Title style={{ color: colors.primary, fontSize: 32, marginBottom: 8 }}>AuraPrompt</Title>
      <Text style={{ fontSize: 18, color: colors.text, textAlign: 'center', marginBottom: 24 }}>
        Welcome to your Vibe Coding Prompt Engineering Tool!{"\n"}
        {'\u2022'} Save, organize, and share your favorite AI prompts.{"\n"}
        {'\u2022'} Access public prompt libraries and manage your own.{"\n"}
        {'\u2022'} Integrate with OpenAI, Anthropic, OpenRouter, and Gemini by adding your API keys in Settings.{"\n"}
        {'\u2022'} Boost your productivity and creativity with AuraPrompt!
      </Text>
      <Button
        mode="contained"
        onPress={handleLogout}
        style={{ backgroundColor: colors.primary }}
        contentStyle={{ paddingVertical: 6, paddingHorizontal: 24 }}
      >
        Log Out
      </Button>
      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={2000}
        style={{ backgroundColor: colors.surface }}
      >
        {snackbar}
      </Snackbar>
    </View>
  );
}