import React from 'react';
import { BarChart3, TrendingUp, ShoppingCart, User, Leaf, Activity, Brain } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'predictions', label: 'AI Predictions', icon: Brain },
    { id: 'trading', label: 'Trading', icon: Activity },
    { id: 'profile', label: 'Portfolio', icon: User },
  ];

  return (
    <div className="w-72 bg-[#0D0D0D] border-r border-[#00374C]/30 backdrop-blur-xl">
      <div className="p-8 border-b border-[#00374C]/30">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-[#22BFFD] to-[#00374C] rounded-xl">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#F5F5F5]">CarbonPro</h1>
            <p className="text-sm text-[#22BFFD]">Trading Platform</p>
          </div>
        </div>
      </div>
      
      <nav className="p-6 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-4 px-4 py-4 rounded-xl text-left transition-all duration-300 group ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-[#22BFFD]/20 to-[#00374C]/20 text-[#22BFFD] border border-[#22BFFD]/30'
                  : 'text-[#F5F5F5]/70 hover:bg-[#00374C]/20 hover:text-[#F5F5F5]'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-300 ${
                activeTab === item.id ? 'scale-110' : 'group-hover:scale-105'
              }`} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;