import { renderHook, waitFor } from '@testing-library/react-native';
import { useHomeRestaurants } from './useHomeRestaurants';
import { api } from '../api';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => {
    const React = require('react');
    React.useEffect(() => {
      cb();
    }, [cb]);
  },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 1 },
}));

jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
  },
}));

describe('useHomeRestaurants', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockImplementation((url: string) => {
      if (url === '/users/addresses') return Promise.resolve({ data: [] });
      if (url === '/restaurants') return Promise.resolve({ data: [{ id: 'r1', name: 'A', distanceMiles: 1.2 }] });
      return Promise.resolve({ data: [] });
    });
  });

  it('loads restaurants after location resolution fallback', async () => {
    const { result } = renderHook(() => useHomeRestaurants());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.restaurants).toHaveLength(1);
  });
});
