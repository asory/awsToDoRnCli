import { defineAuth } from '@aws-amplify/backend';
import { defineFunction } from '@aws-amplify/backend';

const preTokenGenerationFunction = defineFunction({
  name: 'preTokenGeneration',
  entry: './pre-token-generation.ts',
});

const postConfirmationFunction = defineFunction({
  name: 'postConfirmation',
  entry: './post-confirmation.ts',
});

export const auth = defineAuth({
  loginWith: {
    email: true,
    // Google OAuth removed temporarily - add back when secrets are configured
    // externalProviders: {
    //   google: {
    //     clientId: secret('GOOGLE_CLIENT_ID'),
    //     clientSecret: secret('GOOGLE_CLIENT_SECRET')
    //   },
    //   callbackUrls: ["http://localhost", "https://task-app-haulmer", "task-app-haulmer:://callback/"],
    //   logoutUrls: ["https://task-app-haulmer", "task-app-haulmer:://signout/"],
    // }
  },

  multifactor: {
    mode: 'OPTIONAL',
    totp: true,
  },

  triggers: {
    preTokenGeneration: preTokenGenerationFunction,
    postConfirmation: postConfirmationFunction,
  },
});
