import * as React from 'react';
import { NavigationContainer, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, MD3DarkTheme as PaperDarkTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import HomeScreen from './screens/HomeScreen';
import LibrariesScreen from './screens/LibrariesScreen';
import AddPromptStack from './screens/AddPromptStack';
import SettingsScreen from './screens/SettingsScreen';
import AuthScreen from './screens/AuthScreen';
import { supabase } from './supabaseClient';

const Tab = createBottomTabNavigator();

const CombinedDarkTheme = {
  ...PaperDarkTheme,
  ...NavigationDarkTheme,
  colors: {
    ...PaperDarkTheme.colors,
    ...NavigationDarkTheme.colors,
    primary: '#6C63FF',
    accent: '#FFD700',
    background: '#181A20',
    surface: '#23262F',
    text: '#FFFFFF',
    card: '#23262F',
    border: '#23262F',
    notification: '#FFD700',
  },
  typescale: { ...PaperDarkTheme.typescale },
  fonts: { ...PaperDarkTheme.fonts },
};

export default function App() {
  const [session, setSession] = React.useState(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <PaperProvider theme={CombinedDarkTheme}>
      {session ? (
        <NavigationContainer theme={CombinedDarkTheme}>
          <Tab.Navigator
            initialRouteName="Home"
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarIcon: ({ color, size }) => {
                let iconName;
                if (route.name === 'Home') iconName = 'home';
                else if (route.name === 'Libraries') iconName = 'library-shelves';
                else if (route.name === 'Add Prompt') iconName = 'plus-box';
                else if (route.name === 'Settings') iconName = 'cog';
                return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: '#FFD700',
              tabBarInactiveTintColor: '#888',
              tabBarStyle: { backgroundColor: '#23262F', paddingBottom: 4, height: 60 },
            })}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Libraries" component={LibrariesScreen} />
            <Tab.Screen name="Add Prompt" component={AddPromptStack} options={{ headerShown: false }} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      ) : (
        <AuthScreen onAuthSuccess={() => supabase.auth.getSession().then(({ data: { session } }) => setSession(session))} />
      )}
    </PaperProvider>
  );
}
