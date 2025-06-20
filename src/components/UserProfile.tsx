import React, { useState, useEffect } from 'react';
import { User as UserIcon, Wallet, Shield, Calendar, Award, TrendingUp, Settings, BarChart3, DollarSign } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { dbService } from '../lib/supabase';
import { User, UserPortfolio, Transaction, CarbonPrediction } from '../types/database';

interface UserProfileProps {
  user: User;
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [portfolio, setPortfolio] = useState<UserPortfolio[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [predictions, setPredictions] = useState<CarbonPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, [user.user_id]);

  const loadProfileData = async () => {
    try {
      const [portfolioData, transactionData, predictionData] = await Promise.all([
        dbService.getUserPortfolio(user.user_id),
        dbService.getUserTransactions(user.user_id),
        dbService.getUserPredictions(user.user_id)
      ]);

      setPortfolio(portfolioData || []);
      setTransactions(transactionData || []);
      setPredictions(predictionData || []);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate portfolio statistics
  const portfolioValue = portfolio.reduce((sum, item) => 
    sum + (item.quantity * (item.carbon_credit?.price_per_ton || 0)), 0
  );

  const totalInvested = portfolio.reduce((sum, item) => sum + (item.total_invested || 0), 0);
  const portfolioGainLoss = portfolioValue - totalInvested;
  const portfolioGainLossPercent = totalInvested > 0 ? (portfolioGainLoss / totalInvested) * 100 : 0;

  const profileStats = [
    {
      label: 'Total Predictions',
      value: predictions.length.toString(),
      change: '+12 this month',
      icon: TrendingUp,
      color: 'blue'
    },
    {
      label: 'Carbon Credits Owned',
      value: user.carbon_credits_owned.toFixed(0),
      change: '+8 this week',
      icon: Award,
      color: 'green'
    },
    {
      label: 'Portfolio Value',
      value: `$${portfolioValue.toLocaleString()}`,
      change: `${portfolioGainLossPercent >= 0 ? '+' : ''}${portfolioGainLossPercent.toFixed(1)}%`,
      icon: DollarSign,
      color: 'purple'
    },
    {
      label: 'Total Transactions',
      value: transactions.length.toString(),
      change: `$${transactions.reduce((sum, t) => sum + t.total_amount, 0).toLocaleString()} volume`,
      icon: BarChart3,
      color: 'gray'
    }
  ];

  // Prepare portfolio distribution data for pie chart
  const portfolioDistribution = portfolio.map((item, index) => ({
    name: item.carbon_credit?.project_name || 'Unknown',
    value: item.quantity * (item.carbon_credit?.price_per_ton || 0),
    color: ['#22BFFD', '#00374C', '#22BFFD80', '#00374C80', '#22BFFD'][index % 5]
  }));

  // Prepare transaction history for line chart
  const transactionHistory = transactions
    .slice(0, 10)
    .reverse()
    .map((tx, index) => ({
      name: `T${index + 1}`,
      value: tx.total_amount,
      date: new Date(tx.transaction_date).toLocaleDateString()
    }));

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'activity', label: 'Activity' },
    { id: 'settings', label: 'Settings' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#22BFFD] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-[#22BFFD]/20 to-[#00374C]/20 backdrop-blur-xl rounded-2xl border border-[#22BFFD]/30 text-white p-8">
        <div className="flex items-center space-x-8">
          <div className="w-24 h-24 bg-[#22BFFD]/20 rounded-full flex items-center justify-center border border-[#22BFFD]/30">
            <UserIcon className="w-12 h-12 text-[#22BFFD]" />
          </div>
          
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-3 text-[#F5F5F5]">Profile Dashboard</h1>
            <p className="text-[#F5F5F5]/70 mb-4 text-lg">{user.email}</p>
            
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-[#22BFFD]" />
                <span className="text-sm text-[#F5F5F5]/80">
                  {user.wallet_address ? 
                    `${user.wallet_address.slice(0, 8)}...${user.wallet_address.slice(-6)}` :
                    'No wallet connected'
                  }
                </span>
              </div>
              
              {user.verification_status && (
                <div className="flex items-center space-x-2 bg-[#22BFFD]/20 px-4 py-2 rounded-full border border-[#22BFFD]/30">
                  <Shield className="w-4 h-4 text-[#22BFFD]" />
                  <span className="text-sm text-[#22BFFD]">Verified Account</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-[#F5F5F5]/70" />
                <span className="text-sm text-[#F5F5F5]/70">
                  Member since {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center space-x-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#22BFFD]">{user.carbon_credits_owned.toFixed(0)}</div>
              <div className="text-sm text-[#F5F5F5]/70">Credits Owned</div>
            </div>
            <div className="w-px h-16 bg-[#F5F5F5]/30"></div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#22BFFD]">${portfolioValue.toLocaleString()}</div>
              <div className="text-sm text-[#F5F5F5]/70">Portfolio Value</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-xl border border-[#00374C]/30 p-1 flex space-x-1">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex-1 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeSection === section.id
                ? 'bg-gradient-to-r from-[#22BFFD]/20 to-[#00374C]/20 text-[#22BFFD] border border-[#22BFFD]/30'
                : 'text-[#F5F5F5]/70 hover:text-[#F5F5F5] hover:bg-[#00374C]/20'
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* Content Sections */}
      {activeSection === 'overview' && (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {profileStats.map((stat, index) => {
              const Icon = stat.icon;
              const colorClasses = {
                blue: 'bg-[#22BFFD]/20 text-[#22BFFD] border-[#22BFFD]/30',
                green: 'bg-[#00374C]/20 text-[#00374C] border-[#00374C]/30',
                purple: 'bg-[#22BFFD]/20 text-[#22BFFD] border-[#22BFFD]/30',
                gray: 'bg-[#00374C]/20 text-[#00374C] border-[#00374C]/30'
              };

              return (
                <div key={index} className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl border ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-3xl font-bold text-[#F5F5F5] mb-1">{stat.value}</h3>
                    <p className="text-sm text-[#F5F5F5]/70 mb-1">{stat.label}</p>
                    <p className="text-xs text-[#F5F5F5]/50">{stat.change}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
              <h3 className="text-xl font-semibold text-[#F5F5F5] mb-6">Carbon Footprint Trend</h3>
              <div className="h-64 flex items-end justify-between space-x-2">
                {[2.8, 2.6, 2.4, 2.3, 2.1, 2.0].map((value, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div 
                      className="w-full bg-gradient-to-t from-[#22BFFD] to-[#00374C] rounded-t-lg transition-all duration-300 hover:from-[#22BFFD]/80 hover:to-[#00374C]/80"
                      style={{ height: `${(value / 2.8) * 100}%` }}
                    ></div>
                    <div className="mt-2 text-xs text-[#F5F5F5]/70 font-medium">
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][index]}
                    </div>
                    <div className="text-xs text-[#F5F5F5]/50">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
              <h3 className="text-xl font-semibold text-[#F5F5F5] mb-6">Portfolio Distribution</h3>
              {portfolioDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={portfolioDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {portfolioDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Value']}
                      contentStyle={{ 
                        backgroundColor: '#0D0D0D', 
                        border: '1px solid #00374C',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-[#F5F5F5]/60">
                  No portfolio data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'portfolio' && (
        <div className="space-y-8">
          {/* Portfolio Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-6">
              <h3 className="text-lg font-semibold text-[#F5F5F5] mb-2">Total Value</h3>
              <div className="text-3xl font-bold text-[#22BFFD]">${portfolioValue.toLocaleString()}</div>
            </div>
            <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-6">
              <h3 className="text-lg font-semibold text-[#F5F5F5] mb-2">Total Invested</h3>
              <div className="text-3xl font-bold text-[#00374C]">${totalInvested.toLocaleString()}</div>
            </div>
            <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-6">
              <h3 className="text-lg font-semibold text-[#F5F5F5] mb-2">Gain/Loss</h3>
              <div className={`text-3xl font-bold ${portfolioGainLoss >= 0 ? 'text-[#22BFFD]' : 'text-red-400'}`}>
                {portfolioGainLoss >= 0 ? '+' : ''}${portfolioGainLoss.toLocaleString()}
              </div>
              <div className={`text-sm ${portfolioGainLoss >= 0 ? 'text-[#22BFFD]' : 'text-red-400'}`}>
                {portfolioGainLossPercent >= 0 ? '+' : ''}{portfolioGainLossPercent.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Portfolio Holdings */}
          <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
            <h3 className="text-xl font-semibold text-[#F5F5F5] mb-6">Holdings</h3>
            {portfolio.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#00374C]/30">
                      <th className="text-left py-4 px-4 text-sm font-medium text-[#F5F5F5]/70">Project</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-[#F5F5F5]/70">Quantity</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-[#F5F5F5]/70">Avg. Price</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-[#F5F5F5]/70">Current Price</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-[#F5F5F5]/70">Total Value</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-[#F5F5F5]/70">Gain/Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.map((holding) => {
                      const currentPrice = holding.carbon_credit?.price_per_ton || 0;
                      const avgPrice = holding.average_purchase_price || 0;
                      const totalValue = holding.quantity * currentPrice;
                      const gainLoss = (currentPrice - avgPrice) * holding.quantity;
                      const gainLossPercent = avgPrice > 0 ? (gainLoss / (avgPrice * holding.quantity)) * 100 : 0;

                      return (
                        <tr key={holding.portfolio_id} className="border-b border-[#00374C]/20 hover:bg-[#00374C]/10 transition-colors">
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium text-[#F5F5F5]">
                                {holding.carbon_credit?.project_name || 'Unknown Project'}
                              </div>
                              <div className="text-sm text-[#F5F5F5]/60">
                                {holding.carbon_credit?.project_location}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-[#F5F5F5]">
                            {holding.quantity.toLocaleString()} tons
                          </td>
                          <td className="py-4 px-4 text-sm text-[#F5F5F5]">
                            ${avgPrice.toFixed(2)}
                          </td>
                          <td className="py-4 px-4 text-sm text-[#F5F5F5]">
                            ${currentPrice.toFixed(2)}
                          </td>
                          <td className="py-4 px-4 text-sm text-[#F5F5F5]">
                            ${totalValue.toLocaleString()}
                          </td>
                          <td className="py-4 px-4">
                            <div className={`text-sm font-medium ${gainLoss >= 0 ? 'text-[#22BFFD]' : 'text-red-400'}`}>
                              {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)}
                            </div>
                            <div className={`text-xs ${gainLoss >= 0 ? 'text-[#22BFFD]' : 'text-red-400'}`}>
                              {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Award className="w-16 h-16 text-[#F5F5F5]/30 mx-auto mb-4" />
                <p className="text-[#F5F5F5]/60">No portfolio holdings yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === 'activity' && (
        <div className="space-y-8">
          {/* Transaction History Chart */}
          <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
            <h3 className="text-xl font-semibold text-[#F5F5F5] mb-6">Transaction History</h3>
            {transactionHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={transactionHistory}>
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
                    formatter={(value, name, props) => [
                      `$${Number(value).toLocaleString()}`,
                      'Transaction Value',
                      props.payload.date
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#22BFFD" 
                    strokeWidth={3}
                    dot={{ fill: '#22BFFD', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-[#F5F5F5]/60">
                No transaction history available
              </div>
            )}
          </div>

          {/* Recent Activity List */}
          <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
            <h3 className="text-xl font-semibold text-[#F5F5F5] mb-6">Recent Activity</h3>
            
            <div className="space-y-4">
              {transactions.slice(0, 10).map((transaction) => (
                <div key={transaction.transaction_id} className="flex items-center space-x-4 p-4 bg-[#00374C]/10 rounded-xl border border-[#00374C]/20">
                  <div className={`p-2 rounded-lg ${
                    transaction.buyer_id === user.user_id 
                      ? 'bg-[#22BFFD]/20 text-[#22BFFD] border border-[#22BFFD]/30' 
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {transaction.buyer_id === user.user_id ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingUp className="w-5 h-5 rotate-180" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[#F5F5F5]">
                      {transaction.buyer_id === user.user_id ? 'Bought' : 'Sold'} {transaction.quantity} tons
                    </div>
                    <div className="text-xs text-[#F5F5F5]/60">
                      {new Date(transaction.transaction_date).toLocaleDateString()} • 
                      {transaction.blockchain_tx_hash && (
                        <span className="ml-1">
                          Tx: {transaction.blockchain_tx_hash.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-semibold text-[#F5F5F5]">
                      ${transaction.total_amount.toLocaleString()}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      transaction.status === 'confirmed' 
                        ? 'bg-[#22BFFD]/20 text-[#22BFFD] border border-[#22BFFD]/30' 
                        : transaction.status === 'pending'
                        ? 'bg-[#00374C]/20 text-[#00374C] border border-[#00374C]/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {transaction.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'settings' && (
        <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
          <h3 className="text-xl font-semibold text-[#F5F5F5] mb-8">Account Settings</h3>
          
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-[#F5F5F5]/80 mb-3">Email Address</label>
              <input
                type="email"
                value={user.email}
                readOnly
                className="w-full px-4 py-3 bg-[#00374C]/10 border border-[#00374C]/30 rounded-xl text-[#F5F5F5] focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#F5F5F5]/80 mb-3">Wallet Address</label>
              <input
                type="text"
                value={user.wallet_address || 'No wallet connected'}
                readOnly
                className="w-full px-4 py-3 bg-[#00374C]/10 border border-[#00374C]/30 rounded-xl text-[#F5F5F5] focus:outline-none"
              />
            </div>
            
            <div className="flex items-center justify-between p-6 bg-[#22BFFD]/10 rounded-xl border border-[#22BFFD]/20">
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6 text-[#22BFFD]" />
                <div>
                  <div className="text-sm font-medium text-[#F5F5F5]">Account Verification</div>
                  <div className="text-xs text-[#F5F5F5]/70">
                    {user.verification_status ? 'Your account has been verified' : 'Account verification pending'}
                  </div>
                </div>
              </div>
              <div className={`font-semibold ${user.verification_status ? 'text-[#22BFFD]' : 'text-[#00374C]'}`}>
                {user.verification_status ? '✓ Verified' : '⏳ Pending'}
              </div>
            </div>
            
            <div className="pt-6 border-t border-[#00374C]/30">
              <button className="flex items-center space-x-2 text-[#22BFFD] hover:text-[#22BFFD]/80 font-medium transition-colors">
                <Settings className="w-5 h-5" />
                <span>Advanced Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;