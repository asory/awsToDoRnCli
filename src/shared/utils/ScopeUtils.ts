export class ScopeUtils {
  private static readonly groupScopeMapping: { [key: string]: string[] } = {
    'users': ['tasks:read'],
    'admins': ['tasks:read', 'tasks:write'],
  };

  static extractScopesFromToken = (token: string): string[] => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const scopes: string[] = [];

      if (payload.scope) {
        const scopeArray = payload.scope.split(' ');
        scopes.push(...scopeArray);
      }

      if (payload['cognito:groups']) {
        let groups: string[] = [];
        if (Array.isArray(payload['cognito:groups'])) {
          groups = payload['cognito:groups'];
        } else if (typeof payload['cognito:groups'] === 'string') {
          groups = payload['cognito:groups'].split(',');
        }

        groups.forEach((group: string) => {
          const groupScopes = ScopeUtils.mapGroupToScopes(group.trim());
          scopes.push(...groupScopes);
        });
      }

      if (payload['custom:scopes']) {
        const customScopes = payload['custom:scopes'].split(' ');
        scopes.push(...customScopes);
      }

      const finalScopes = [...new Set(scopes)];

      if (finalScopes.length === 0) {
        return ['tasks:read'];
      }

      return finalScopes;
    } catch (error) {
      console.error('Error extracting scopes from token:', error);
      return [];
    }
  };

  static mapGroupToScopes = (group: string): string[] => {
    return ScopeUtils.groupScopeMapping[group] || [];
  };
}