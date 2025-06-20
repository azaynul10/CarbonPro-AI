import React from 'react';
import { Bell, Settings, Wallet, Search, Globe } from 'lucide-react';

interface User {
  user_id: string;
  email: string;
  wallet_address: string;
  verification_status: boolean;
  created_at: string;
}

interface HeaderProps {
  user: User;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  return (
    <header className="bg-[#0D0D0D]/80 backdrop-blur-xl border-b border-[#00374C]/30 px-8 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div>
            <h2 className="text-2xl font-bold text-[#F5F5F5]">Carbon Trading Hub</h2>
            <p className="text-[#F5F5F5]/60">Real-time environmental asset marketplace</p>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#F5F5F5]/40" />
            <input
              type="text"
              placeholder="Search credits, projects..."
              className="bg-[#00374C]/20 border border-[#00374C]/40 rounded-xl pl-10 pr-4 py-3 text-[#F5F5F5] placeholder-[#F5F5F5]/40 focus:outline-none focus:border-[#22BFFD]/50 focus:ring-2 focus:ring-[#22BFFD]/20 transition-all duration-300 w-80"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 bg-[#00374C]/20 px-4 py-3 rounded-xl border border-[#00374C]/40">
            <Globe className="w-4 h-4 text-[#22BFFD]" />
            <span className="text-sm font-medium text-[#F5F5F5]">TestNet</span>
          </div>
          
          <div className="flex items-center space-x-3 bg-gradient-to-r from-[#22BFFD]/10 to-[#00374C]/10 px-4 py-3 rounded-xl border border-[#22BFFD]/30">
            <Wallet className="w-4 h-4 text-[#22BFFD]" />
            <span className="text-sm font-medium text-[#F5F5F5]">
              {user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)}
            </span>
            {user.verification_status && (
              <div className="w-2 h-2 bg-[#22BFFD] rounded-full animate-pulse"></div>
            )}
          </div>
          
          <button className="p-3 text-[#F5F5F5]/70 hover:text-[#22BFFD] hover:bg-[#00374C]/20 rounded-xl transition-all duration-300">
            <Bell className="w-5 h-5" />
          </button>
          
          <button className="p-3 text-[#F5F5F5]/70 hover:text-[#22BFFD] hover:bg-[#00374C]/20 rounded-xl transition-all duration-300">
            <Settings className="w-5 h-5" />
          </button>
          
          <div className="w-10 h-10 bg-gradient-to-br from-[#22BFFD] to-[#00374C] rounded-xl flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {user.email.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;