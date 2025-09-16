import { defineFunction } from '@aws-amplify/backend';

export const tasksFunction = defineFunction({
  name: 'tasksHandler',
  entry: './handler.ts',
});
