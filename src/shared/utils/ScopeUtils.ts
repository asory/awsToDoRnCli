/**
 * Utility class for handling scope extraction and mapping from JWT tokens
 */
export class ScopeUtils {
  private static readonly groupScopeMapping: { [key: string]: string[] } = {
    'owner': ['tasks:read', 'tasks:write'],
    'user': ['tasks:read'],
    'guest': [],
  };


  static extractScopesFromToken(token: string): string[] {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const scopes: string[] = [];

      if (payload.scope) {
        scopes.push(...payload.scope.split(' '));
      }

      if (payload['cognito:groups']) {
        payload['cognito:groups'].forEach((group: string) => {
          const groupScopes = this.mapGroupToScopes(group);
          scopes.push(...groupScopes);
        });
      }

      if (payload['custom:scopes']) {
        scopes.push(...payload['custom:scopes'].split(' '));
      }

      return [...new Set(scopes)]; // Remove duplicates
    } catch (error) {
      console.error('❌ Error extracting scopes from token:', error);
      return [];
    }
  }


  static mapGroupToScopes(group: string): string[] {
    return this.groupScopeMapping[group] || [];
  }
}