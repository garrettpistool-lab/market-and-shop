import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [screen, setScreen] = useState<'login' | 'market' | 'profile'>('login');

  useEffect(() => {
    if (user && supabase) {
      loadMenu();
    }
  }, [user]);

  const loadMenu = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('menu_items').select('*');
    setMenuItems(data || []);
  };

  const login = async () => {
    if (!supabase) {
      alert('Configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      alert(error?.message || 'Sign in failed.');
      return;
    }
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    setUser(profile || data.user);
    setScreen('market');
  };

  const logout = () => {
    setUser(null);
    setScreen('login');
  };

  if (screen === 'login') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Market and Shop</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button title="Sign in" onPress={login} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Market and Shop</Text>
      <Button title="Sign out" onPress={logout} />
      <FlatList
        data={menuItems}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text>${item.price}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#083a9b' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, marginBottom: 12, borderRadius: 8 },
  card: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  itemName: { fontWeight: '600' },
});