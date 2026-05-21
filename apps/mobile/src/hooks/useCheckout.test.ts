import { renderHook, act } from '@testing-library/react-native';
import { useCheckout } from './useCheckout';
import { api } from '../api';

const mockNavigate = jest.fn();
const mockClearCart = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../stripe/useStripe', () => ({
  useStripe: () => ({
    initPaymentSheet: jest.fn(async () => ({ error: null })),
    presentPaymentSheet: jest.fn(async () => ({ error: null })),
  }),
}));

jest.mock('../context/CartContext', () => ({
  useCart: () => ({
    items: [{ menuItemId: 'm1', quantity: 1 }],
    restaurantId: 'r1',
    restaurantName: 'Test Restaurant',
    total: 1000,
    clearCart: mockClearCart,
  }),
}));

jest.mock('../context/ConfigContext', () => ({
  useConfig: () => ({ enableDelivery: true }),
}));

jest.mock('../api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

describe('useCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates directly when non-stripe order is created', async () => {
    (api.post as jest.Mock).mockResolvedValueOnce({
      data: { order: { id: 'o1' }, clientSecret: null },
    });

    const { result } = renderHook(() => useCheckout('PICKUP', null));
    await act(async () => {
      await result.current.handleCheckout();
    });

    expect(mockClearCart).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('OrderDetail', { orderId: 'o1' });
  });
});
