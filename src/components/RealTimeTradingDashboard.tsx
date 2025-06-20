import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, Zap, DollarSign, Users, BarChart3, Clock, AlertCircle, Brain, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { useRealTimeTrading } from '../lib/realTimeTradingEngine';
import { supabase } from '../lib/supabase';
import { User } from '../types/database';

interface RealTimeTradingDashboardProps {
  user: User;
}

const RealTimeTradingDashboard: React.FC<RealTimeTradingDashboardProps> = ({ user }) => {
  const {
    orderBook,
    recentTrades,
    marketData,
    isConnected,
    placeOrder,
    cancelOrder
  } = useRealTimeTrading(supabase);

  const [selectedCredit, setSelectedCredit] = useState<any>(null);
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [orderMode, setOrderMode] = useState<'limit' | 'market'>('limit');
  const [timeframe, setTimeframe] = useState('1h');
  const [userOrders, setUserOrders] = useState<any[]>([]);

  useEffect(() => {
    loadUserOrders();
  }, [user.user_id]);

  const loadUserOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_orders')
        .select('*')
        .eq('user_id', user.user_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserOrders(data || []);
    } catch (error) {
      console.error('Failed to load user orders:', error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!quantity || !price) return;

    try {
      const result = await placeOrder({
        userId: user.user_id,
        orderType,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        creditId: selectedCredit?.credit_id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

      if (result.success) {
        setQuantity('');
        setPrice('');
        loadUserOrders();
        alert('Order placed successfully!');
      } else {
        alert(`Failed to place order: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      const result = await cancelOrder(orderId, user.user_id);
      if (result.success) {
        loadUserOrders();
      } else {
        alert(`Failed to cancel order: ${result.error}`);
      }
    }
  };

  // Calculate market statistics
  const marketSummary = Object.values(marketData).reduce((acc: any, data: any) => {
    acc.totalVolume += data.volume || 0;
    acc.avgPrice += data.price || 0;
    acc.count += 1;
    return acc;
  }, { totalVolume: 0, avgPrice: 0, count: 0 });

  if (marketSummary.count > 0) {
    marketSummary.avgPrice /= marketSummary.count;
  }

  // Prepare chart data for recent trades
  const tradeChartData = recentTrades.slice(0, 20).reverse().map((trade, index) => ({
    name: `T${index + 1}`,
    price: trade.price_per_ton,
    volume: trade.quantity,
    time: new Date(trade.transaction_date).toLocaleTimeString()
  }));

  return (
    <div className="space-y-8">
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[#F5F5F5] mb-2">Live Trading Dashboard</h1>
          <p className="text-[#F5F5F5]/70 text-lg">Real-time carbon credit trading with instant order matching</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-3 px-4 py-3 rounded-xl backdrop-blur-xl border ${
            isConnected 
              ? 'bg-[#22BFFD]/20 text-[#22BFFD] border-[#22BFFD]/30' 
              : 'bg-red-500/20 text-red-400 border-red-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#22BFFD]' : 'bg-red-500'} animate-pulse`}></div>
            <span className="text-sm font-medium">
              {isConnected ? 'Live Trading' : 'Disconnected'}
            </span>
          </div>
          
          <div className="text-sm text-[#F5F5F5]/60">
            Last update: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Market Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-[#22BFFD]/20 to-[#00374C]/20 backdrop-blur-xl rounded-2xl border border-[#22BFFD]/30 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">${marketSummary.avgPrice.toFixed(2)}</div>
              <div className="text-[#22BFFD]/80">Average Price/ton</div>
            </div>
            <TrendingUp className="w-10 h-10 text-[#22BFFD]/60" />
          </div>
          <div className="mt-2 text-sm text-[#22BFFD]/60">+2.5% from last hour</div>
        </div>
        
        <div className="bg-gradient-to-br from-[#00374C]/20 to-[#22BFFD]/20 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{marketSummary.totalVolume.toLocaleString()}</div>
              <div className="text-[#00374C]/80">Volume (tons)</div>
            </div>
            <BarChart3 className="w-10 h-10 text-[#00374C]/60" />
          </div>
          <div className="mt-2 text-sm text-[#00374C]/60">Last 24 hours</div>
        </div>
        
        <div className="bg-gradient-to-br from-[#22BFFD]/20 to-[#00374C]/20 backdrop-blur-xl rounded-2xl border border-[#22BFFD]/30 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{recentTrades.length}</div>
              <div className="text-[#22BFFD]/80">Recent Trades</div>
            </div>
            <Activity className="w-10 h-10 text-[#22BFFD]/60" />
          </div>
          <div className="mt-2 text-sm text-[#22BFFD]/60">Live updates</div>
        </div>
        
        <div className="bg-gradient-to-br from-[#00374C]/20 to-[#22BFFD]/20 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{userOrders.length}</div>
              <div className="text-[#00374C]/80">Active Orders</div>
            </div>
            <Clock className="w-10 h-10 text-[#00374C]/60" />
          </div>
          <div className="mt-2 text-sm text-[#00374C]/60">Your pending orders</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Book */}
        <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-[#F5F5F5]">Live Order Book</h3>
            <div className="text-sm text-[#F5F5F5]/60">
              Spread: ${orderBook.spread?.toFixed(2) || '0.00'}
            </div>
          </div>

          <div className="space-y-4">
            {/* Sell Orders */}
            <div>
              <div className="text-sm font-medium text-red-400 mb-2">Ask (Sell Orders)</div>
              <div className="space-y-1">
                {orderBook.sellLevels.slice(0, 5).reverse().map((level, index) => (
                  <div key={`sell-${index}`} className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                    <span className="text-sm font-medium text-red-400">${level.price.toFixed(2)}</span>
                    <span className="text-sm text-[#F5F5F5]/70">{level.quantity.toFixed(2)} tons</span>
                    <span className="text-xs text-[#F5F5F5]/50">{level.orderCount} orders</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Spread Indicator */}
            <div className="border-t border-b border-[#00374C]/30 py-2 text-center">
              <span className="text-sm font-medium text-[#F5F5F5]/70">
                Spread: ${orderBook.spread?.toFixed(2) || '0.00'}
              </span>
            </div>

            {/* Buy Orders */}
            <div>
              <div className="text-sm font-medium text-[#22BFFD] mb-2">Bid (Buy Orders)</div>
              <div className="space-y-1">
                {orderBook.buyLevels.slice(0, 5).map((level, index) => (
                  <div key={`buy-${index}`} className="flex items-center justify-between p-2 bg-[#22BFFD]/10 rounded-lg border border-[#22BFFD]/20">
                    <span className="text-sm font-medium text-[#22BFFD]">${level.price.toFixed(2)}</span>
                    <span className="text-sm text-[#F5F5F5]/70">{level.quantity.toFixed(2)} tons</span>
                    <span className="text-xs text-[#F5F5F5]/50">{level.orderCount} orders</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Trading Interface */}
        <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
          <h3 className="text-xl font-semibold text-[#F5F5F5] mb-6">Place Order</h3>

          {/* Order Type Selector */}
          <div className="flex bg-[#00374C]/20 rounded-xl p-1 mb-6">
            <button
              onClick={() => setOrderType('buy')}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                orderType === 'buy'
                  ? 'bg-[#22BFFD] text-white shadow-sm'
                  : 'text-[#F5F5F5]/70 hover:text-[#F5F5F5]'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setOrderType('sell')}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                orderType === 'sell'
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'text-[#F5F5F5]/70 hover:text-[#F5F5F5]'
              }`}
            >
              Sell
            </button>
          </div>

          {/* Order Mode Selector */}
          <div className="flex bg-[#00374C]/20 rounded-xl p-1 mb-6">
            <button
              onClick={() => setOrderMode('limit')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                orderMode === 'limit'
                  ? 'bg-[#00374C] text-[#F5F5F5] shadow-sm'
                  : 'text-[#F5F5F5]/70 hover:text-[#F5F5F5]'
              }`}
            >
              Limit
            </button>
            <button
              onClick={() => setOrderMode('market')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                orderMode === 'market'
                  ? 'bg-[#00374C] text-[#F5F5F5] shadow-sm'
                  : 'text-[#F5F5F5]/70 hover:text-[#F5F5F5]'
              }`}
            >
              Market
            </button>
          </div>

          {/* Order Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#F5F5F5]/80 mb-2">
                Quantity (tons)
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-4 py-3 bg-[#00374C]/10 border border-[#00374C]/30 rounded-xl text-[#F5F5F5] placeholder-[#F5F5F5]/40 focus:outline-none focus:border-[#22BFFD]/50 focus:ring-2 focus:ring-[#22BFFD]/20 transition-all duration-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#F5F5F5]/80 mb-2">
                Price ($/ton)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                disabled={orderMode === 'market'}
                className="w-full px-4 py-3 bg-[#00374C]/10 border border-[#00374C]/30 rounded-xl text-[#F5F5F5] placeholder-[#F5F5F5]/40 focus:outline-none focus:border-[#22BFFD]/50 focus:ring-2 focus:ring-[#22BFFD]/20 disabled:bg-[#00374C]/5 disabled:opacity-50 transition-all duration-300"
              />
            </div>

            {quantity && price && (
              <div className="p-4 bg-[#00374C]/10 rounded-xl border border-[#00374C]/20">
                <div className="flex justify-between text-sm">
                  <span className="text-[#F5F5F5]/70">Total:</span>
                  <span className="font-semibold text-[#F5F5F5]">${(parseFloat(quantity) * parseFloat(price)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-[#F5F5F5]/70">Fee (0.1%):</span>
                  <span className="text-[#F5F5F5]/70">${((parseFloat(quantity) * parseFloat(price)) * 0.001).toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={!quantity || !price}
              className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 ${
                orderType === 'buy'
                  ? 'bg-gradient-to-r from-[#22BFFD] to-[#00374C] hover:from-[#22BFFD]/80 hover:to-[#00374C]/80 text-white'
                  : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105`}
            >
              Place {orderType === 'buy' ? 'Buy' : 'Sell'} Order
            </button>
          </div>
        </div>

        {/* Recent Trades */}
        <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-[#F5F5F5]">Recent Trades</h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-[#22BFFD] rounded-full animate-pulse"></div>
              <span className="text-sm text-[#F5F5F5]/60">Live</span>
            </div>
          </div>

          <div className="space-y-3">
            {recentTrades.slice(0, 10).map((trade, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[#00374C]/10 rounded-lg hover:bg-[#00374C]/20 transition-colors border border-[#00374C]/20">
                <div className="flex items-center space-x-3">
                  <div className="text-sm font-medium text-[#F5F5F5]">
                    ${trade.price_per_ton?.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-sm text-[#F5F5F5]/70">
                    {trade.quantity?.toFixed(2) || '0.00'} tons
                  </div>
                </div>
                <div className="text-xs text-[#F5F5F5]/50">
                  {new Date(trade.transaction_date).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Price Chart and User Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Price Chart */}
        <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-[#F5F5F5]">Price Chart</h3>
            <div className="flex space-x-2">
              {['1h', '4h', '1d', '1w'].map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 ${
                    timeframe === tf
                      ? 'bg-[#22BFFD]/20 text-[#22BFFD] border border-[#22BFFD]/30'
                      : 'text-[#F5F5F5]/70 hover:text-[#F5F5F5] hover:bg-[#00374C]/20'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={tradeChartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22BFFD" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22BFFD" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#00374C" opacity={0.3} />
              <XAxis dataKey="name" stroke="#F5F5F5" opacity={0.6} fontSize={12} />
              <YAxis stroke="#F5F5F5" opacity={0.6} fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0D0D0D', 
                  border: '1px solid #00374C',
                  borderRadius: '8px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#22BFFD" 
                strokeWidth={2}
                fill="url(#priceGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* User Orders */}
        <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
          <h3 className="text-xl font-semibold text-[#F5F5F5] mb-6">Your Active Orders</h3>
          
          <div className="space-y-4">
            {userOrders.length > 0 ? (
              userOrders.map(order => (
                <div key={order.order_id} className="flex items-center justify-between p-4 bg-[#00374C]/10 rounded-xl border border-[#00374C]/20">
                  <div className="flex items-center space-x-4">
                    <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                      order.order_type === 'buy' 
                        ? 'bg-[#22BFFD]/20 text-[#22BFFD] border border-[#22BFFD]/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {order.order_type.toUpperCase()}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-[#F5F5F5]">
                        {order.quantity} tons @ ${order.price}/ton
                      </div>
                      <div className="text-xs text-[#F5F5F5]/60">
                        Created: {new Date(order.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelOrder(order.order_id)}
                    className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-[#F5F5F5]/30 mx-auto mb-4" />
                <p className="text-[#F5F5F5]/60">No active orders</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeTradingDashboard;