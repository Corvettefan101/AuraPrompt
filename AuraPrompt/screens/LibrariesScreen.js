import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Image, Modal, TouchableOpacity, Alert, Platform } from 'react-native';
import { Button, Text, useTheme, SegmentedButtons, Card, ActivityIndicator, TextInput, IconButton, Snackbar } from 'react-native-paper';
import { supabase } from '../supabaseClient';
import * as Clipboard from 'expo-clipboard';

export default function LibrariesScreen() {
  const { colors } = useTheme();
  const [selected, setSelected] = useState('public');
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [snackbar, setSnackbar] = useState('');
  const [refresh, setRefresh] = useState(false);
  const [likedPrompts, setLikedPrompts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [usernames, setUsernames] = useState({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editPrompt, setEditPrompt] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
      // Fetch liked prompts
      if (session?.user?.id) {
        const { data } = await supabase.from('liked_prompts').select('prompt_id').eq('user_id', session.user.id);
        setLikedPrompts(data ? data.map(d => d.prompt_id) : []);
      }
    };
    fetchUser();
  }, [refresh]);

  useEffect(() => {
    const fetchPrompts = async () => {
      setLoading(true);
      let data = [];
      let error = null;
      if (selected === 'public') {
        const res = await supabase.from('prompts').select('*').eq('is_public', true).order('created_at', { ascending: false });
        data = res.data;
        error = res.error;
        // Fetch usernames for public prompts
        if (data && data.length > 0) {
          const userIds = [...new Set(data.map(p => p.user_id))];
          const { data: profiles } = await supabase.from('profiles').select('id,username').in('id', userIds);
          const usernameMap = {};
          profiles?.forEach(profile => { usernameMap[profile.id] = profile.username; });
          setUsernames(usernameMap);
        }
      } else if (userId) {
        const res = await supabase.from('prompts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        data = res.data;
        error = res.error;
      }
      setPrompts(data || []);
      setLoading(false);
    };
    fetchPrompts();
  }, [selected, userId, refresh]);

  const filteredPrompts = prompts.filter(p =>
    (filter === 'all' || (filter === 'liked' && likedPrompts.includes(p.id))) &&
    (p.title?.toLowerCase().includes(search.toLowerCase()) || p.content?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleDelete = async (id) => {
    if (Platform.OS === 'web') {
      if (!window.confirm('Are you sure you want to delete this prompt?')) return;
      const { error } = await supabase.from('prompts').delete().eq('id', id);
      if (error) setSnackbar(error.message);
      else {
        setSnackbar('Prompt deleted');
        setRefresh(r => !r);
      }
    } else {
      Alert.alert('Delete Prompt', 'Are you sure you want to delete this prompt?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('prompts').delete().eq('id', id);
          if (error) setSnackbar(error.message);
          else {
            setSnackbar('Prompt deleted');
            setRefresh(r => !r);
          }
        }}
      ]);
    }
  };

  const handleEdit = (prompt) => {
    setEditPrompt(prompt);
    setEditTitle(prompt.title || '');
    setEditContent(prompt.content || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editPrompt) return;
    const { error } = await supabase
      .from('prompts')
      .update({ title: editTitle, content: editContent })
      .eq('id', editPrompt.id);
    if (error) setSnackbar(error.message);
    else {
      setSnackbar('Prompt updated!');
      setEditModalVisible(false);
      setEditPrompt(null);
      setRefresh(r => !r);
    }
  };

  const handleLike = async (prompt) => {
    if (!userId) return;
    if (likedPrompts.includes(prompt.id)) {
      // Unlike
      await supabase.from('liked_prompts').delete().eq('user_id', userId).eq('prompt_id', prompt.id);
      setSnackbar('Removed from saved prompts');
    } else {
      // Like
      await supabase.from('liked_prompts').insert([{ user_id: userId, prompt_id: prompt.id }]);
      setSnackbar('Saved to My Library');
    }
    setRefresh(r => !r);
  };

  const handleCopy = async (content) => {
    await Clipboard.setStringAsync(content);
    setSnackbar('Prompt copied!');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image
        source={require('../assets/auraprompt.png')}
        style={{ width: 60, height: 60, marginBottom: 10, borderRadius: 12 }}
        resizeMode="contain"
      />
      <SegmentedButtons
        value={selected}
        onValueChange={setSelected}
        buttons={[
          { value: 'public', label: 'Public Library' },
          { value: 'personal', label: 'My Library' },
        ]}
        style={{ marginBottom: 8 }}
      />
      <SegmentedButtons
        value={filter}
        onValueChange={setFilter}
        buttons={[
          { value: 'all', label: 'All' },
          { value: 'liked', label: 'Saved' },
        ]}
        style={{ marginBottom: 8 }}
      />
      <TextInput
        placeholder="Search prompts..."
        value={search}
        onChangeText={setSearch}
        style={styles.input}
        mode="outlined"
        theme={{ colors: { primary: colors.primary } }}
      />
      {loading ? (
        <ActivityIndicator animating color={colors.primary} />
      ) : (
        <FlatList
          data={filteredPrompts}
          keyExtractor={item => item.id?.toString()}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 12, backgroundColor: colors.surface }}>
              <Card.Title title={item.title || 'Untitled Prompt'} subtitle={selected === 'public' ? `By: ${usernames[item.user_id] || 'Unknown'}` : 'Personal'} />
              <Card.Content>
                <Text style={{ color: colors.text }} numberOfLines={2}>{item.content}</Text>
              </Card.Content>
              <Card.Actions>
                {userId && (item.user_id === userId || selected === 'personal') && (
                  <IconButton icon="pencil" onPress={() => handleEdit(item)} />
                )}
                {userId && (item.user_id === userId || selected === 'personal') && (
                  <IconButton icon="content-copy" onPress={() => handleCopy(item.content)} />
                )}
                {userId && (item.user_id === userId || selected === 'personal') && (
                  <IconButton icon="delete" onPress={() => handleDelete(item.id)} />
                )}
                {selected === 'public' && userId && (
                  <IconButton icon={likedPrompts.includes(item.id) ? 'bookmark' : 'bookmark-outline'} onPress={() => handleLike(item)} />
                )}
              </Card.Actions>
            </Card>
          )}
          ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 32 }}><Image source={require('../assets/auraprompt.png')} style={{ width: 80, height: 80, opacity: 0.2, marginBottom: 8 }} /><Text style={{ color: colors.text, textAlign: 'center' }}>No prompts found.</Text></View>}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.primary, fontSize: 20, marginBottom: 8 }}>{selectedPrompt?.title}</Text>
            <Text style={{ color: colors.text, marginBottom: 16 }}>{selectedPrompt?.content}</Text>
            <Button icon="content-copy" onPress={() => handleCopy(selectedPrompt?.content)} style={{ marginBottom: 8 }}>Copy</Button>
            <Button onPress={() => setModalVisible(false)} mode="outlined">Close</Button>
          </View>
        </View>
      </Modal>
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}> 
            <Text style={{ color: colors.primary, fontSize: 20, marginBottom: 8 }}>Edit Prompt</Text>
            <TextInput
              label="Title"
              value={editTitle}
              onChangeText={setEditTitle}
              style={styles.input}
              mode="outlined"
              theme={{ colors: { primary: colors.primary } }}
            />
            <TextInput
              label="Content"
              value={editContent}
              onChangeText={setEditContent}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={4}
              theme={{ colors: { primary: colors.primary } }}
            />
            <Button mode="contained" onPress={handleSaveEdit} style={{ marginTop: 12, backgroundColor: colors.primary }}>Save</Button>
            <Button onPress={() => setEditModalVisible(false)} mode="outlined" style={{ marginTop: 8 }}>Cancel</Button>
          </View>
        </View>
      </Modal>
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: 320,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
});