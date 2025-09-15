import { defineAuth, secret } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET')
      },
      callbackUrls: ["http://localhost", "https://task-app-haulmer", "task-app-haulmer:://callback/"],
      logoutUrls: ["https://task-app-haulmer", "task-app-haulmer:://signout/"],
    }
  },

  multifactor: {
    mode: 'OPTIONAL',
    totp: true,
  },
});