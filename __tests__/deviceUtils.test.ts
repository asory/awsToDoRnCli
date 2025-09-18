import NetInfo from '@react-native-community/netinfo';
import { isOnline } from '../src/shared/utils/deviceUtils';

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
}));

const mockedNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

describe('deviceUtils', () => {
  describe('isOnline', () => {
    it('should return true when device is connected and internet is reachable', async () => {
      mockedNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      } as any);

      const result = await isOnline();
      expect(result).toBe(true);
    });

    it('should return false when device is not connected', async () => {
      mockedNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: true,
      } as any);

      const result = await isOnline();
      expect(result).toBe(false);
    });

    it('should return false when internet is not reachable', async () => {
      mockedNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: false,
      } as any);

      const result = await isOnline();
      expect(result).toBe(false);
    });

    it('should return false when NetInfo.fetch throws an error', async () => {
      mockedNetInfo.fetch.mockRejectedValue(new Error('Network error'));

      const result = await isOnline();
      expect(result).toBe(false);
    });
  });
});
