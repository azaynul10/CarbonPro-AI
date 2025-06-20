import React from 'react';
import { DivideIcon as LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: LucideIcon;
  color: 'green' | 'blue' | 'aqua' | 'teal';
  trend?: 'up' | 'down';
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  isPositive, 
  icon: Icon, 
  color,
  trend = 'up'
}) => {
  const colorClasses = {
    green: 'from-[#22BFFD]/20 to-[#00374C]/20 border-[#22BFFD]/30',
    blue: 'from-[#00374C]/20 to-[#22BFFD]/20 border-[#00374C]/30',
    aqua: 'from-[#22BFFD]/20 to-[#00374C]/20 border-[#22BFFD]/30',
    teal: 'from-[#00374C]/20 to-[#22BFFD]/20 border-[#00374C]/30'
  };

  const iconColors = {
    green: 'text-[#22BFFD]',
    blue: 'text-[#00374C]',
    aqua: 'text-[#22BFFD]',
    teal: 'text-[#00374C]'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-xl rounded-2xl border p-6 hover:scale-105 transition-all duration-300 group`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br from-[#22BFFD]/20 to-[#00374C]/20 border border-[#22BFFD]/30 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-6 h-6 ${iconColors[color]}`} />
        </div>
        <div className="flex items-center space-x-1">
          {trend === 'up' ? (
            <TrendingUp className={`w-4 h-4 ${isPositive ? 'text-[#22BFFD]' : 'text-red-400'}`} />
          ) : (
            <TrendingDown className={`w-4 h-4 ${isPositive ? 'text-[#22BFFD]' : 'text-red-400'}`} />
          )}
          <span className={`text-sm font-medium ${
            isPositive ? 'text-[#22BFFD]' : 'text-red-400'
          }`}>
            {change}
          </span>
        </div>
      </div>
      
      <div>
        <h3 className="text-3xl font-bold text-[#F5F5F5] mb-2 group-hover:text-[#22BFFD] transition-colors duration-300">
          {value}
        </h3>
        <p className="text-sm text-[#F5F5F5]/70">{title}</p>
      </div>
    </div>
  );
};

export default MetricCard;