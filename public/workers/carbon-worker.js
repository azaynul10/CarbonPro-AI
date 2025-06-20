/**
 * Web Worker for Carbon Calculation Tasks
 * Handles heavy computations in background thread
 */

// Import calculation functions (simplified versions for worker)
importScripts('/workers/carbon-calculations.js');

self.onmessage = function(event) {
  const { taskId, type, data } = event.data;

  try {
    let result;

    switch (type) {
      case 'carbon_prediction':
        result = calculateCarbonPrediction(data.consumptionData, data.period);
        break;
      
      case 'market_data_processing':
        result = processMarketData(data.data);
        break;
      
      case 'orderbook_analytics':
        result = calculateOrderBookAnalytics(data.orderBook);
        break;
      
      case 'performance_report':
        result = generatePerformanceReport(data.metrics);
        break;
      
      default:
        throw new Error(`Unknown task type: ${type}`);
    }

    self.postMessage({
      taskId,
      result
    });
  } catch (error) {
    self.postMessage({
      taskId,
      error: error.message
    });
  }
};

/**
 * Calculate carbon prediction (simplified worker version)
 */
function calculateCarbonPrediction(consumptionData, period) {
  const startTime = performance.now();
  
  // Simplified calculation logic
  const baseEmissions = {
    residential: (consumptionData.energyUsage || 0) * 0.4,
    transportation: ((consumptionData.transportation?.weeklyMiles || 0) * 52 * 0.4) / 12,
    dietary: getDietaryEmissions(consumptionData.diet) * 30,
    waste: (consumptionData.wasteGeneration || 20) * 0.5 * 4.33,
    energy: (consumptionData.energyUsage || 0) * 0.35
  };

  const totalEmissions = Object.values(baseEmissions).reduce((sum, val) => sum + val, 0);
  
  // Apply period multiplier
  const periodMultipliers = { monthly: 1, quarterly: 3, yearly: 12 };
  const adjustedEmissions = totalEmissions * (periodMultipliers[period] || 1);

  const calculationTime = performance.now() - startTime;

  return {
    totalPredictedEmissions: Math.round(adjustedEmissions * 100) / 100,
    breakdown: baseEmissions,
    confidenceScore: 85,
    calculationTime,
    recommendations: generateRecommendations(baseEmissions)
  };
}

/**
 * Get dietary emissions factor
 */
function getDietaryEmissions(diet) {
  const factors = {
    vegan: 1.5,
    vegetarian: 1.7,
    pescatarian: 2.3,
    mixed: 2.5,
    high_meat: 3.3
  };
  return factors[diet] || factors.mixed;
}

/**
 * Generate recommendations based on emissions
 */
function generateRecommendations(breakdown) {
  const recommendations = [];
  
  if (breakdown.residential > 300) {
    recommendations.push({
      title: 'Reduce energy consumption',
      description: 'Switch to LED lighting and energy-efficient appliances',
      potentialReduction: breakdown.residential * 0.2
    });
  }
  
  if (breakdown.transportation > 200) {
    recommendations.push({
      title: 'Use sustainable transport',
      description: 'Consider public transport or electric vehicles',
      potentialReduction: breakdown.transportation * 0.3
    });
  }
  
  return recommendations;
}

/**
 * Process market data
 */
function processMarketData(rawData) {
  const startTime = performance.now();
  
  if (!Array.isArray(rawData) || rawData.length === 0) {
    return { processedData: [], processingTime: 0 };
  }

  // Calculate moving averages
  const processedData = rawData.map((item, index) => {
    const windowSize = Math.min(5, index + 1);
    const window = rawData.slice(Math.max(0, index - windowSize + 1), index + 1);
    
    const movingAverage = window.reduce((sum, w) => sum + w.price, 0) / window.length;
    const volatility = calculateVolatility(window.map(w => w.price));
    
    return {
      ...item,
      movingAverage: Math.round(movingAverage * 100) / 100,
      volatility: Math.round(volatility * 100) / 100
    };
  });

  const processingTime = performance.now() - startTime;

  return {
    processedData,
    processingTime,
    summary: {
      totalRecords: rawData.length,
      averagePrice: processedData.reduce((sum, item) => sum + item.price, 0) / processedData.length,
      priceRange: {
        min: Math.min(...processedData.map(item => item.price)),
        max: Math.max(...processedData.map(item => item.price))
      }
    }
  };
}

/**
 * Calculate volatility
 */
function calculateVolatility(prices) {
  if (prices.length < 2) return 0;
  
  const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
  
  return Math.sqrt(variance);
}

/**
 * Calculate order book analytics
 */
function calculateOrderBookAnalytics(orderBook) {
  const startTime = performance.now();
  
  const { buyLevels = [], sellLevels = [] } = orderBook;
  
  // Calculate depth and liquidity metrics
  const buyDepth = buyLevels.reduce((sum, level) => sum + level.quantity, 0);
  const sellDepth = sellLevels.reduce((sum, level) => sum + level.quantity, 0);
  
  const bestBid = buyLevels.length > 0 ? buyLevels[0].price : 0;
  const bestAsk = sellLevels.length > 0 ? sellLevels[0].price : 0;
  const spread = bestAsk - bestBid;
  const midPrice = (bestBid + bestAsk) / 2;
  
  // Calculate imbalance
  const imbalance = buyDepth / (buyDepth + sellDepth) - 0.5;
  
  const calculationTime = performance.now() - startTime;
  
  return {
    depth: {
      buy: buyDepth,
      sell: sellDepth,
      total: buyDepth + sellDepth
    },
    prices: {
      bestBid,
      bestAsk,
      spread,
      midPrice
    },
    imbalance,
    liquidity: {
      score: Math.min(100, (buyDepth + sellDepth) / 10), // Simplified liquidity score
      quality: spread < 1 ? 'high' : spread < 5 ? 'medium' : 'low'
    },
    calculationTime
  };
}

/**
 * Generate performance report
 */
function generatePerformanceReport(metrics) {
  const startTime = performance.now();
  
  const report = {
    summary: {
      totalMetrics: Object.keys(metrics).length,
      timestamp: new Date().toISOString()
    },
    performance: {},
    recommendations: []
  };
  
  // Analyze each metric
  for (const [name, stats] of Object.entries(metrics)) {
    if (stats && typeof stats === 'object' && stats.average !== undefined) {
      report.performance[name] = {
        average: Math.round(stats.average * 100) / 100,
        p95: Math.round((stats.p95 || 0) * 100) / 100,
        count: stats.count || 0,
        status: getPerformanceStatus(name, stats.average)
      };
      
      // Generate recommendations
      if (name.includes('api_response') && stats.average > 1000) {
        report.recommendations.push(`Optimize ${name} - response time is ${stats.average.toFixed(0)}ms`);
      }
    }
  }
  
  const calculationTime = performance.now() - startTime;
  report.calculationTime = calculationTime;
  
  return report;
}

/**
 * Get performance status
 */
function getPerformanceStatus(metricName, value) {
  if (metricName.includes('api_response')) {
    if (value < 500) return 'excellent';
    if (value < 1000) return 'good';
    if (value < 2000) return 'fair';
    return 'poor';
  }
  
  if (metricName.includes('prediction')) {
    if (value < 1000) return 'excellent';
    if (value < 2000) return 'good';
    if (value < 5000) return 'fair';
    return 'poor';
  }
  
  return 'unknown';
}