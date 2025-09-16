import NetInfo from '@react-native-community/netinfo';

export const isOnline = async (): Promise<boolean> => {
    try {
      const netInfo = await NetInfo.fetch();
      return netInfo.isConnected === true && netInfo.isInternetReachable === true;
    } catch (error) {
      return false;
    }
  }