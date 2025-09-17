import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/Button';
import Input from '../../components/Input';

type ConfirmEmailScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'ConfirmEmail'
>;

type ConfirmEmailRouteProp = RouteProp<AuthStackParamList, 'ConfirmEmail'>;

const ConfirmEmailScreen = () => {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigation = useNavigation<ConfirmEmailScreenNavigationProp>();
  const route = useRoute<ConfirmEmailRouteProp>();
  const { email } = route.params;
  const { confirmEmail, resendSignUpCode } = useAuth();

  const validateForm = () => {
    if (!code) {
      setCodeError('Verification code is required');
      return false;
    } else if (code.length !== 6) {
      setCodeError('Verification code must be 6 digits');
      return false;
    } else {
      setCodeError('');
      return true;
    }
  };

  const handleConfirm = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const result = await confirmEmail(email, code);

      if (result.success) {
        Alert.alert(
          'Email Verified',
          'Your email has been successfully verified. You can now log in.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }],
        );
      } else {
        Alert.alert('Verification Failed', result.error || 'Unknown error');
      }
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      const result = await resendSignUpCode(email);
      if (result.success) {
        Alert.alert(
          'Code Resent',
          'A new verification code has been sent to your email.',
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to resend code');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a verification code to {email}
        </Text>

        <Input
          label="Verification Code"
          value={code}
          onChangeText={setCode}
          placeholder="Enter 6-digit code"
          keyboardType="numeric"
          maxLength={6}
          error={codeError}
        />

        <Button
          title="Verify Email"
          onPress={handleConfirm}
          loading={isLoading}
          disabled={isLoading}
        />

        <Button
          title="Resend Code"
          onPress={handleResendCode}
          variant="secondary"
          disabled={isLoading}
        />

        <Button
          title="Back to Login"
          onPress={() => navigation.navigate('Login')}
          variant="secondary"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
});

export default ConfirmEmailScreen;
