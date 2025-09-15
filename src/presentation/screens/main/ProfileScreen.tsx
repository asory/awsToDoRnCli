import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../../application/store';
import { useAuth } from '../../hooks/useAuth';
import { useReAuth } from '../../hooks/useReAuth';
import { Button } from '../../components/Button';
import { ReAuthModal } from '../../components/ReAuthModal';
import { SetPINModal } from '../../components/SetPINModal';
import { decode as base64Decode } from 'base-64';

const decodeJWT = (token: string) => {
  try {
    const payload = token.split('.')[1];
    const decoded = base64Decode(payload);
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
};

export const ProfileScreen: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const { logout: logoutUser, tokens } = useAuth();
  const { isReAuthenticated } = useReAuth();

  const [showReAuthModal, setShowReAuthModal] = useState(false);
  const [showSetPINModal, setShowSetPINModal] = useState(false);

  const handleReAuthSuccess = () => {
    setShowReAuthModal(false);
    setShowSetPINModal(true);
  };

  const handleReAuthCancel = () => {
    setShowReAuthModal(false);
  };

  const handleSetPIN = () => {

    if (isReAuthenticated) {
      setShowSetPINModal(true);
    } else {
      setShowReAuthModal(true);
    }
  };

  const idTokenClaims = tokens?.idToken ? decodeJWT(tokens.idToken) : null;
  const groups = idTokenClaims?.['cognito:groups'] || [];

  const handleLogout = async () => {
    await logoutUser();
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>No user data available</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Information</Text>

          <View style={styles.infoItem}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.label}>User ID:</Text>
            <Text style={styles.value}>{user.id}</Text>
          </View>

          {groups.length > 0 && (
            <View style={styles.infoItem}>
              <Text style={styles.label}>Groups:</Text>
              <View style={styles.groupsContainer}>
                {groups.map((group: string, index: number) => (
                  <Text key={index} style={styles.groupItem}>
                    {group}
                  </Text>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Button
            title="Set Authenticated PIN"
            onPress={handleSetPIN}
            variant="primary"
          />
        </View>

        <View style={styles.section}>
          <Button title="Logout" onPress={handleLogout} variant="danger" />
        </View>
      </ScrollView>

      <ReAuthModal
        visible={showReAuthModal}
        onSuccess={handleReAuthSuccess}
        onCancel={handleReAuthCancel}
        title="Re-authenticate to Set PIN"
        message="Please confirm your identity to set an authenticated PIN."
      />
      <SetPINModal
        visible={showSetPINModal}
        onSuccess={() => setShowSetPINModal(false)}
        onCancel={() => setShowSetPINModal(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  value: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupsContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    flex: 1,
  },
  groupItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
});
