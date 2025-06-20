import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ShoppingCart, DollarSign, Award, Calendar, Shield, Globe, Wallet, Activity, Zap, Brain, Target, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { dbService } from '../lib/supabase';
import { User, CarbonCredit, TradingOrder, Transaction } from '../types/database';
import { AlgorandWallet } from '../lib/algorand';
import AlgorandWalletConnect from './AlgorandWalletConnect';
import BlockchainTradingPanel from './BlockchainTradingPanel';
import RealTimeTradingDashboard from './RealTimeTradingDashboard';

interface TradingMarketplaceProps {
  user: User;
}

const TradingMarketplace: React.FC<TradingMarketplaceProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'realtime' | 'predictions'>('marketplace');
  const [selectedCredit, setSelectedCredit] = useState<CarbonCredit | null>(null);
  const [orderQuantity, setOrderQuantity] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [carbonCredits, setCarbonCredits] = useState<CarbonCredit[]>([]);
  const [userOrders, setUserOrders] = useState<TradingOrder[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Algorand wallet state
  const [algorandWallet, setAlgorandWallet] = useState<AlgorandWallet | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [showBlockchainPanel, setShowBlockchainPanel] = useState(false);

  useEffect(() => {
    loadMarketplaceData();
  }, [user.user_id]);

  const loadMarketplaceData = async () => {
    try {
      const [creditsData, ordersData, transactionsData] = await Promise.all([
        dbService.getCarbonCredits(),
        dbService.getUserOrders(user.user_id),
        dbService.getUserTransactions(user.user_id)
      ]);

      setCarbonCredits(creditsData || []);
      setUserOrders(ordersData || []);
      setTransactions(transactionsData || []);
    } catch (error) {
      console.error('Error loading marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWalletConnect = (wallet: AlgorandWallet, address: string) => {
    setAlgorandWallet(wallet);
    setWalletAddress(address);
  };

  const handleWalletDisconnect = () => {
    setAlgorandWallet(null);
    setWalletAddress(null);
    setShowBlockchainPanel(false);
  };

  const handlePlaceOrder = async (orderType: 'buy' | 'sell') => {
    if (!selectedCredit || !orderQuantity || !orderPrice) return;
    
    try {
      const orderData = {
        user_id: user.user_id,
        order_type: orderType,
        quantity: parseFloat(orderQuantity),
        price: parseFloat(orderPrice),
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      await dbService.createOrder(orderData);
      
      setSelectedCredit(null);
      setOrderQuantity('');
      setOrderPrice('');
      
      loadMarketplaceData();
      
      alert(`${orderType.toUpperCase()} order placed successfully!`);
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Error placing order. Please try again.');
    }
  };

  const handleBlockchainOrder = (orderType: 'buy' | 'sell') => {
    if (!selectedCredit || !orderQuantity || !orderPrice) {
      alert('Please select a credit and enter quantity/price');
      return;
    }
    
    if (!algorandWallet || !walletAddress) {
      alert('Please connect your Algorand wallet first');
      return;
    }

    setShowBlockchainPanel(true);
  };

  const handleTransactionComplete = (txId: string) => {
    console.log('Blockchain transaction completed:', txId);
    setShowBlockchainPanel(false);
    
    const orderData = {
      user_id: user.user_id,
      order_type: 'buy' as const,
      quantity: parseFloat(orderQuantity),
      price: parseFloat(orderPrice),
      status: 'pending',
      blockchain_tx_hash: txId,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    dbService.createOrder(orderData).then(() => {
      loadMarketplaceData();
      alert('Blockchain order created successfully!');
    });
  };

  // Calculate market statistics
  const marketStats = {
    avgPrice: carbonCredits.length > 0 
      ? carbonCredits.reduce((sum, credit) => sum + credit.price_per_ton, 0) / carbonCredits.length 
      : 0,
    totalVolume: transactions.reduce((sum, tx) => sum + tx.quantity, 0),
    totalValue: transactions.reduce((sum, tx) => sum + tx.total_amount, 0),
    activeOrders: userOrders.filter(order => order.status === 'pending').length
  };

  // Prepare chart data for price distribution
  const priceDistributionData = carbonCredits.reduce((acc, credit) => {
    const priceRange = Math.floor(credit.price_per_ton / 10) * 10;
    const key = `$${priceRange}-${priceRange + 9}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(priceDistributionData).map(([range, count]) => ({
    range,
    count
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#22BFFD] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Tab Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-[#F5F5F5] mb-2">Carbon Credit Trading</h1>
          <p className="text-[#F5F5F5]/70 text-lg">Trade verified carbon credits from global sustainability projects</p>
        </div>
        
        <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-1 flex">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === 'marketplace'
                ? 'bg-gradient-to-r from-[#22BFFD]/20 to-[#00374C]/20 text-[#22BFFD] border border-[#22BFFD]/30'
                : 'text-[#F5F5F5]/70 hover:text-[#F5F5F5]'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Marketplace</span>
          </button>
          <button
            onClick={() => setActiveTab('realtime')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === 'realtime'
                ? 'bg-gradient-to-r from-[#22BFFD]/20 to-[#00374C]/20 text-[#22BFFD] border border-[#22BFFD]/30'
                : 'text-[#F5F5F5]/70 hover:text-[#F5F5F5]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Trading</span>
          </button>
          <button
            onClick={() => setActiveTab('predictions')}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === 'predictions'
                ? 'bg-gradient-to-r from-[#22BFFD]/20 to-[#00374C]/20 text-[#22BFFD] border border-[#22BFFD]/30'
                : 'text-[#F5F5F5]/70 hover:text-[#F5F5F5]'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>AI Predictions</span>
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'realtime' ? (
        <RealTimeTradingDashboard user={user} />
      ) : activeTab === 'predictions' ? (
        <div className="space-y-8">
          {/* AI Predictions Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-[#F5F5F5]">AI Market Predictions</h3>
                <div className="flex items-center space-x-2 text-sm text-[#22BFFD]">
                  <Brain className="w-4 h-4" />
                  <span>94.2% Accuracy</span>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="predictionGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22BFFD" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22BFFD" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#00374C" opacity={0.3} />
                  <XAxis dataKey="range" stroke="#F5F5F5" opacity={0.6} fontSize={12} />
                  <YAxis stroke="#F5F5F5" opacity={0.6} fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0D0D0D', 
                      border: '1px solid #00374C',
                      borderRadius: '12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#22BFFD" 
                    strokeWidth={2}
                    fill="url(#predictionGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-6">
              <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-6">
                <h4 className="font-semibold text-[#F5F5F5] mb-4">Price Predictions</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[#F5F5F5]/70">Next 7 days</span>
                    <span className="text-[#22BFFD] font-semibold">+12.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#F5F5F5]/70">Next 30 days</span>
                    <span className="text-[#22BFFD] font-semibold">+28.3%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#F5F5F5]/70">Next quarter</span>
                    <span className="text-[#22BFFD] font-semibold">+45.7%</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-6">
                <h4 className="font-semibold text-[#F5F5F5] mb-4">AI Recommendations</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-[#22BFFD]/10 rounded-lg border border-[#22BFFD]/20">
                    <div className="text-sm font-medium text-[#22BFFD]">Strong Buy</div>
                    <div className="text-xs text-[#F5F5F5]/70">Renewable Energy Credits</div>
                  </div>
                  <div className="p-3 bg-[#00374C]/10 rounded-lg border border-[#00374C]/20">
                    <div className="text-sm font-medium text-[#00374C]">Hold</div>
                    <div className="text-xs text-[#F5F5F5]/70">Forest Conservation</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Market Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-[#22BFFD]/20 to-[#00374C]/20 backdrop-blur-xl rounded-2xl border border-[#22BFFD]/30 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">${marketStats.avgPrice.toFixed(2)}</div>
                  <div className="text-[#22BFFD]/80">Average Price/ton</div>
                </div>
                <TrendingUp className="w-10 h-10 text-[#22BFFD]/60" />
              </div>
              <div className="mt-2 text-sm text-[#22BFFD]/60">+2.5% from last week</div>
            </div>
            
            <div className="bg-gradient-to-br from-[#00374C]/20 to-[#22BFFD]/20 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{marketStats.totalVolume.toLocaleString()}</div>
                  <div className="text-[#00374C]/80">Total Volume (tons)</div>
                </div>
                <ShoppingCart className="w-10 h-10 text-[#00374C]/60" />
              </div>
              <div className="mt-2 text-sm text-[#00374C]/60">+15.2% this month</div>
            </div>
            
            <div className="bg-gradient-to-br from-[#22BFFD]/20 to-[#00374C]/20 backdrop-blur-xl rounded-2xl border border-[#22BFFD]/30 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">${marketStats.totalValue.toLocaleString()}</div>
                  <div className="text-[#22BFFD]/80">Total Value</div>
                </div>
                <DollarSign className="w-10 h-10 text-[#22BFFD]/60" />
              </div>
              <div className="mt-2 text-sm text-[#22BFFD]/60">All-time trading volume</div>
            </div>
            
            <div className="bg-gradient-to-br from-[#00374C]/20 to-[#22BFFD]/20 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">{marketStats.activeOrders}</div>
                  <div className="text-[#00374C]/80">Active Orders</div>
                </div>
                <Award className="w-10 h-10 text-[#00374C]/60" />
              </div>
              <div className="mt-2 text-sm text-[#00374C]/60">Your pending orders</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Available Credits */}
            <div className="lg:col-span-2">
              <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30">
                <div className="p-8 border-b border-[#00374C]/30">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-semibold text-[#F5F5F5]">Available Carbon Credits</h2>
                    <div className="text-sm text-[#F5F5F5]/60">
                      {carbonCredits.length} projects available
                    </div>
                  </div>
                </div>
                
                <div className="divide-y divide-[#00374C]/20 max-h-96 overflow-y-auto">
                  {carbonCredits.map((credit) => (
                    <div 
                      key={credit.credit_id}
                      className={`p-6 hover:bg-[#00374C]/10 cursor-pointer transition-all duration-300 ${
                        selectedCredit?.credit_id === credit.credit_id ? 'bg-[#22BFFD]/10 border-l-4 border-[#22BFFD]' : ''
                      }`}
                      onClick={() => {
                        setSelectedCredit(credit);
                        setOrderPrice(credit.price_per_ton.toString());
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="font-semibold text-[#F5F5F5] text-lg">{credit.project_name}</h3>
                            <span className="inline-block px-3 py-1 text-xs font-medium bg-[#00374C]/20 text-[#00374C] rounded-full border border-[#00374C]/30">
                              {credit.verification_standard}
                            </span>
                            {credit.project_type && (
                              <span className="inline-block px-3 py-1 text-xs font-medium bg-[#22BFFD]/20 text-[#22BFFD] rounded-full border border-[#22BFFD]/30 capitalize">
                                {credit.project_type}
                              </span>
                            )}
                            {credit.algorand_asset_id && (
                              <span className="inline-block px-3 py-1 text-xs font-medium bg-gradient-to-r from-[#22BFFD]/20 to-[#00374C]/20 text-[#22BFFD] rounded-full border border-[#22BFFD]/30">
                                <Shield className="w-3 h-3 inline mr-1" />
                                Blockchain Asset
                              </span>
                            )}
                          </div>
                          
                          <p className="text-[#F5F5F5]/70 mb-4 line-clamp-2">{credit.project_description}</p>
                          
                          <div className="flex items-center space-x-6 text-sm text-[#F5F5F5]/60">
                            {credit.project_location && (
                              <div className="flex items-center space-x-1">
                                <Globe className="w-4 h-4" />
                                <span>{credit.project_location}</span>
                              </div>
                            )}
                            {credit.vintage_year && (
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>Vintage {credit.vintage_year}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1">
                              <Award className="w-4 h-4" />
                              <span>{credit.available_quantity.toLocaleString()} tons available</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right ml-6">
                          <div className="text-3xl font-bold text-[#22BFFD]">
                            ${credit.price_per_ton.toFixed(2)}
                          </div>
                          <div className="text-sm text-[#F5F5F5]/60">per ton</div>
                          {credit.expiry_date && (
                            <div className="text-xs text-[#F5F5F5]/40 mt-1">
                              Expires: {new Date(credit.expiry_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Panel & Analytics */}
            <div className="space-y-8">
              {/* Algorand Wallet Connection */}
              <AlgorandWalletConnect
                onWalletConnect={handleWalletConnect}
                onWalletDisconnect={handleWalletDisconnect}
                currentAddress={walletAddress || undefined}
              />

              {/* Order Panel */}
              <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
                <h3 className="text-xl font-semibold text-[#F5F5F5] mb-6">Place Order</h3>
                
                {selectedCredit ? (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-[#F5F5F5]/80 mb-3">
                        Selected Project
                      </label>
                      <div className="p-4 bg-[#00374C]/10 rounded-xl border border-[#00374C]/20">
                        <div className="font-medium text-[#F5F5F5]">{selectedCredit.project_name}</div>
                        <div className="text-sm text-[#F5F5F5]/60">{selectedCredit.project_location}</div>
                        <div className="text-sm text-[#22BFFD] font-medium">
                          ${selectedCredit.price_per_ton}/ton
                        </div>
                        {selectedCredit.algorand_asset_id && (
                          <div className="text-xs text-[#22BFFD]/80 mt-1">
                            Asset ID: {selectedCredit.algorand_asset_id}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[#F5F5F5]/80 mb-3">
                        Quantity (tons)
                      </label>
                      <input
                        type="number"
                        value={orderQuantity}
                        onChange={(e) => setOrderQuantity(e.target.value)}
                        placeholder="Enter quantity"
                        className="w-full px-4 py-3 bg-[#00374C]/10 border border-[#00374C]/30 rounded-xl text-[#F5F5F5] placeholder-[#F5F5F5]/40 focus:outline-none focus:border-[#22BFFD]/50 focus:ring-2 focus:ring-[#22BFFD]/20 transition-all duration-300"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-[#F5F5F5]/80 mb-3">
                        Price per ton ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={orderPrice}
                        onChange={(e) => setOrderPrice(e.target.value)}
                        placeholder="Enter price"
                        className="w-full px-4 py-3 bg-[#00374C]/10 border border-[#00374C]/30 rounded-xl text-[#F5F5F5] placeholder-[#F5F5F5]/40 focus:outline-none focus:border-[#22BFFD]/50 focus:ring-2 focus:ring-[#22BFFD]/20 transition-all duration-300"
                      />
                    </div>
                    
                    {orderQuantity && orderPrice && (
                      <div className="p-4 bg-gradient-to-r from-[#22BFFD]/10 to-[#00374C]/10 rounded-xl border border-[#22BFFD]/20">
                        <div className="text-sm text-[#F5F5F5]/70">Total Cost</div>
                        <div className="text-2xl font-bold text-[#22BFFD]">
                          ${(parseFloat(orderQuantity) * parseFloat(orderPrice)).toFixed(2)}
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      {/* Traditional Order Buttons */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handlePlaceOrder('buy')}
                          disabled={!orderQuantity || !orderPrice}
                          className="py-3 rounded-xl font-semibold transition-all duration-300 bg-gradient-to-r from-[#22BFFD] to-[#00374C] hover:from-[#22BFFD]/80 hover:to-[#00374C]/80 text-white disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                        >
                          Buy Order
                        </button>
                        <button
                          onClick={() => handlePlaceOrder('sell')}
                          disabled={!orderQuantity || !orderPrice}
                          className="py-3 rounded-xl font-semibold transition-all duration-300 bg-gradient-to-r from-[#00374C] to-[#22BFFD] hover:from-[#00374C]/80 hover:to-[#22BFFD]/80 text-white disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                        >
                          Sell Order
                        </button>
                      </div>

                      {/* Blockchain Order Button */}
                      {selectedCredit.algorand_asset_id && (
                        <button
                          onClick={() => handleBlockchainOrder('buy')}
                          disabled={!orderQuantity || !orderPrice || !algorandWallet}
                          className="w-full py-3 rounded-xl font-semibold transition-all duration-300 border-2 border-[#22BFFD] text-[#22BFFD] hover:bg-[#22BFFD]/10 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                        >
                          <div className="flex items-center justify-center space-x-2">
                            <Shield className="w-5 h-5" />
                            <span>Blockchain Order</span>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 text-[#F5F5F5]/30 mx-auto mb-4" />
                    <p className="text-[#F5F5F5]/60">Select a carbon credit project to place an order</p>
                  </div>
                )}
              </div>

              {/* Price Distribution Chart */}
              <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
                <h3 className="text-xl font-semibold text-[#F5F5F5] mb-6">Price Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#00374C" opacity={0.3} />
                    <XAxis dataKey="range" stroke="#F5F5F5" opacity={0.6} fontSize={12} />
                    <YAxis stroke="#F5F5F5" opacity={0.6} fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0D0D0D', 
                        border: '1px solid #00374C',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="count" fill="#22BFFD" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Blockchain Trading Panel Modal */}
          {showBlockchainPanel && selectedCredit && algorandWallet && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="relative">
                  <button
                    onClick={() => setShowBlockchainPanel(false)}
                    className="absolute top-4 right-4 z-10 p-2 bg-[#0D0D0D] rounded-full shadow-lg hover:bg-[#00374C]/20 text-[#F5F5F5]"
                  >
                    ×
                  </button>
                  <BlockchainTradingPanel
                    wallet={algorandWallet}
                    selectedCredit={selectedCredit}
                    orderType="buy"
                    quantity={parseFloat(orderQuantity)}
                    price={parseFloat(orderPrice)}
                    onTransactionComplete={handleTransactionComplete}
                  />
                </div>
              </div>
            </div>
          )}

          {/* My Orders */}
          <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
            <h3 className="text-xl font-semibold text-[#F5F5F5] mb-6">My Trading Orders</h3>
            
            {userOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#00374C]/30">
                      <th className="text-left py-4 px-4 text-sm font-medium text-[#F5F5F5]/70">Type</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-[#F5F5F5]/70">Quantity</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-[#F5F5F5]/70">Price</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-[#F5F5F5]/70">Total Value</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-[#F5F5F5]/70">Status</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-[#F5F5F5]/70">Date</th>
                      <th className="text-left py-4 px-4 text-sm font-medium text-[#F5F5F5]/70">Blockchain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userOrders.map((order) => (
                      <tr key={order.order_id} className="border-b border-[#00374C]/20 hover:bg-[#00374C]/10 transition-colors">
                        <td className="py-4 px-4">
                          <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                            order.order_type === 'buy' 
                              ? 'bg-[#22BFFD]/20 text-[#22BFFD] border border-[#22BFFD]/30' 
                              : 'bg-[#00374C]/20 text-[#00374C] border border-[#00374C]/30'
                          }`}>
                            {order.order_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-[#F5F5F5]">
                          {order.quantity.toLocaleString()} tons
                        </td>
                        <td className="py-4 px-4 text-sm text-[#F5F5F5]">
                          ${order.price.toFixed(2)}
                        </td>
                        <td className="py-4 px-4 text-sm text-[#F5F5F5]">
                          ${order.total_value.toLocaleString()}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                            order.status === 'completed'
                              ? 'bg-[#22BFFD]/20 text-[#22BFFD] border border-[#22BFFD]/30'
                              : order.status === 'pending'
                              ? 'bg-[#00374C]/20 text-[#00374C] border border-[#00374C]/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-[#F5F5F5]/60">
                          {new Date(order.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4">
                          {order.blockchain_tx_hash ? (
                            <div className="flex items-center space-x-1">
                              <Shield className="w-4 h-4 text-[#22BFFD]" />
                              <span className="text-xs text-[#22BFFD] font-mono">
                                {order.blockchain_tx_hash.slice(0, 8)}...
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-[#F5F5F5]/40">Off-chain</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Award className="w-16 h-16 text-[#F5F5F5]/30 mx-auto mb-4" />
                <p className="text-[#F5F5F5]/60">No trading orders yet</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TradingMarketplace;