import { ScopeUtils } from '../src/shared/utils/ScopeUtils';

const mockAtob = jest.fn();
global.atob = mockAtob;

describe('ScopeUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractScopesFromToken', () => {
    it('should extract scopes from token payload scope field', () => {
      const payload = { scope: 'tasks:read tasks:write' };
      mockAtob.mockReturnValue(JSON.stringify(payload));

      const token = 'header.' + btoa(JSON.stringify(payload)) + '.signature';
      const result = ScopeUtils.extractScopesFromToken(token);

      expect(result).toEqual(['tasks:read', 'tasks:write']);
    });

    it('should extract scopes from cognito:groups as array', () => {
      const payload = { 'cognito:groups': ['users', 'admins'] };
      mockAtob.mockReturnValue(JSON.stringify(payload));

      const token = 'header.' + btoa(JSON.stringify(payload)) + '.signature';
      const result = ScopeUtils.extractScopesFromToken(token);

      expect(result).toEqual(['tasks:read', 'tasks:write']);
    });

    it('should extract scopes from cognito:groups as string', () => {
      const payload = { 'cognito:groups': 'users,admins' };
      mockAtob.mockReturnValue(JSON.stringify(payload));

      const token = 'header.' + btoa(JSON.stringify(payload)) + '.signature';
      const result = ScopeUtils.extractScopesFromToken(token);

      expect(result).toEqual(['tasks:read', 'tasks:write']);
    });

    it('should extract scopes from custom:scopes', () => {
      const payload = { 'custom:scopes': 'custom:read custom:write' };
      mockAtob.mockReturnValue(JSON.stringify(payload));

      const token = 'header.' + btoa(JSON.stringify(payload)) + '.signature';
      const result = ScopeUtils.extractScopesFromToken(token);

      expect(result).toEqual(['custom:read', 'custom:write']);
    });

    it('should combine scopes from multiple fields and remove duplicates', () => {
      const payload = {
        scope: 'tasks:read',
        'cognito:groups': ['users'],
        'custom:scopes': 'tasks:read custom:write',
      };
      mockAtob.mockReturnValue(JSON.stringify(payload));

      const token = 'header.' + btoa(JSON.stringify(payload)) + '.signature';
      const result = ScopeUtils.extractScopesFromToken(token);

      expect(result).toEqual(['tasks:read', 'custom:write']);
    });

    it('should return default scope when no scopes found', () => {
      const payload = {};
      mockAtob.mockReturnValue(JSON.stringify(payload));

      const token = 'header.' + btoa(JSON.stringify(payload)) + '.signature';
      const result = ScopeUtils.extractScopesFromToken(token);

      expect(result).toEqual(['tasks:read']);
    });

    it('should return empty array on invalid token', () => {
      mockAtob.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = ScopeUtils.extractScopesFromToken('invalid.token');
      expect(result).toEqual([]);
    });
  });

  describe('mapGroupToScopes', () => {
    it('should map users group to tasks:read', () => {
      const result = ScopeUtils.mapGroupToScopes('users');
      expect(result).toEqual(['tasks:read']);
    });

    it('should map admins group to tasks:read and tasks:write', () => {
      const result = ScopeUtils.mapGroupToScopes('admins');
      expect(result).toEqual(['tasks:read', 'tasks:write']);
    });

    it('should return empty array for unknown group', () => {
      const result = ScopeUtils.mapGroupToScopes('unknown');
      expect(result).toEqual([]);
    });
  });
});
