// tests/performance/benchmarks.test.js
describe('Performance Benchmarks', () => {
  test('carbon prediction should complete within 500ms', async () => {
    const engine = new CarbonPredictionEngine();
    const startTime = Date.now();

    await engine.predictCarbonFootprint({
      energyUsage: 800,
      transportation: { weeklyMiles: 100 },
      diet: 'mixed',
      householdSize: 3
    }, 'monthly');

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(500);
  });

  test('order book operations should be fast', () => {
    const orderBook = new OrderBook();
    const startTime = Date.now();

    // Add 1000 orders
    for (let i = 0; i < 1000; i++) {
      orderBook.addOrder({
        order_id: `order-${i}`,
        order_type: i % 2 === 0 ? 'buy' : 'sell',
        price: 20 + Math.random() * 10,
        quantity: Math.random() * 100,
        remaining_quantity: Math.random() * 100,
        created_at: new Date().toISOString()
      });
    }

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });

  test('order matching should be efficient', () => {
    const orderBook = new OrderBook();
    
    // Add 500 sell orders
    for (let i = 0; i < 500; i++) {
      orderBook.addOrder({
        order_id: `sell-${i}`,
        order_type: 'sell',
        price: 25 + Math.random() * 5,
        quantity: Math.random() * 50,
        remaining_quantity: Math.random() * 50,
        created_at: new Date().toISOString()
      });
    }

    const buyOrder = {
      order_id: 'test-buy',
      order_type: 'buy',
      price: 30,
      quantity: 100,
      remaining_quantity: 100
    };

    const startTime = Date.now();
    const matches = orderBook.findMatches(buyOrder);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(50); // Should find matches in under 50ms
    expect(matches.length).toBeGreaterThan(0);
  });
});