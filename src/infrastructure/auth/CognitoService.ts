import { CognitoIdentityProviderClient, InitiateAuthCommand, SignUpCommand, ConfirmSignUpCommand, ForgotPasswordCommand, ConfirmForgotPasswordCommand, ChangePasswordCommand } from '@aws-sdk/client-cognito-identity-provider';
import { User, AuthTokens, LoginCredentials, RegisterData } from '../../core/entities/User';
import { AuthRepository } from '../../core/repositories/AuthRepository';
import { Config } from '../../shared/config/Config';

const cognitoClient = new CognitoIdentityProviderClient({
  region: Config.AWS_REGION,
});

const USER_POOL_ID = Config.COGNITO_USER_POOL_ID;
const CLIENT_ID = Config.COGNITO_CLIENT_ID;

export class CognitoService implements AuthRepository {
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: credentials.email,
          PASSWORD: credentials.password,
        },
      });

      const result = await cognitoClient.send(command);

      if (!result.AuthenticationResult) {
        throw new Error('Authentication failed');
      }

      const tokens: AuthTokens = {
        accessToken: result.AuthenticationResult.AccessToken!,
        refreshToken: result.AuthenticationResult.RefreshToken || '',
        idToken: result.AuthenticationResult.IdToken!,
        expiresIn: result.AuthenticationResult.ExpiresIn! * 1000,
        tokenType: result.AuthenticationResult.TokenType || 'Bearer',
      };

      const user = this.parseIdToken(result.AuthenticationResult.IdToken!);

      return { user, tokens };
    } catch (error: any) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async register(data: RegisterData): Promise<User> {
    try {
      const command = new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: data.email,
        Password: data.password,
        UserAttributes: [
          {
            Name: 'email',
            Value: data.email,
          },
        ],
      });

      await cognitoClient.send(command);

      return {
        id: data.email, // Temporary ID until confirmed
        email: data.email,
        username: data.username,
      };
    } catch (error: any) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  async logout(): Promise<void> {
    // For Cognito, logout is handled client-side by clearing tokens
    // In a real app, you might want to revoke tokens server-side
    return Promise.resolve();
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: CLIENT_ID,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      });

      const result = await cognitoClient.send(command);

      if (!result.AuthenticationResult) {
        throw new Error('Token refresh failed');
      }

      return {
        accessToken: result.AuthenticationResult.AccessToken!,
        refreshToken: result.AuthenticationResult.RefreshToken || refreshToken,
        idToken: result.AuthenticationResult.IdToken!,
        expiresIn: result.AuthenticationResult.ExpiresIn! * 1000,
        tokenType: result.AuthenticationResult.TokenType || 'Bearer',
      };
    } catch (error: any) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    // This would require storing and validating the current token
    // For simplicity, returning null - in real app you'd validate stored tokens
    return null;
  }

  async confirmEmail(email: string, code: string): Promise<void> {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
      });

      await cognitoClient.send(command);
    } catch (error: any) {
      throw new Error(`Email confirmation failed: ${error.message}`);
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: CLIENT_ID,
        Username: email,
      });

      await cognitoClient.send(command);
    } catch (error: any) {
      throw new Error(`Forgot password failed: ${error.message}`);
    }
  }

  async confirmForgotPassword(email: string, code: string, newPassword: string): Promise<void> {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: CLIENT_ID,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      });

      await cognitoClient.send(command);
    } catch (error: any) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    // This requires the access token, which would be stored
    // For simplicity, throwing not implemented
    throw new Error('Change password not implemented in this demo');
  }

  private parseIdToken(idToken: string): User {
    try {
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      return {
        id: payload.sub,
        email: payload.email,
        username: payload['cognito:username'] || payload.email,
        groups: payload['cognito:groups'] || [],
        scopes: payload.scope?.split(' ') || [],
      };
    } catch (error) {
      throw new Error('Failed to parse ID token');
    }
  }
}