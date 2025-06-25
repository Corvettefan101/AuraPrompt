import React, { useState } from 'react';
import { View, Image, StyleSheet, Alert } from 'react-native';
import { Text, Title, useTheme, TextInput, Button, Switch, Snackbar } from 'react-native-paper';
import { supabase } from '../supabaseClient';
import { useNavigation } from '@react-navigation/native';

export default function AddPromptScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [error, setError] = useState('');

  const handleAddPrompt = async () => {
    setError('');
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      setSnackbar('User not authenticated.');
      setLoading(false);
      return;
    }
    const { error: insertError } = await supabase.from('prompts').insert([
      {
        title,
        content,
        is_public: isPublic,
        user_id: userId,
      },
    ]);
    if (insertError) {
      setSnackbar(insertError.message);
    } else {
      Alert.alert('Prompt Added', 'Your prompt has been added successfully!', [
        { text: 'OK', onPress: () => {} }
      ]);
      setTitle('');
      setContent('');
      setIsPublic(false);
    }
    setLoading(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image
        source={require('../assets/auraprompt.png')}
        style={{ width: 80, height: 80, marginBottom: 12, borderRadius: 16 }}
        resizeMode="contain"
      />
      <Title style={{ color: colors.primary, fontSize: 28, marginBottom: 8 }}>
        Add a New Prompt
      </Title>
      <TextInput
        label="Title"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
        mode="outlined"
        theme={{ colors: { primary: colors.primary } }}
        error={!!error && !title.trim()}
      />
      <TextInput
        label="Prompt Content"
        value={content}
        onChangeText={setContent}
        style={styles.input}
        mode="outlined"
        multiline
        numberOfLines={4}
        theme={{ colors: { primary: colors.primary } }}
        error={!!error && !content.trim()}
      />
      {error ? <Text style={{ color: colors.error, marginBottom: 8 }}>{error}</Text> : null}
      <View style={styles.switchRow}>
        <Text style={{ color: colors.text, marginRight: 8 }}>Add to Public Library</Text>
        <Switch value={isPublic} onValueChange={setIsPublic} color={colors.primary} />
      </View>
      <Button
        mode="contained"
        onPress={handleAddPrompt}
        loading={loading}
        style={{ marginTop: 16, backgroundColor: colors.primary }}
        contentStyle={{ paddingVertical: 6 }}
        disabled={loading}
      >
        Add Prompt
      </Button>
      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={3000}
        style={{ backgroundColor: colors.surface }}
      >
        {snackbar}
      </Snackbar>
    </View>
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
});