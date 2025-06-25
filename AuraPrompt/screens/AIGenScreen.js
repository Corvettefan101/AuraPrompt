import React, { useState, useEffect } from 'react';
import { View, KeyboardAvoidingView, Platform, StyleSheet, FlatList, ScrollView } from 'react-native';
import { Text, TextInput, Button, useTheme, Snackbar, ActivityIndicator, Card, Menu, List } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';

const AI_PROVIDERS = [
  { key: 'openai', label: 'OpenAI' },
  { key: 'anthropic', label: 'Anthropic' },
  { key: 'openrouter', label: 'OpenRouter' },
  { key: 'gemini', label: 'Gemini (Google)' },
];

export default function AIGenScreen() {
  const { colors } = useTheme();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [apiKeys, setApiKeys] = useState({});
  const [openrouterModel, setOpenrouterModel] = useState('openai/gpt-3.5-turbo');
  const [openrouterModels, setOpenrouterModels] = useState([]);
  // Model selection state
  const [modelMenuVisible, setModelMenuVisible] = useState(false);
  const [providerMenuVisible, setProviderMenuVisible] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [providerModels, setProviderModels] = useState([]);
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [lastResponseIndex, setLastResponseIndex] = useState(null);

  useEffect(() => {
    (async () => {
      const keys = {};
      for (const provider of AI_PROVIDERS) {
        keys[provider.key] = await AsyncStorage.getItem(provider.key + 'Key') || '';
      }
      setApiKeys(keys);
      // Load OpenRouter model selection
      const savedModel = await AsyncStorage.getItem('openrouterModel');
      if (savedModel) setOpenrouterModel(savedModel);
    })();
  }, []);

  // Fetch models for all providers
  useEffect(() => {
    if (selectedProvider === 'openrouter') {
      // Always try to get the latest key from AsyncStorage
      AsyncStorage.getItem('openrouterKey').then((key) => {
        if (key) {
          setApiKeys((prev) => ({ ...prev, openrouter: key }));
          fetchOpenRouterModels(key);
        } else {
          setProviderModels([]);
        }
      });
    } else if (selectedProvider === 'openai') {
      setProviderModels(['gpt-3.5-turbo', 'gpt-4', 'gpt-4o']);
    } else if (selectedProvider === 'anthropic') {
      setProviderModels(['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229']);
    } else if (selectedProvider === 'gemini') {
      setProviderModels(['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash']);
    } else {
      setProviderModels([]);
    }
  }, [selectedProvider, openrouterModels.length]);

  // When openrouterModels updates, set providerModels
  useEffect(() => {
    if (selectedProvider === 'openrouter' && openrouterModels.length > 0) {
      setProviderModels(openrouterModels.map(m => m.id || m));
    }
  }, [openrouterModels, selectedProvider]);

  // Ensure model selection resets and menus close when provider changes
  useEffect(() => {
    setSelectedModel('');
    setModelMenuVisible(false);
    setProviderMenuVisible(false);
  }, [selectedProvider]);

  // Show save button after new assistant response
  useEffect(() => {
    if (messages.length > 0) {
      const lastIdx = messages.length - 1;
      const lastMsg = messages[lastIdx];
      if (lastMsg.role === 'assistant' && lastMsg.content && lastMsg.content.trim()) {
        setShowSaveButton(true);
        setLastResponseIndex(lastIdx);
      } else {
        setShowSaveButton(false);
        setLastResponseIndex(null);
      }
    } else {
      setShowSaveButton(false);
      setLastResponseIndex(null);
    }
  }, [messages]);

  const fetchOpenRouterModels = async (apiKey) => {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const data = await res.json();
      if (Array.isArray(data.data)) {
        // Sort models alphabetically for easier selection
        setOpenrouterModels(data.data.sort((a, b) => a.id.localeCompare(b.id)));
      }
    } catch (e) {
      setSnackbar('Could not fetch OpenRouter models');
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);
    // Add user message first
    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    try {
      let aiResponse = '';
      if (!apiKeys[selectedProvider]) {
        setSnackbar('Missing API key for ' + selectedProvider);
        setLoading(false);
        return;
      }
      // Compose system prompt
      const sysPrompt = 'You are a helpful prompt engineering assistant.';
      // Call the selected LLM API
      if (selectedProvider === 'openai') {
        aiResponse = await callOpenAI(input, sysPrompt, apiKeys.openai);
      } else if (selectedProvider === 'anthropic') {
        aiResponse = await callAnthropic(input, sysPrompt, apiKeys.anthropic);
      } else if (selectedProvider === 'openrouter') {
        aiResponse = await callOpenRouter(input, sysPrompt, apiKeys.openrouter, openrouterModel);
      } else if (selectedProvider === 'gemini') {
        aiResponse = await callGemini(input, sysPrompt, apiKeys.gemini);
      }
      // Add AI response after user message
      setMessages((prev) => [...prev, { role: 'assistant', content: aiResponse }]);
      setInput('');
    } catch (e) {
      setSnackbar('AI error: ' + (e.message || e.toString()));
    }
    setLoading(false);
  };

  // Save generated prompt to library
  const [saveDialogVisible, setSaveDialogVisible] = useState(false);
  const [saveType, setSaveType] = useState('private');
  const [lastAIPrompt, setLastAIPrompt] = useState('');
  const { supabase } = require('../supabaseClient');

  const handleSavePrompt = async () => {
    setSaveDialogVisible(false);
    if (!lastAIPrompt) return;
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      setSnackbar('User not authenticated.');
      return;
    }
    const { error } = await supabase.from('prompts').insert([
      {
        title: 'AI Generated Prompt',
        content: lastAIPrompt,
        is_public: saveType === 'public',
        user_id: userId,
      },
    ]);
    if (error) setSnackbar(error.message);
    else setSnackbar('Prompt saved!');
  };

  // --- API Callers ---
  async function callOpenAI(userPrompt, sysPrompt, apiKey) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });
    const data = await res.json();
    if (data.choices && data.choices[0]) return data.choices[0].message.content.trim();
    throw new Error(data.error?.message || 'OpenAI error');
  }
  async function callAnthropic(userPrompt, sysPrompt, apiKey) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        temperature: 0.7,
        system: sysPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    const data = await res.json();
    if (data.content && data.content[0]) return data.content[0].text.trim();
    throw new Error(data.error?.message || 'Anthropic error');
  }
  async function callOpenRouter(userPrompt, sysPrompt, apiKey, model) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'openai/gpt-3.5-turbo',
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      }),
    });
    const data = await res.json();
    if (data.choices && data.choices[0]) return data.choices[0].message.content.trim();
    throw new Error(data.error?.message || 'OpenRouter error');
  }
  async function callGemini(userPrompt, sysPrompt, apiKey) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: sysPrompt + '\n' + userPrompt }] },
        ],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
      }),
    });
    const data = await res.json();
    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text)
      return data.candidates[0].content.parts[0].text.trim();
    throw new Error(data.error?.message || 'Gemini error');
  }

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator animating color={colors.primary} /></View>;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <FlatList
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item, index }) => {
          const isAssistant = item.role === 'assistant';
          const content = item.content && item.content.trim();
          if (!content && isAssistant) {
            return (
              <Card
                style={{
                  margin: 8,
                  backgroundColor: colors.primary,
                  alignSelf: 'flex-start',
                  maxWidth: '80%',
                  borderRadius: 12,
                  shadowColor: 'rgba(0,0,0,0.1)',
                  elevation: 2,
                }}
              >
                <Card.Content>
                  <Text style={{ color: '#fff', textAlign: 'left', fontSize: 16 }} selectable>
                    No response from AI.
                  </Text>
                  {/* Always show Save to Library for assistant messages, even if cut off */}
                  <Button
                    mode="text"
                    onPress={() => {
                      setLastAIPrompt(item.content || '');
                      setSaveDialogVisible(true);
                    }}
                    style={{ marginTop: 4 }}
                  >
                    Save to Library
                  </Button>
                </Card.Content>
              </Card>
            );
          }
          if (!content) return null; // Skip empty user messages
          const isLong = content.length > 500;
          const displayContent = isLong ? content.slice(0, 500) + '…' : content;
          return (
            <Card
              style={{
                margin: 8,
                backgroundColor: item.role === 'user' ? colors.surface : colors.primary,
                alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                borderRadius: 12,
                shadowColor: 'rgba(0,0,0,0.1)',
                elevation: 2,
              }}
            >
              <Card.Content>
                <View style={{ maxHeight: 400, minHeight: 60 }}>
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ flexGrow: 1 }}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    persistentScrollbar={true}
                    keyboardShouldPersistTaps="handled"
                  >
                    <Text style={{ color: item.role === 'user' ? colors.text : '#fff', textAlign: item.role === 'user' ? 'right' : 'left', fontSize: 16, flexWrap: 'wrap' }} selectable>
                      {displayContent}
                    </Text>
                  </ScrollView>
                </View>
                {isLong && (
                  <Button
                    mode="text"
                    onPress={async () => {
                      if (Platform.OS === 'web' && navigator?.clipboard) {
                        await navigator.clipboard.writeText(content);
                      } else {
                        await Clipboard.setStringAsync(content);
                      }
                      setSnackbar('Copied!');
                    }}
                    style={{ marginTop: 4, alignSelf: 'flex-end' }}
                    labelStyle={{ color: colors.primary, fontWeight: 'bold' }}
                  >
                    Copy All
                  </Button>
                )}
                {/* Always show Save to Library for assistant messages, even if cut off */}
                {isAssistant && (
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => {
                      setLastAIPrompt(item.content);
                      setTimeout(() => setSaveDialogVisible(true), 100); // ensure dialog opens after state update
                    }}
                    style={{ marginTop: 8, alignSelf: 'flex-end', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 0, minHeight: 32, minWidth: 0, borderColor: colors.primary, borderWidth: 1, backgroundColor: colors.background }}
                    labelStyle={{ fontSize: 13, fontWeight: 'bold', letterSpacing: 0.5, color: colors.primary }}
                    contentStyle={{ height: 32 }}
                  >
                    SAVE TO LIBRARY
                  </Button>
                )}
              </Card.Content>
            </Card>
          );
        }}
        contentContainerStyle={{ padding: 8, paddingBottom: 100 }}
        inverted={false}
        ListFooterComponent={<View style={{ height: 80 }} />} // Add space for last message
        getItemLayout={(data, index) => ({ length: 200, offset: 200 * index, index })}
      />
      {/* Save Dialog */}
      <Menu
        visible={saveDialogVisible}
        onDismiss={() => setSaveDialogVisible(false)}
        anchor={<View style={{ width: 1, height: 1 }} />}
        style={{ width: 250 }}
      >
        <Menu.Item title="Save to Private Library" onPress={() => { setSaveType('private'); setTimeout(handleSavePrompt, 100); }} />
        <Menu.Item title="Save to Public Library" onPress={() => { setSaveType('public'); setTimeout(handleSavePrompt, 100); }} />
      </Menu>
      {/* Model Picker Dropdown */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, marginBottom: 4 }}>
        <Text style={{ color: colors.text, marginRight: 8 }}>Model:</Text>
        {/* Provider Picker */}
        <Menu
          visible={providerMenuVisible}
          onDismiss={() => setProviderMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setProviderMenuVisible(true)}
              style={{ backgroundColor: colors.surface, marginRight: 8 }}
            >
              {AI_PROVIDERS.find(p => p.key === selectedProvider)?.label || 'Select Provider'}
            </Button>
          }
        >
          {AI_PROVIDERS.map((prov) => (
            <Menu.Item key={prov.key} onPress={() => { setSelectedProvider(prov.key); setProviderMenuVisible(false); setModelMenuVisible(true); }} title={prov.label} />
          ))}
        </Menu>
        {/* Model Picker */}
        <Menu
          visible={modelMenuVisible}
          onDismiss={() => setModelMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => {
                if (providerModels.length > 0) {
                  setModelMenuVisible(false); // Always close first to reset
                  setTimeout(() => setModelMenuVisible(true), 50); // Open after short delay
                }
              }}
              style={{ backgroundColor: colors.surface }}
              disabled={providerModels.length === 0}
            >
              {selectedModel || 'Select Model'}
            </Button>
          }
          style={{ width: 300, maxHeight: 400 }}
        >
          <View style={{ maxHeight: 350 }}>
            {providerModels.length === 0 ? (
              <Menu.Item title="Loading..." />
            ) : (
              <FlatList
                data={providerModels}
                keyExtractor={(item) => item}
                renderItem={({ item: model }) => (
                  <Menu.Item key={model} onPress={() => { setSelectedModel(model); setModelMenuVisible(false); if (selectedProvider === 'openrouter') { setOpenrouterModel(model); AsyncStorage.setItem('openrouterModel', model); } }} title={model} />
                )}
              />
            )}
          </View>
        </Menu>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: colors.background }}>
        <TextInput
          style={{ flex: 1, marginRight: 8 }}
          mode="outlined"
          placeholder="Ask AI to generate a prompt..."
          value={input}
          onChangeText={setInput}
          theme={{ colors: { primary: colors.primary } }}
          onSubmitEditing={handleSend}
          editable={!loading}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <Button mode="contained" onPress={handleSend} loading={loading} disabled={loading || !input.trim()} style={{ backgroundColor: colors.primary }}>
          Send
        </Button>
      </View>
      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={3000}
        style={{ backgroundColor: colors.surface }}
      >
        {snackbar}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}
