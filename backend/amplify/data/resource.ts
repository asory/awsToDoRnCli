import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*== STEP 1 ===============================================================
The section below creates a Task database table with fields as per design.
Authorization allows owner and admin group full access.
=========================================================================*/
const schema = a.schema({
  Task: a
    .model({
      id: a.id().required(),
      owner: a.string().required(), // Cognito User ID
      content: a.string().required(),
      isDone: a.boolean()
    })
    .authorization(allow => [
      allow.owner().to(['create', 'read', 'update', 'delete']),
      allow.groups(['admins']).to(['create', 'read', 'update', 'delete']),
      allow.groups(['users']).to(['read', 'update']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
