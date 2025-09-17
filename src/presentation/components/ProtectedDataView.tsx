import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useReAuth } from '../hooks/useReAuth';
import { reAuthService } from '../../infrastructure/services/BiometricService';

interface ProtectedDataViewProps {
  title: string;
  data: string | string[];
  isArray?: boolean;
  icon?: string;
}

const ProtectedDataView = ({
  title,
  data,
  isArray = false,
  icon = '🔒',
}: ProtectedDataViewProps) => {
  const [isVisible, setIsVisible] = useState(false);

  const { isLoading, error } = useReAuth();

  const handleTouchCard = async () => {
    if (isVisible) {
      setIsVisible(false);
      return;
    }

    try {
      const config = {
        promptMessage: `Confirm your identity to view: ${title}`,
        cancelButtonText: 'Cancel',
      };

      const result = await reAuthService.authenticateWithBiometrics(config);

      if (result.success) {
        setIsVisible(true);
      }
    } catch (authError) {
      // Authentication failed
    }
  };

  const renderData = () => {
    if (isArray && Array.isArray(data)) {
      return data.map((item, index) => (
        <Text key={index} style={styles.dataText}>
          • {item}
        </Text>
      ));
    }
    return <Text style={styles.dataText}>{String(data)}</Text>;
  };

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.header}
          onPress={handleTouchCard}
          disabled={isLoading}
        >
          <View style={styles.titleContainer}>
            <Text style={styles.icon}>{icon}</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.statusIcon}>
            {isLoading ? '⏳' : isVisible ? '👁️' : '🔒'}
          </Text>
        </TouchableOpacity>
        {!isVisible && (
          <View style={styles.hintContainer}>
            <Text style={styles.hintText}>Need to authenticate</Text>
          </View>
        )}
        {isVisible && <View style={styles.dataContainer}>{renderData()}</View>}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginVertical: 8,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusIcon: {
    fontSize: 20,
    padding: 4,
  },
  dataContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  hintContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  dataText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 8,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
export default ProtectedDataView;
