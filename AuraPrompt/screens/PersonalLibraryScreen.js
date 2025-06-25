import * as React from 'react';
import { View, Image, ScrollView, Dimensions } from 'react-native';
import { Text, Title, useTheme, Card, ActivityIndicator, Modal, Portal, Button as PaperButton, IconButton } from 'react-native-paper';
import { supabase } from '../supabaseClient';
import * as Clipboard from 'expo-clipboard';

export default function PersonalLibraryScreen() {
  const { colors } = useTheme();
  const [prompts, setPrompts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [modalContent, setModalContent] = React.useState('');

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        setPrompts([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setPrompts(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Image
        source={require('../assets/auraprompt.png')}
        style={{ width: 80, height: 80, marginBottom: 12, borderRadius: 16, alignSelf: 'center', marginTop: 24 }}
        resizeMode="contain"
      />
      <Title style={{ color: colors.primary, fontSize: 28, marginBottom: 8, textAlign: 'center' }}>Personal Prompt Library</Title>
      {loading ? (
        <ActivityIndicator animating color={colors.primary} style={{ marginTop: 32 }} />
      ) : prompts.length === 0 ? (
        <Text style={{ fontSize: 16, color: colors.text, textAlign: 'center', marginTop: 32 }}>
          Your private collection of prompts will appear here.
        </Text>
      ) : (
        <ScrollView style={{ flex: 1, marginHorizontal: 8 }} contentContainerStyle={{ paddingBottom: 32 }}>
          {prompts.map((prompt) => {
            const previewLength = 300; // changed from 400 to 300
            const isLong = prompt.content && prompt.content.length > previewLength;
            const preview = isLong ? prompt.content.slice(0, previewLength) + '...' : prompt.content;
            return (
              <Card key={prompt.id} style={{ marginVertical: 8, backgroundColor: colors.surface, borderRadius: 14, elevation: 2 }}>
                <Card.Title 
                  title={prompt.title || 'Untitled'} 
                  titleStyle={{ color: colors.primary, fontWeight: 'bold', fontSize: 18 }}
                  right={() => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <IconButton icon="pencil" size={22} onPress={() => {/* handle edit */}} />
                      <IconButton
                        icon="content-copy"
                        size={22}
                        onPress={async () => {
                          await Clipboard.setStringAsync(prompt.content);
                          setModalContent('Copied!');
                          setModalVisible(true);
                          setTimeout(() => setModalVisible(false), 1000);
                        }}
                      />
                    </View>
                  )}
                />
                <Card.Content>
                  <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }} selectable>
                    {preview}
                  </Text>
                  {isLong && (
                    <PaperButton
                      mode="text"
                      onPress={() => { setModalContent(prompt.content); setModalVisible(true); }}
                      style={{ marginTop: 8, alignSelf: 'flex-end' }}
                    >
                      View Full
                    </PaperButton>
                  )}
                </Card.Content>
              </Card>
            );
          })}
        </ScrollView>
      )}
      <Portal>
        <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={{ backgroundColor: colors.surface, margin: 24, borderRadius: 16, padding: 16, maxHeight: '80%', minHeight: 100 }}>
          <ScrollView style={{ maxHeight: 350, minHeight: 100 }} contentContainerStyle={{ flexGrow: 1 }}>
            <Text style={{ color: colors.text, fontSize: 16, lineHeight: 22 }} selectable>{modalContent}</Text>
          </ScrollView>
          <PaperButton mode="contained" onPress={() => setModalVisible(false)} style={{ marginTop: 16, alignSelf: 'center' }}>
            Close
          </PaperButton>
        </Modal>
      </Portal>
    </View>
  );
}