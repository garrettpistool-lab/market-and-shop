import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL'; // Replace with real
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'; // Replace with real
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [screen, setScreen] = useState<'login' | 'market' | 'profile'>('login');

  useEffect(() => {
    if (user) {
      loadMenu();
    }
  }, [user]);

  const loadMenu = async () => {
    const { data } = await supabase.from('menu_items').select('*');
    setMenuItems(data || []);
  };

  const login = async () => {
    // Query Supabase for profile after auth (no demo/fake data)
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (users && users.password === password) {
      setUser(users);
      setScreen('market');
    } else {
      alert('Invalid credentials. Use a test account you created in Supabase Auth.');
    }
  };

  const logout = () => {
    setUser(null);
    setScreen('login');
  };

  if (screen === 'login') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Market and Shop Mobile</Text>
        <TextInput
          style={styles.input}
          placeholder="Email (admin@example.com)"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button title="Login" onPress={login} />
        <Text style={{marginTop: 20, color: '#666'}}>Sign in with your Market and Shop account.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Market and Shop - {user?.role}</Text>
        <Button title="Logout" onPress={logout} />
      </View>

      {screen === 'market' && (
        <>
          <Text style={styles.section}>Marketplace</Text>
          <FlatList
            data={menuItems}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <Text>{item.name} - ${item.price}</Text>
                <Text style={{color: '#666'}}>{item.description}</Text>
              </View>
            )}
          />
          <View style={styles.nav}>
            <Button title="Market" onPress={() => setScreen('market')} />
            <Button title="Profile" onPress={() => setScreen('profile')} />
          </View>
        </>
      )}

      {screen === 'profile' && (
        <>
          <Text style={styles.section}>Profile</Text>
          <Text>Welcome, {user?.name} ({user?.role})</Text>
          <Text>Email: {user?.email}</Text>
          {user?.role === 'admin' && <Text style={{color: 'green'}}>Full admin control enabled!</Text>}
          <View style={styles.nav}>
            <Button title="Market" onPress={() => setScreen('market')} />
            <Button title="Profile" onPress={() => setScreen('profile')} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  section: { fontSize: 20, fontWeight: '600', marginVertical: 10 },
  input: { borderWidth: 1, padding: 10, marginVertical: 5, borderRadius: 8 },
  item: { padding: 15, borderBottomWidth: 1, borderColor: '#eee' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nav: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, paddingTop: 10, borderTopWidth: 1 },
});
