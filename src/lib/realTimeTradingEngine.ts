import { createClient } from '@supabase/supabase-js';
import { useState, useEffect, useCallback } from 'react';

/**
 * Real-time Trading Engine
 * Handles live order matching, price updates, and market data
 */
export class RealTimeTradingEngine {
  supabase: any;
  orderBook: OrderBook;
  priceEngine: PriceEngine;
  subscribers: Map<string, Set<Function>>;
  isConnected: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  orderSubscription: any;
  transactionSubscription: any;
  marketDataSubscription: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
    this.orderBook = new OrderBook();
    this.priceEngine = new PriceEngine();
    this.subscribers = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Initialize real-time connections
   */
  async initialize() {
    try {
      // Subscribe to order updates
      this.orderSubscription = this.supabase
        .channel('trading_orders')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'trading_orders' },
          (payload: any) => this.handleOrderUpdate(payload)
        )
        .subscribe();

      // Subscribe to transaction updates
      this.transactionSubscription = this.supabase
        .channel('transactions')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'transactions' },
          (payload: any) => this.handleTransactionUpdate(payload)
        )
        .subscribe();

      // Subscribe to market data updates
      this.marketDataSubscription = this.supabase
        .channel('market_data')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'market_data' },
          (payload: any) => this.handleMarketDataUpdate(payload)
        )
        .subscribe();

      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Load initial order book
      await this.loadOrderBook();
      
      console.log('Real-time trading engine initialized');
      return { success: true };
    } catch (error: any) {
      console.error('Failed to initialize trading engine:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load current order book from database
   */
  async loadOrderBook() {
    try {
      const { data: orders, error } = await this.supabase
        .from('trading_orders')
        .select('*')
        .eq('status', 'pending')
        .order('price', { ascending: false });

      if (error) throw error;

      this.orderBook.clear();
      orders.forEach((order: any) => {
        this.orderBook.addOrder(order);
      });

      this.notifySubscribers('orderbook_updated', this.orderBook.getSnapshot());
    } catch (error) {
      console.error('Failed to load order book:', error);
    }
  }

  /**
   * Handle real-time order updates
   */
  handleOrderUpdate(payload: any) {
    const { eventType, new: newOrder, old: oldOrder } = payload;

    switch (eventType) {
      case 'INSERT':
        this.orderBook.addOrder(newOrder);
        this.notifySubscribers('order_added', newOrder);
        this.attemptOrderMatching(newOrder);
        break;
      
      case 'UPDATE':
        this.orderBook.updateOrder(newOrder);
        this.notifySubscribers('order_updated', newOrder);
        break;
      
      case 'DELETE':
        this.orderBook.removeOrder(oldOrder);
        this.notifySubscribers('order_removed', oldOrder);
        break;
    }

    // Update order book snapshot
    this.notifySubscribers('orderbook_updated', this.orderBook.getSnapshot());
  }

  /**
   * Handle real-time transaction updates
   */
  handleTransactionUpdate(payload: any) {
    const transaction = payload.new;
    
    // Update price engine with new trade
    this.priceEngine.addTrade(transaction);
    
    // Notify subscribers of new trade
    this.notifySubscribers('trade_executed', transaction);
    
    // Update market data
    this.updateMarketData(transaction);
  }

  /**
   * Handle market data updates
   */
  handleMarketDataUpdate(payload: any) {
    const marketData = payload.new;
    this.notifySubscribers('market_data_updated', marketData);
  }

  /**
   * Attempt to match orders automatically
   */
  async attemptOrderMatching(newOrder: any) {
    try {
      const matches = this.orderBook.findMatches(newOrder);
      
      for (const match of matches) {
        await this.executeMatch(newOrder, match);
      }
    } catch (error) {
      console.error('Order matching failed:', error);
    }
  }

  /**
   * Execute a matched trade
   */
  async executeMatch(buyOrder: any, sellOrder: any) {
    try {
      const quantity = Math.min(buyOrder.remaining_quantity, sellOrder.remaining_quantity);
      const price = buyOrder.price; // Buyer's price takes precedence
      
      // Create transaction record
      const { data: transaction, error } = await this.supabase
        .from('transactions')
        .insert({
          buyer_id: buyOrder.user_id,
          seller_id: sellOrder.user_id,
          credit_id: buyOrder.credit_id || sellOrder.credit_id,
          quantity,
          price_per_ton: price,
          status: 'pending',
          blockchain_tx_hash: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })
        .select()
        .single();

      if (error) throw error;

      // Update order quantities
      await this.updateOrderQuantities(buyOrder, sellOrder, quantity);
      
      // Notify about successful match
      this.notifySubscribers('trade_matched', {
        transaction,
        buyOrder,
        sellOrder,
        quantity,
        price
      });

      return { success: true, transaction };
    } catch (error: any) {
      console.error('Failed to execute match:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update order quantities after partial or full execution
   */
  async updateOrderQuantities(buyOrder: any, sellOrder: any, executedQuantity: number) {
    const updates = [];

    // Update buy order
    const newBuyQuantity = buyOrder.remaining_quantity - executedQuantity;
    if (newBuyQuantity <= 0) {
      updates.push(
        this.supabase
          .from('trading_orders')
          .update({ status: 'completed', filled_quantity: buyOrder.quantity })
          .eq('order_id', buyOrder.order_id)
      );
    } else {
      updates.push(
        this.supabase
          .from('trading_orders')
          .update({ filled_quantity: buyOrder.filled_quantity + executedQuantity })
          .eq('order_id', buyOrder.order_id)
      );
    }

    // Update sell order
    const newSellQuantity = sellOrder.remaining_quantity - executedQuantity;
    if (newSellQuantity <= 0) {
      updates.push(
        this.supabase
          .from('trading_orders')
          .update({ status: 'completed', filled_quantity: sellOrder.quantity })
          .eq('order_id', sellOrder.order_id)
      );
    } else {
      updates.push(
        this.supabase
          .from('trading_orders')
          .update({ filled_quantity: sellOrder.filled_quantity + executedQuantity })
          .eq('order_id', sellOrder.order_id)
      );
    }

    await Promise.all(updates);
  }

  /**
   * Update market data with new trade information
   */
  async updateMarketData(transaction: any) {
    try {
      const now = new Date();
      const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

      // Get existing hourly data or create new
      const { data: existingData } = await this.supabase
        .from('market_data')
        .select('*')
        .eq('credit_id', transaction.credit_id)
        .eq('timestamp', hourStart.toISOString())
        .eq('period_type', 'hourly')
        .single();

      if (existingData) {
        // Update existing hourly data
        const newVolume = existingData.volume + transaction.quantity;
        const newHigh = Math.max(existingData.high_price, transaction.price_per_ton);
        const newLow = Math.min(existingData.low_price, transaction.price_per_ton);

        await this.supabase
          .from('market_data')
          .update({
            price: transaction.price_per_ton,
            volume: newVolume,
            high_price: newHigh,
            low_price: newLow,
            closing_price: transaction.price_per_ton
          })
          .eq('data_id', existingData.data_id);
      } else {
        // Create new hourly data
        await this.supabase
          .from('market_data')
          .insert({
            credit_id: transaction.credit_id,
            price: transaction.price_per_ton,
            volume: transaction.quantity,
            timestamp: hourStart.toISOString(),
            high_price: transaction.price_per_ton,
            low_price: transaction.price_per_ton,
            opening_price: transaction.price_per_ton,
            closing_price: transaction.price_per_ton,
            period_type: 'hourly'
          });
      }
    } catch (error) {
      console.error('Failed to update market data:', error);
    }
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(eventType: string, callback: Function) {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    this.subscribers.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Notify all subscribers of an event
   */
  notifySubscribers(eventType: string, data: any) {
    const callbacks = this.subscribers.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Subscriber callback error:', error);
        }
      });
    }
  }

  /**
   * Place a new trading order
   */
  async placeOrder(orderData: any) {
    try {
      const { data: order, error } = await this.supabase
        .from('trading_orders')
        .insert({
          user_id: orderData.userId,
          order_type: orderData.orderType,
          quantity: orderData.quantity,
          price: orderData.price,
          credit_id: orderData.creditId,
          expires_at: orderData.expiresAt
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, order };
    } catch (error: any) {
      console.error('Failed to place order:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel an existing order
   */
  async cancelOrder(orderId: string, userId: string) {
    try {
      const { error } = await this.supabase
        .from('trading_orders')
        .update({ status: 'cancelled' })
        .eq('order_id', orderId)
        .eq('user_id', userId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Failed to cancel order:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current market prices
   */
  async getCurrentPrices() {
    try {
      const { data: prices, error } = await this.supabase
        .from('market_data')
        .select('credit_id, price, volume, high_price, low_price')
        .eq('period_type', 'hourly')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      return { success: true, prices };
    } catch (error: any) {
      console.error('Failed to get current prices:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Disconnect from real-time updates
   */
  disconnect() {
    if (this.orderSubscription) {
      this.supabase.removeChannel(this.orderSubscription);
    }
    if (this.transactionSubscription) {
      this.supabase.removeChannel(this.transactionSubscription);
    }
    if (this.marketDataSubscription) {
      this.supabase.removeChannel(this.marketDataSubscription);
    }
    
    this.isConnected = false;
    this.subscribers.clear();
  }
}

/**
 * Order Book Management
 */
class OrderBook {
  buyOrders: Map<number, any[]>;
  sellOrders: Map<number, any[]>;
  orderIndex: Map<string, any>;

  constructor() {
    this.buyOrders = new Map(); // price -> orders[]
    this.sellOrders = new Map(); // price -> orders[]
    this.orderIndex = new Map(); // orderId -> order
  }

  addOrder(order: any) {
    this.orderIndex.set(order.order_id, order);
    
    const orderMap = order.order_type === 'buy' ? this.buyOrders : this.sellOrders;
    const price = order.price;
    
    if (!orderMap.has(price)) {
      orderMap.set(price, []);
    }
    orderMap.get(price)!.push(order);
    
    // Sort orders by timestamp (FIFO)
    orderMap.get(price)!.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  updateOrder(order: any) {
    const existingOrder = this.orderIndex.get(order.order_id);
    if (existingOrder) {
      // Remove old order
      this.removeOrder(existingOrder);
      // Add updated order if still active
      if (order.status === 'pending') {
        this.addOrder(order);
      }
    }
  }

  removeOrder(order: any) {
    this.orderIndex.delete(order.order_id);
    
    const orderMap = order.order_type === 'buy' ? this.buyOrders : this.sellOrders;
    const price = order.price;
    
    if (orderMap.has(price)) {
      const orders = orderMap.get(price)!;
      const index = orders.findIndex(o => o.order_id === order.order_id);
      if (index !== -1) {
        orders.splice(index, 1);
        if (orders.length === 0) {
          orderMap.delete(price);
        }
      }
    }
  }

  findMatches(newOrder: any) {
    const matches = [];
    const oppositeMap = newOrder.order_type === 'buy' ? this.sellOrders : this.buyOrders;
    
    // Sort prices for matching
    const sortedPrices = Array.from(oppositeMap.keys()).sort((a, b) => {
      return newOrder.order_type === 'buy' ? a - b : b - a; // Buy: ascending, Sell: descending
    });

    for (const price of sortedPrices) {
      // Check if price is acceptable
      const isMatch = newOrder.order_type === 'buy' 
        ? price <= newOrder.price 
        : price >= newOrder.price;
      
      if (!isMatch) break;

      const orders = oppositeMap.get(price)!;
      for (const order of orders) {
        if (order.remaining_quantity > 0) {
          matches.push(order);
        }
      }
    }

    return matches;
  }

  getSnapshot() {
    const buyLevels = Array.from(this.buyOrders.entries())
      .map(([price, orders]) => ({
        price: parseFloat(price.toString()),
        quantity: orders.reduce((sum, order) => sum + order.remaining_quantity, 0),
        orderCount: orders.length
      }))
      .sort((a, b) => b.price - a.price);

    const sellLevels = Array.from(this.sellOrders.entries())
      .map(([price, orders]) => ({
        price: parseFloat(price.toString()),
        quantity: orders.reduce((sum, order) => sum + order.remaining_quantity, 0),
        orderCount: orders.length
      }))
      .sort((a, b) => a.price - b.price);

    return {
      buyLevels,
      sellLevels,
      spread: sellLevels.length > 0 && buyLevels.length > 0 
        ? sellLevels[0].price - buyLevels[0].price 
        : 0
    };
  }

  clear() {
    this.buyOrders.clear();
    this.sellOrders.clear();
    this.orderIndex.clear();
  }
}

/**
 * Price Engine for market data calculation
 */
class PriceEngine {
  recentTrades: any[];
  priceHistory: Map<string, any[]>;

  constructor() {
    this.recentTrades = [];
    this.priceHistory = new Map();
  }

  addTrade(transaction: any) {
    const trade = {
      price: transaction.price_per_ton,
      quantity: transaction.quantity,
      timestamp: new Date(transaction.transaction_date),
      creditId: transaction.credit_id
    };

    this.recentTrades.push(trade);
    
    // Keep only last 1000 trades
    if (this.recentTrades.length > 1000) {
      this.recentTrades = this.recentTrades.slice(-1000);
    }

    // Update price history
    if (!this.priceHistory.has(trade.creditId)) {
      this.priceHistory.set(trade.creditId, []);
    }
    this.priceHistory.get(trade.creditId)!.push(trade);
  }

  getVWAP(creditId: string, timeWindow = 3600000) { // 1 hour default
    const now = new Date();
    const cutoff = new Date(now.getTime() - timeWindow);
    
    const relevantTrades = this.recentTrades.filter(trade => 
      trade.creditId === creditId && trade.timestamp >= cutoff
    );

    if (relevantTrades.length === 0) return null;

    const totalValue = relevantTrades.reduce((sum, trade) => 
      sum + (trade.price * trade.quantity), 0
    );
    const totalQuantity = relevantTrades.reduce((sum, trade) => 
      sum + trade.quantity, 0
    );

    return totalQuantity > 0 ? totalValue / totalQuantity : null;
  }

  getLastPrice(creditId: string) {
    const trades = this.priceHistory.get(creditId);
    return trades && trades.length > 0 ? trades[trades.length - 1].price : null;
  }

  getPriceChange(creditId: string, timeWindow = 86400000) { // 24 hours default
    const trades = this.priceHistory.get(creditId);
    if (!trades || trades.length < 2) return null;

    const now = new Date();
    const cutoff = new Date(now.getTime() - timeWindow);
    
    const currentPrice = this.getLastPrice(creditId);
    const historicalTrade = trades.find(trade => trade.timestamp <= cutoff);
    
    if (!historicalTrade || !currentPrice) return null;

    const change = currentPrice - historicalTrade.price;
    const changePercent = (change / historicalTrade.price) * 100;

    return {
      absolute: change,
      percentage: changePercent
    };
  }
}

/**
 * React Hook for real-time trading
 */
export function useRealTimeTrading(supabaseClient: any) {
  const [tradingEngine, setTradingEngine] = useState<RealTimeTradingEngine | null>(null);
  const [orderBook, setOrderBook] = useState({ buyLevels: [], sellLevels: [], spread: 0 });
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [marketData, setMarketData] = useState<Record<string, any>>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const engine = new RealTimeTradingEngine(supabaseClient);
    
    // Subscribe to updates
    const unsubscribeOrderBook = engine.subscribe('orderbook_updated', setOrderBook);
    const unsubscribeTrades = engine.subscribe('trade_executed', (trade: any) => {
      setRecentTrades(prev => [trade, ...prev.slice(0, 99)]); // Keep last 100 trades
    });
    const unsubscribeMarketData = engine.subscribe('market_data_updated', (data: any) => {
      setMarketData(prev => ({ ...prev, [data.credit_id]: data }));
    });

    // Initialize engine
    engine.initialize().then(result => {
      if (result.success) {
        setIsConnected(true);
        setTradingEngine(engine);
      }
    });

    return () => {
      unsubscribeOrderBook();
      unsubscribeTrades();
      unsubscribeMarketData();
      engine.disconnect();
    };
  }, [supabaseClient]);

  const placeOrder = useCallback(async (orderData: any) => {
    if (!tradingEngine) return { success: false, error: 'Trading engine not initialized' };
    return await tradingEngine.placeOrder(orderData);
  }, [tradingEngine]);

  const cancelOrder = useCallback(async (orderId: string, userId: string) => {
    if (!tradingEngine) return { success: false, error: 'Trading engine not initialized' };
    return await tradingEngine.cancelOrder(orderId, userId);
  }, [tradingEngine]);

  return {
    orderBook,
    recentTrades,
    marketData,
    isConnected,
    placeOrder,
    cancelOrder
  };
}

export default RealTimeTradingEngine;