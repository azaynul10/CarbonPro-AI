// tests/integration/realtime.test.js
describe('Real-time Features', () => {
  test('should receive order updates in real-time', async () => {
    const engine = new RealTimeTradingEngine(supabase);
    await engine.initialize();

    const updatePromise = new Promise((resolve) => {
      engine.subscribe('order_added', resolve);
    });

    // Place an order
    const orderResult = await engine.placeOrder({
      userId: 'test-user',
      orderType: 'buy',
      quantity: 5,
      price: 30,
      creditId: 'test-credit-id'
    });

    expect(orderResult.success).toBe(true);

    // Wait for real-time update
    const update = await updatePromise;
    expect(update.order_type).toBe('buy');
    expect(update.quantity).toBe(5);

    engine.disconnect();
  });

  test('should handle connection failures gracefully', async () => {
    const engine = new RealTimeTradingEngine(supabase);
    
    // Simulate connection failure
    jest.spyOn(supabase, 'channel').mockImplementation(() => {
      throw new Error('Connection failed');
    });

    const result = await engine.initialize();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Connection failed');
  });
});