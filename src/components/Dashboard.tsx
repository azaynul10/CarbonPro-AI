import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, DollarSign, Leaf, Zap, Award, BarChart3, Brain, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import MetricCard from './MetricCard';
import { dbService } from '../lib/supabase';
import { User, UserPortfolio, Transaction, MarketData } from '../types/database';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [portfolio, setPortfolio] = useState<UserPortfolio[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user.user_id]);

  const loadDashboardData = async () => {
    try {
      const [portfolioData, transactionData, marketDataResult] = await Promise.all([
        dbService.getUserPortfolio(user.user_id),
        dbService.getUserTransactions(user.user_id),
        dbService.getMarketData()
      ]);

      setPortfolio(portfolioData || []);
      setTransactions(transactionData || []);
      setMarketData(marketDataResult || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const portfolioValue = portfolio.reduce((sum, item) => 
    sum + (item.quantity * (item.carbon_credit?.price_per_ton || 0)), 0
  );

  const totalCreditsOwned = portfolio.reduce((sum, item) => sum + item.quantity, 0);

  const recentTransactionVolume = transactions
    .filter(t => new Date(t.transaction_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .reduce((sum, t) => sum + t.total_amount, 0);

  const metrics = [
    {
      title: 'Carbon Footprint',
      value: `${user.total_emissions.toFixed(1)} tons CO₂`,
      change: '-12%',
      isPositive: true,
      icon: Leaf,
      color: 'green' as const,
      trend: 'down'
    },
    {
      title: 'Credits Portfolio',
      value: totalCreditsOwned.toFixed(0),
      change: '+8%',
      isPositive: true,
      icon: Award,
      color: 'blue' as const,
      trend: 'up'
    },
    {
      title: 'Portfolio Value',
      value: `$${portfolioValue.toLocaleString()}`,
      change: '+24%',
      isPositive: true,
      icon: DollarSign,
      color: 'aqua' as const,
      trend: 'up'
    },
    {
      title: 'AI Predictions',
      value: '94.2%',
      change: '+2.1%',
      isPositive: true,
      icon: Brain,
      color: 'teal' as const,
      trend: 'up'
    }
  ];

  // Generate sample chart data if marketData is empty or insufficient
  const generateSampleChartData = () => {
    const basePrice = 25;
    const dates = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
    
    return dates.map((date, index) => {
      const variation = Math.sin(index * 0.2) * 2 + Math.random() * 1.5;
      const price = basePrice + variation + (index * 0.1);
      const volume = 100 + Math.random() * 50;
      const prediction = price * (1 + Math.sin(index * 0.15) * 0.08);
      
      return {
        name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: Math.round(price * 100) / 100,
        volume: Math.round(volume),
        prediction: Math.round(prediction * 100) / 100
      };
    });
  };

  // Prepare chart data from market data or use sample data
  const chartData = marketData.length > 0 
    ? marketData.slice(0, 30).reverse().map((item, index) => ({
        name: new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: item.price,
        volume: item.volume,
        prediction: item.price * (1 + Math.sin(index * 0.1) * 0.05)
      }))
    : generateSampleChartData();

  const pieData = [
    { name: 'Renewable Energy', value: 35, color: '#22BFFD' },
    { name: 'Forest Conservation', value: 28, color: '#00374C' },
    { name: 'Carbon Capture', value: 22, color: '#22BFFD80' },
    { name: 'Clean Transport', value: 15, color: '#00374C80' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#22BFFD] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-[#00374C]/20 to-[#22BFFD]/10 rounded-3xl border border-[#00374C]/30 p-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#22BFFD]/5 to-transparent"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#F5F5F5] mb-2">Welcome back</h1>
              <p className="text-[#F5F5F5]/70 text-lg mb-6">
                Your environmental impact is improving. Track, predict, and trade carbon credits seamlessly.
              </p>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-[#22BFFD]" />
                  <span className="text-[#F5F5F5]/80">2030 Net Zero Goal</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-[#22BFFD]" />
                  <span className="text-[#F5F5F5]/80">Real-time Trading</span>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#22BFFD]">{totalCreditsOwned.toFixed(0)}</div>
                <div className="text-sm text-[#F5F5F5]/60">Credits Owned</div>
              </div>
              <div className="w-px h-16 bg-[#00374C]/50"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#22BFFD]">${portfolioValue.toLocaleString()}</div>
                <div className="text-sm text-[#F5F5F5]/60">Portfolio Value</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Market Price Chart */}
        <div className="lg:col-span-2 bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-[#F5F5F5]">Market Trends & AI Predictions</h3>
            <div className="flex items-center space-x-2 text-sm text-[#22BFFD]">
              <TrendingUp className="w-4 h-4" />
              <span>+5.2% this week</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22BFFD" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22BFFD" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="predictionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00374C" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00374C" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#00374C" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                stroke="#F5F5F5" 
                opacity={0.6} 
                fontSize={12}
                tick={{ fill: '#F5F5F5', opacity: 0.6 }}
              />
              <YAxis 
                stroke="#F5F5F5" 
                opacity={0.6} 
                fontSize={12}
                tick={{ fill: '#F5F5F5', opacity: 0.6 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0D0D0D', 
                  border: '1px solid #00374C',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  color: '#F5F5F5'
                }}
                labelStyle={{ color: '#F5F5F5' }}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#22BFFD" 
                strokeWidth={2}
                fill="url(#priceGradient)" 
                name="Current Price"
              />
              <Area 
                type="monotone" 
                dataKey="prediction" 
                stroke="#00374C" 
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#predictionGradient)" 
                name="AI Prediction"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Portfolio Distribution */}
        <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
          <h3 className="text-xl font-semibold text-[#F5F5F5] mb-6">Portfolio Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0D0D0D', 
                  border: '1px solid #00374C',
                  borderRadius: '8px',
                  color: '#F5F5F5'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-3 mt-4">
            {pieData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-[#F5F5F5]/80">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-[#F5F5F5]">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Transactions */}
        <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-[#F5F5F5]">Recent Transactions</h3>
            <button className="text-sm text-[#22BFFD] hover:text-[#22BFFD]/80 font-medium transition-colors">
              View All
            </button>
          </div>
          
          <div className="space-y-4">
            {transactions.length > 0 ? (
              transactions.slice(0, 5).map((transaction) => (
                <div key={transaction.transaction_id} className="flex items-center justify-between p-4 bg-[#00374C]/10 rounded-xl hover:bg-[#00374C]/20 transition-all duration-300 border border-[#00374C]/20">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      transaction.buyer_id === user.user_id 
                        ? 'bg-[#22BFFD]/20 text-[#22BFFD]' 
                        : 'bg-[#00374C]/20 text-[#00374C]'
                    }`}>
                      {transaction.buyer_id === user.user_id ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : (
                        <TrendingUp className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#F5F5F5]">
                        {transaction.buyer_id === user.user_id ? 'Bought' : 'Sold'} {transaction.quantity} tons
                      </div>
                      <div className="text-xs text-[#F5F5F5]/60">
                        {new Date(transaction.transaction_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-[#F5F5F5]">
                      ${transaction.total_amount.toLocaleString()}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      transaction.status === 'confirmed' 
                        ? 'bg-[#22BFFD]/20 text-[#22BFFD]' 
                        : 'bg-[#00374C]/20 text-[#00374C]'
                    }`}>
                      {transaction.status}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Sample transactions when no data is available
              [
                { id: 1, type: 'buy', amount: 1250, quantity: 50, date: new Date(), status: 'confirmed' },
                { id: 2, type: 'sell', amount: 875, quantity: 35, date: new Date(Date.now() - 86400000), status: 'confirmed' },
                { id: 3, type: 'buy', amount: 2100, quantity: 84, date: new Date(Date.now() - 172800000), status: 'pending' }
              ].map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-[#00374C]/10 rounded-xl hover:bg-[#00374C]/20 transition-all duration-300 border border-[#00374C]/20">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      transaction.type === 'buy' 
                        ? 'bg-[#22BFFD]/20 text-[#22BFFD]' 
                        : 'bg-[#00374C]/20 text-[#00374C]'
                    }`}>
                      {transaction.type === 'buy' ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : (
                        <TrendingUp className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-[#F5F5F5]">
                        {transaction.type === 'buy' ? 'Bought' : 'Sold'} {transaction.quantity} tons
                      </div>
                      <div className="text-xs text-[#F5F5F5]/60">
                        {transaction.date.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-[#F5F5F5]">
                      ${transaction.amount.toLocaleString()}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      transaction.status === 'confirmed' 
                        ? 'bg-[#22BFFD]/20 text-[#22BFFD]' 
                        : 'bg-[#00374C]/20 text-[#00374C]'
                    }`}>
                      {transaction.status}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
          <h3 className="text-xl font-semibold text-[#F5F5F5] mb-6">AI Market Insights</h3>
          
          <div className="space-y-6">
            <div className="p-4 bg-gradient-to-r from-[#22BFFD]/10 to-[#00374C]/10 rounded-xl border border-[#22BFFD]/20">
              <div className="flex items-start space-x-3">
                <Brain className="w-5 h-5 text-[#22BFFD] mt-1" />
                <div>
                  <h4 className="font-semibold text-[#F5F5F5] mb-1">Price Prediction</h4>
                  <p className="text-sm text-[#F5F5F5]/70">
                    Carbon credit prices expected to rise 15% over next 30 days based on regulatory changes.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-[#00374C]/10 to-[#22BFFD]/10 rounded-xl border border-[#00374C]/20">
              <div className="flex items-start space-x-3">
                <Target className="w-5 h-5 text-[#00374C] mt-1" />
                <div>
                  <h4 className="font-semibold text-[#F5F5F5] mb-1">Portfolio Optimization</h4>
                  <p className="text-sm text-[#F5F5F5]/70">
                    Consider diversifying into renewable energy credits for better risk-adjusted returns.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-[#22BFFD]/10 rounded-xl border border-[#22BFFD]/20">
                <div className="text-2xl font-bold text-[#22BFFD]">
                  ${marketData.length > 0 ? Math.max(...marketData.map(d => d.high_price || d.price)).toFixed(2) : '28.50'}
                </div>
                <div className="text-sm text-[#F5F5F5]/60">Weekly High</div>
              </div>
              <div className="text-center p-4 bg-[#00374C]/10 rounded-xl border border-[#00374C]/20">
                <div className="text-2xl font-bold text-[#00374C]">
                  ${marketData.length > 0 ? Math.min(...marketData.map(d => d.low_price || d.price)).toFixed(2) : '22.10'}
                </div>
                <div className="text-sm text-[#F5F5F5]/60">Weekly Low</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;