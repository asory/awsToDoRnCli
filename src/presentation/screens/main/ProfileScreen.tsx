import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../../application/store';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/Button';
import SetPINModal from '../../components/SetPINModal';
import ProtectedDataView from '../../components/ProtectedDataView';
import { useScopes } from '../../hooks/useScopes';
import { reAuthService } from '../../../infrastructure/services/BiometricService';
import * as Sentry from '@sentry/react-native';

const ProfileScreen = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const { logout: logoutUser, tokens } = useAuth();
  const { getAllScopes, getUserGroups } = useScopes();
  const scopes = getAllScopes();
  const userGroups = getUserGroups();

  const [showSetPINModal, setShowSetPINModal] = useState(false);

  const handleSetPIN = async () => {
    try {
      const config = {
        promptMessage: 'Confirm your identity to set PIN',
        cancelButtonText: 'Cancel',
      };

      const result = await reAuthService.authenticateWithBiometrics(config);

      if (result.success) {
        setShowSetPINModal(true);
      }
    } catch (error) {
      console.error('Authentication error:', error);
    }
  };

  const idTokenClaims = tokens?.idToken || null;
  const groups: string[] = (idTokenClaims as any)?.['cognito:groups'] || [];

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
            <Text style={styles.label}>Groups:</Text>
            <View style={styles.groupsContainer}>
              {userGroups.length > 0 ? (
                userGroups.map((group, index) => (
                  <Text
                    key={index}
                    style={[
                      styles.groupItem,
                      group === 'admins' && styles.adminGroup,
                    ]}
                  >
                    {group}
                  </Text>
                ))
              ) : (
                <Text style={styles.groupItem}>No groups assigned</Text>
              )}
            </View>
          </View>
        </View>

        {/* Protected Data Section */}
        <View style={styles.protectedSection}>
          <Text style={styles.sectionTitle}>Sensitive Information</Text>
          <Text style={styles.sectionSubtitle}>
            These data require biometric authentication or PIN
          </Text>

          <ProtectedDataView title="User ID" data={user.id} icon="🆔" />

          {groups.length > 0 && (
            <ProtectedDataView
              title="User Groups"
              data={groups}
              isArray={true}
              icon="👥"
            />
          )}

          {scopes.length > 0 && (
            <ProtectedDataView
              title="Permissions (Scopes)"
              data={scopes}
              isArray={true}
              icon="🔑"
            />
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
          <Button
            title="Try!"
            onPress={() => {
              Sentry.captureException(new Error('First error'));
            }}
          />
        </View>
      </ScrollView>

      <SetPINModal
        visible={showSetPINModal}
        onSuccess={() => setShowSetPINModal(false)}
        onCancel={() => setShowSetPINModal(false)}
      />
    </>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  protectedSection: {
    margin: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
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
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    textAlign: 'center',
    minWidth: 60,
  },
  adminGroup: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    fontWeight: '600',
  },
});
