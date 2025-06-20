// Trading Dashboard Components for Real-time Carbon Credit Trading
// React components with live data updates and interactive trading interface

import React, { useState, useEffect, useCallback } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { useRealTimeTrading } from './realtime_trading_engine.js';

/**
 * Main Trading Dashboard Component
 */
export function TradingDashboard({ supabaseClient, user }) {
  const {
    orderBook,
    recentTrades,
    marketData,
    isConnected,
    placeOrder,
    cancelOrder
  } = useRealTimeTrading(supabaseClient);

  const [selectedCredit, setSelectedCredit] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [userPortfolio, setUserPortfolio] = useState([]);

  // Load user-specific data
  useEffect(() => {
    if (user) {
      loadUserOrders();
      loadUserPortfolio();
    }
  }, [user]);

  const loadUserOrders = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('trading_orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserOrders(data);
    } catch (error) {
      console.error('Failed to load user orders:', error);
    }
  };

  const loadUserPortfolio = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('user_portfolios')
        .select(`
          *,
          carbon_credits (
            project_name,
            verification_standard,
            price_per_ton
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setUserPortfolio(data);
    } catch (error) {
      console.error('Failed to load user portfolio:', error);
    }
  };

  return (
    <div className="trading-dashboard">
      <div className="dashboard-header">
        <h1>Carbon Credit Trading</h1>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Live' : '🔴 Disconnected'}
          </span>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Market Overview */}
        <div className="market-overview">
          <MarketOverview marketData={marketData} />
        </div>

        {/* Order Book */}
        <div className="order-book">
          <OrderBookDisplay orderBook={orderBook} />
        </div>

        {/* Trading Interface */}
        <div className="trading-interface">
          <TradingInterface 
            onPlaceOrder={placeOrder}
            selectedCredit={selectedCredit}
            user={user}
          />
        </div>

        {/* Recent Trades */}
        <div className="recent-trades">
          <RecentTrades trades={recentTrades} />
        </div>

        {/* User Orders */}
        <div className="user-orders">
          <UserOrders 
            orders={userOrders} 
            onCancelOrder={cancelOrder}
            onRefresh={loadUserOrders}
          />
        </div>

        {/* Portfolio */}
        <div className="user-portfolio">
          <UserPortfolio 
            portfolio={userPortfolio}
            onRefresh={loadUserPortfolio}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Market Overview Component
 */
function MarketOverview({ marketData }) {
  const [timeframe, setTimeframe] = useState('1h');
  
  const marketSummary = Object.values(marketData).reduce((acc, data) => {
    acc.totalVolume += data.volume || 0;
    acc.avgPrice += data.price || 0;
    acc.count += 1;
    return acc;
  }, { totalVolume: 0, avgPrice: 0, count: 0 });

  if (marketSummary.count > 0) {
    marketSummary.avgPrice /= marketSummary.count;
  }

  return (
    <div className="market-overview-container">
      <h3>Market Overview</h3>
      
      <div className="market-stats">
        <div className="stat-card">
          <div className="stat-label">Total Volume (24h)</div>
          <div className="stat-value">{marketSummary.totalVolume.toLocaleString()} tons</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Average Price</div>
          <div className="stat-value">${marketSummary.avgPrice.toFixed(2)}/ton</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Active Markets</div>
          <div className="stat-value">{marketSummary.count}</div>
        </div>
      </div>

      <div className="timeframe-selector">
        {['1h', '4h', '1d', '1w'].map(tf => (
          <button 
            key={tf}
            className={`timeframe-btn ${timeframe === tf ? 'active' : ''}`}
            onClick={() => setTimeframe(tf)}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className="price-chart">
        <PriceChart marketData={marketData} timeframe={timeframe} />
      </div>
    </div>
  );
}

/**
 * Order Book Display Component
 */
function OrderBookDisplay({ orderBook }) {
  const maxQuantity = Math.max(
    ...orderBook.buyLevels.map(level => level.quantity),
    ...orderBook.sellLevels.map(level => level.quantity)
  );

  return (
    <div className="order-book-container">
      <h3>Order Book</h3>
      
      <div className="spread-info">
        <span>Spread: ${orderBook.spread?.toFixed(2) || '0.00'}</span>
      </div>

      <div className="order-book-table">
        {/* Sell Orders (Ask) */}
        <div className="sell-orders">
          <div className="order-header">
            <span>Price</span>
            <span>Quantity</span>
            <span>Total</span>
          </div>
          {orderBook.sellLevels.slice(0, 10).reverse().map((level, index) => (
            <div key={`sell-${index}`} className="order-level sell-level">
              <span className="price">${level.price.toFixed(2)}</span>
              <span className="quantity">{level.quantity.toFixed(2)}</span>
              <span className="total">${(level.price * level.quantity).toFixed(2)}</span>
              <div 
                className="quantity-bar sell-bar"
                style={{ width: `${(level.quantity / maxQuantity) * 100}%` }}
              />
            </div>
          ))}
        </div>

        {/* Buy Orders (Bid) */}
        <div className="buy-orders">
          {orderBook.buyLevels.slice(0, 10).map((level, index) => (
            <div key={`buy-${index}`} className="order-level buy-level">
              <span className="price">${level.price.toFixed(2)}</span>
              <span className="quantity">{level.quantity.toFixed(2)}</span>
              <span className="total">${(level.price * level.quantity).toFixed(2)}</span>
              <div 
                className="quantity-bar buy-bar"
                style={{ width: `${(level.quantity / maxQuantity) * 100}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Trading Interface Component
 */
function TradingInterface({ onPlaceOrder, selectedCredit, user }) {
  const [orderType, setOrderType] = useState('buy');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [orderMode, setOrderMode] = useState('limit'); // limit, market
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !quantity || !price) return;

    setLoading(true);
    try {
      const result = await onPlaceOrder({
        userId: user.id,
        orderType,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        creditId: selectedCredit?.credit_id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      if (result.success) {
        setQuantity('');
        setPrice('');
        alert('Order placed successfully!');
      } else {
        alert(`Failed to place order: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trading-interface-container">
      <h3>Place Order</h3>

      <div className="order-type-selector">
        <button 
          className={`order-type-btn ${orderType === 'buy' ? 'active buy' : ''}`}
          onClick={() => setOrderType('buy')}
        >
          Buy
        </button>
        <button 
          className={`order-type-btn ${orderType === 'sell' ? 'active sell' : ''}`}
          onClick={() => setOrderType('sell')}
        >
          Sell
        </button>
      </div>

      <div className="order-mode-selector">
        <button 
          className={`mode-btn ${orderMode === 'limit' ? 'active' : ''}`}
          onClick={() => setOrderMode('limit')}
        >
          Limit
        </button>
        <button 
          className={`mode-btn ${orderMode === 'market' ? 'active' : ''}`}
          onClick={() => setOrderMode('market')}
        >
          Market
        </button>
      </div>

      <form onSubmit={handleSubmit} className="order-form">
        <div className="form-group">
          <label>Quantity (tons)</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
          />
        </div>

        <div className="form-group">
          <label>Price ($/ton)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            required
            disabled={orderMode === 'market'}
          />
        </div>

        <div className="order-summary">
          <div className="summary-row">
            <span>Total:</span>
            <span>${(parseFloat(quantity || 0) * parseFloat(price || 0)).toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Fee (0.1%):</span>
            <span>${((parseFloat(quantity || 0) * parseFloat(price || 0)) * 0.001).toFixed(2)}</span>
          </div>
        </div>

        <button 
          type="submit" 
          className={`submit-btn ${orderType}`}
          disabled={loading || !user}
        >
          {loading ? 'Placing...' : `${orderType === 'buy' ? 'Buy' : 'Sell'} Carbon Credits`}
        </button>
      </form>
    </div>
  );
}

/**
 * Recent Trades Component
 */
function RecentTrades({ trades }) {
  return (
    <div className="recent-trades-container">
      <h3>Recent Trades</h3>
      
      <div className="trades-list">
        {trades.slice(0, 20).map((trade, index) => (
          <div key={index} className="trade-item">
            <div className="trade-time">
              {new Date(trade.transaction_date).toLocaleTimeString()}
            </div>
            <div className="trade-price">
              ${trade.price_per_ton.toFixed(2)}
            </div>
            <div className="trade-quantity">
              {trade.quantity.toFixed(2)} tons
            </div>
            <div className="trade-total">
              ${trade.total_amount.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * User Orders Component
 */
function UserOrders({ orders, onCancelOrder, onRefresh }) {
  const handleCancel = async (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      const result = await onCancelOrder(orderId);
      if (result.success) {
        onRefresh();
      } else {
        alert(`Failed to cancel order: ${result.error}`);
      }
    }
  };

  return (
    <div className="user-orders-container">
      <h3>Your Orders</h3>
      
      <div className="orders-list">
        {orders.map(order => (
          <div key={order.order_id} className="order-item">
            <div className="order-info">
              <span className={`order-type ${order.order_type}`}>
                {order.order_type.toUpperCase()}
              </span>
              <span className="order-quantity">{order.quantity} tons</span>
              <span className="order-price">${order.price}/ton</span>
              <span className="order-status">{order.status}</span>
            </div>
            <div className="order-actions">
              <button 
                onClick={() => handleCancel(order.order_id)}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * User Portfolio Component
 */
function UserPortfolio({ portfolio, onRefresh }) {
  const totalValue = portfolio.reduce((sum, holding) => 
    sum + (holding.quantity * holding.carbon_credits.price_per_ton), 0
  );

  return (
    <div className="user-portfolio-container">
      <h3>Your Portfolio</h3>
      
      <div className="portfolio-summary">
        <div className="total-value">
          Total Value: ${totalValue.toFixed(2)}
        </div>
      </div>

      <div className="holdings-list">
        {portfolio.map(holding => (
          <div key={holding.portfolio_id} className="holding-item">
            <div className="holding-info">
              <div className="project-name">
                {holding.carbon_credits.project_name}
              </div>
              <div className="holding-details">
                <span>{holding.quantity} tons</span>
                <span>${holding.carbon_credits.price_per_ton}/ton</span>
                <span className="holding-value">
                  ${(holding.quantity * holding.carbon_credits.price_per_ton).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Price Chart Component
 */
function PriceChart({ marketData, timeframe }) {
  const chartData = {
    labels: [], // Will be populated with time labels
    datasets: [{
      label: 'Price ($/ton)',
      data: [], // Will be populated with price data
      borderColor: '#36A2EB',
      backgroundColor: 'rgba(54, 162, 235, 0.1)',
      fill: true
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Price ($/ton)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      }
    }
  };

  return (
    <div className="price-chart-container">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}

// CSS Styles (to be included in your stylesheet)
export const tradingDashboardStyles = `
.trading-dashboard {
  padding: 20px;
  background: #f5f5f5;
  min-height: 100vh;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: auto auto auto;
  gap: 20px;
}

.market-overview,
.order-book,
.trading-interface,
.recent-trades,
.user-orders,
.user-portfolio {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.order-book-table {
  font-family: monospace;
  font-size: 12px;
}

.order-level {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 2px 0;
  position: relative;
}

.quantity-bar {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  opacity: 0.2;
}

.buy-bar {
  background: #4CAF50;
}

.sell-bar {
  background: #F44336;
}

.order-type-selector {
  display: flex;
  margin-bottom: 16px;
}

.order-type-btn {
  flex: 1;
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
}

.order-type-btn.active.buy {
  background: #4CAF50;
  color: white;
}

.order-type-btn.active.sell {
  background: #F44336;
  color: white;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: bold;
}

.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}

.submit-btn.buy {
  background: #4CAF50;
  color: white;
}

.submit-btn.sell {
  background: #F44336;
  color: white;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
`;

export default TradingDashboard;

