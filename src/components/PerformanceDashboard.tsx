import React, { useState, useEffect } from 'react';
import { Activity, Zap, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Monitor, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { usePerformanceMonitor } from '../lib/performanceMonitor';
import { cacheManager } from '../lib/optimizedCache';

const PerformanceDashboard: React.FC = () => {
  const { metrics, alerts, recordMetric } = usePerformanceMonitor();
  const [cacheStats, setCacheStats] = useState<Record<string, any>>({});
  const [systemHealth, setSystemHealth] = useState<'healthy' | 'warning' | 'critical'>('healthy');

  useEffect(() => {
    // Update cache stats every 5 seconds
    const interval = setInterval(() => {
      setCacheStats(cacheManager.getAllStats());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Determine system health based on alerts
    const criticalAlerts = alerts.filter(alert => 
      alert.type.includes('HIGH_ERROR') || alert.type.includes('CRITICAL')
    );
    
    if (criticalAlerts.length > 0) {
      setSystemHealth('critical');
    } else if (alerts.length > 5) {
      setSystemHealth('warning');
    } else {
      setSystemHealth('healthy');
    }
  }, [alerts]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'critical': return <AlertTriangle className="w-5 h-5" />;
      default: return <Monitor className="w-5 h-5" />;
    }
  };

  // Prepare chart data for response times
  const responseTimeData = Object.entries(metrics)
    .filter(([name]) => name.includes('api_response'))
    .map(([name, stats]) => ({
      name: name.replace('api_response_', ''),
      average: stats.average || 0,
      p95: stats.p95 || 0,
      p99: stats.p99 || 0
    }));

  // Prepare cache performance data
  const cachePerformanceData = Object.entries(cacheStats).map(([name, stats]) => ({
    name,
    hitRate: stats.hitRate || 0,
    size: stats.size || 0,
    hits: stats.hits || 0,
    misses: stats.misses || 0
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Performance Dashboard</h1>
          <p className="text-gray-600">Real-time system performance monitoring and optimization</p>
        </div>
        
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-full ${getHealthColor(systemHealth)}`}>
          {getHealthIcon(systemHealth)}
          <span className="font-medium capitalize">{systemHealth}</span>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-2xl text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">
                {metrics.api_response_time?.average?.toFixed(0) || '0'}ms
              </div>
              <div className="text-blue-100">Avg Response Time</div>
            </div>
            <Activity className="w-10 h-10 text-blue-200" />
          </div>
          <div className="mt-2 text-sm text-blue-100">
            {metrics.api_response_time?.count || 0} requests tracked
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">
                {Object.values(cacheStats).reduce((acc: number, stats: any) => acc + (stats.hitRate || 0), 0) / Object.keys(cacheStats).length || 0}%
              </div>
              <div className="text-green-100">Cache Hit Rate</div>
            </div>
            <Database className="w-10 h-10 text-green-200" />
          </div>
          <div className="mt-2 text-sm text-green-100">
            {Object.values(cacheStats).reduce((acc: number, stats: any) => acc + (stats.size || 0), 0)} cached items
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{alerts.length}</div>
              <div className="text-purple-100">Active Alerts</div>
            </div>
            <AlertTriangle className="w-10 h-10 text-purple-200" />
          </div>
          <div className="mt-2 text-sm text-purple-100">
            Last 5 minutes
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">
                {metrics.memory_usage_percent?.average?.toFixed(1) || '0'}%
              </div>
              <div className="text-orange-100">Memory Usage</div>
            </div>
            <Monitor className="w-10 h-10 text-orange-200" />
          </div>
          <div className="mt-2 text-sm text-orange-100">
            {metrics.fps?.average?.toFixed(0) || '60'} FPS
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Response Time Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">API Response Times</h3>
          {responseTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="average" fill="#10b981" name="Average" />
                <Bar dataKey="p95" fill="#3b82f6" name="95th Percentile" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No response time data available
            </div>
          )}
        </div>

        {/* Cache Performance Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Cache Performance</h3>
          {cachePerformanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cachePerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="hitRate" fill="#8b5cf6" name="Hit Rate %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No cache data available
            </div>
          )}
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Metrics */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Performance Metrics</h3>
          
          <div className="space-y-4">
            {Object.entries(metrics).map(([name, stats]) => (
              <div key={name} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="font-medium text-gray-800 capitalize">
                    {name.replace(/_/g, ' ')}
                  </div>
                  <div className="text-sm text-gray-600">
                    {stats.count} samples
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-800">
                    {stats.average?.toFixed(2)}ms
                  </div>
                  <div className="text-sm text-gray-600">
                    P95: {stats.p95?.toFixed(2)}ms
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Active Alerts</h3>
          
          <div className="space-y-4">
            {alerts.length > 0 ? (
              alerts.slice(0, 10).map((alert, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-red-800">{alert.type}</div>
                    <div className="text-sm text-red-700">{alert.message}</div>
                    <div className="text-xs text-red-600 mt-1">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p>No active alerts</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cache Details */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-6">Cache Statistics</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(cacheStats).map(([name, stats]) => (
            <div key={name} className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-800 capitalize">{name}</h4>
                <Database className="w-5 h-5 text-gray-600" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Hit Rate:</span>
                  <span className="font-medium">{stats.hitRate?.toFixed(1) || 0}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Size:</span>
                  <span className="font-medium">{stats.size || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Hits:</span>
                  <span className="font-medium">{stats.hits || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Misses:</span>
                  <span className="font-medium">{stats.misses || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Evictions:</span>
                  <span className="font-medium">{stats.evictions || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;