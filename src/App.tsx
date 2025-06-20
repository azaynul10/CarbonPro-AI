import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import PredictionEngine from './components/PredictionEngine';
import TradingMarketplace from './components/TradingMarketplace';
import UserProfile from './components/UserProfile';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { User } from './types/database';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Mock user data - in a real app, this would come from authentication
  const [user] = useState<User>({
    user_id: 'e0821669-3adc-476d-ae90-7e61db256614',
    email: 'user@carbonpro.com',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-20T15:45:00Z',
    wallet_address: '0x742d35Cc6641C27285CfE9A3a12345678901234A',
    verification_status: true,
    profile_data: {},
    total_emissions: 2.4,
    carbon_credits_owned: 156.5
  });

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={user} />;
      case 'predictions':
        return <PredictionEngine user={user} />;
      case 'trading':
        return <TradingMarketplace user={user} />;
      case 'profile':
        return <UserProfile user={user} />;
      default:
        return <Dashboard user={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F5]">
      <div className="flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="flex-1 flex flex-col">
          <Header user={user} />
          <main className="flex-1 p-8">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;