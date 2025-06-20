// tests/RealTimeTradingEngine.test.js
import { OrderBook } from '../src/realtime_trading_engine.js';

describe('OrderBook', () => {
  let orderBook;

  beforeEach(() => {
    orderBook = new OrderBook();
  });

  test('should add orders correctly', () => {
    const order = {
      order_id: '1',
      order_type: 'buy',
      price: 25.50,
      quantity: 100,
      remaining_quantity: 100,
      created_at: new Date().toISOString()
    };

    orderBook.addOrder(order);
    const snapshot = orderBook.getSnapshot();

    expect(snapshot.buyLevels).toHaveLength(1);
    expect(snapshot.buyLevels[0].price).toBe(25.50);
    expect(snapshot.buyLevels[0].quantity).toBe(100);
  });

  test('should find matching orders', () => {
    // Add sell order
    orderBook.addOrder({
      order_id: '1',
      order_type: 'sell',
      price: 25.00,
      quantity: 50,
      remaining_quantity: 50,
      created_at: new Date().toISOString()
    });

    // Create buy order that should match
    const buyOrder = {
      order_id: '2',
      order_type: 'buy',
      price: 26.00,
      quantity: 30,
      remaining_quantity: 30
    };

    const matches = orderBook.findMatches(buyOrder);

    expect(matches).toHaveLength(1);
    expect(matches[0].price).toBe(25.00);
  });

  test('should calculate spread correctly', () => {
    orderBook.addOrder({
      order_id: '1',
      order_type: 'buy',
      price: 24.50,
      quantity: 100,
      remaining_quantity: 100,
      created_at: new Date().toISOString()
    });

    orderBook.addOrder({
      order_id: '2',
      order_type: 'sell',
      price: 25.50,
      quantity: 100,
      remaining_quantity: 100,
      created_at: new Date().toISOString()
    });

    const snapshot = orderBook.getSnapshot();
    expect(snapshot.spread).toBe(1.00);
  });
});