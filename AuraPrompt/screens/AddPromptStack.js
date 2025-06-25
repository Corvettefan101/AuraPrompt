import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AddPromptScreen from './AddPromptScreen';
import ChatbarScreen from './ChatbarScreen';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

const Stack = createNativeStackNavigator();

export default function AddPromptStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="AddPrompt" 
        component={AddPromptScreen} 
        options={({ navigation }) => ({
          title: 'Add Prompt',
          headerRight: () => (
            <ChatbarButton navigation={navigation} />
          ),
        })}
      />
      <Stack.Screen 
        name="Chatbar" 
        component={ChatbarScreen} 
        options={{ title: 'AI Generator' }}
      />
    </Stack.Navigator>
  );
}

function ChatbarButton({ navigation }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <MaterialCommunityIcons 
        name="star-four-points" 
        size={28} 
        color="#FFD700" 
        style={{ marginRight: 2 }}
        onPress={() => navigation.navigate('Chatbar')}
      />
      <Text style={{ color: '#7B61FF', fontWeight: 'bold', fontSize: 18, marginRight: 12 }}>AI</Text>
    </View>
  );
}
