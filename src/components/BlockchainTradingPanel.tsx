import React, { useState, useEffect } from 'react';
import { Shield, Zap, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { AlgorandWallet, CarbonCreditAsset, CarbonTradingContract } from '../lib/algorand';
import { CarbonCredit } from '../types/database';

interface BlockchainTradingPanelProps {
  wallet: AlgorandWallet;
  selectedCredit: CarbonCredit;
  orderType: 'buy' | 'sell';
  quantity: number;
  price: number;
  onTransactionComplete: (txId: string) => void;
}

const BlockchainTradingPanel: React.FC<BlockchainTradingPanelProps> = ({
  wallet,
  selectedCredit,
  orderType,
  quantity,
  price,
  onTransactionComplete
}) => {
  const [assetManager, setAssetManager] = useState<CarbonCreditAsset | null>(null);
  const [tradingContract, setTradingContract] = useState<CarbonTradingContract | null>(null);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'prepare' | 'optin' | 'execute' | 'complete'>('prepare');
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assetBalance, setAssetBalance] = useState<number>(0);
  const [optedIn, setOptedIn] = useState(false);

  useEffect(() => {
    if (wallet) {
      const manager = new CarbonCreditAsset(wallet);
      const contract = new CarbonTradingContract(wallet);
      setAssetManager(manager);
      setTradingContract(contract);
      
      checkAssetStatus();
    }
  }, [wallet, selectedCredit]);

  const checkAssetStatus = async () => {
    if (!wallet.isConnected() || !selectedCredit.algorand_asset_id) return;

    try {
      const manager = new CarbonCreditAsset(wallet);
      const result = await manager.getAssetBalance(
        wallet.getActiveAccount()!,
        selectedCredit.algorand_asset_id
      );

      if (result.success) {
        setAssetBalance(result.balance);
        setOptedIn(result.optedIn);
      }
    } catch (error) {
      console.error('Failed to check asset status:', error);
    }
  };

  const handleOptIn = async () => {
    if (!assetManager || !selectedCredit.algorand_asset_id) return;

    setProcessing(true);
    setStep('optin');
    setError(null);

    try {
      const result = await assetManager.optInToAsset(selectedCredit.algorand_asset_id);
      
      if (result.success) {
        setOptedIn(true);
        setStep('prepare');
      } else {
        setError(result.error || 'Failed to opt-in to asset');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to opt-in to asset');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!tradingContract || !selectedCredit.algorand_asset_id) return;

    setProcessing(true);
    setStep('execute');
    setError(null);

    try {
      const orderDetails = {
        orderType,
        quantity,
        price,
        assetId: selectedCredit.algorand_asset_id,
        creditId: selectedCredit.credit_id
      };

      const result = await tradingContract.createTradingOrder(orderDetails);
      
      if (result.success) {
        setTxId(result.txId);
        setStep('complete');
        onTransactionComplete(result.txId);
      } else {
        setError(result.error || 'Failed to create order');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create order');
    } finally {
      setProcessing(false);
    }
  };

  const totalCost = quantity * price;
  const estimatedFees = 0.001;

  const getStepIcon = (stepName: string) => {
    if (step === stepName && processing) {
      return <Clock className="w-5 h-5 text-[#22BFFD] animate-spin" />;
    }
    
    switch (stepName) {
      case 'prepare':
        return step === 'prepare' ? 
          <Shield className="w-5 h-5 text-[#22BFFD]" /> : 
          <CheckCircle className="w-5 h-5 text-[#22BFFD]" />;
      case 'optin':
        return !optedIn ? 
          <Zap className="w-5 h-5 text-[#00374C]" /> : 
          <CheckCircle className="w-5 h-5 text-[#22BFFD]" />;
      case 'execute':
        return step === 'execute' ? 
          <TrendingUp className="w-5 h-5 text-[#22BFFD]" /> : 
          step === 'complete' ? 
          <CheckCircle className="w-5 h-5 text-[#22BFFD]" /> :
          <TrendingUp className="w-5 h-5 text-[#F5F5F5]/40" />;
      default:
        return <CheckCircle className="w-5 h-5 text-[#F5F5F5]/40" />;
    }
  };

  return (
    <div className="bg-[#0D0D0D]/90 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-8">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-[#22BFFD]/20 rounded-lg border border-[#22BFFD]/30">
          <Shield className="w-6 h-6 text-[#22BFFD]" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-[#F5F5F5]">Blockchain Transaction</h3>
          <p className="text-sm text-[#F5F5F5]/70">Secure on-chain carbon credit trading</p>
        </div>
      </div>

      {/* Transaction Summary */}
      <div className="bg-[#00374C]/10 rounded-xl p-6 mb-6 border border-[#00374C]/20">
        <h4 className="font-semibold text-[#F5F5F5] mb-4">Transaction Summary</h4>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-[#F5F5F5]/70">Action:</span>
            <span className={`font-semibold capitalize ${
              orderType === 'buy' ? 'text-[#22BFFD]' : 'text-red-400'
            }`}>
              {orderType} Carbon Credits
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-[#F5F5F5]/70">Project:</span>
            <span className="font-medium text-[#F5F5F5]">{selectedCredit.project_name}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-[#F5F5F5]/70">Quantity:</span>
            <span className="font-medium text-[#F5F5F5]">{quantity} tons</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-[#F5F5F5]/70">Price per ton:</span>
            <span className="font-medium text-[#F5F5F5]">${price.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between border-t border-[#00374C]/30 pt-3">
            <span className="font-semibold text-[#F5F5F5]">Total Cost:</span>
            <span className="font-bold text-[#F5F5F5]">${totalCost.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-[#F5F5F5]/70">Est. Network Fees:</span>
            <span className="text-[#F5F5F5]/70">{estimatedFees} ALGO</span>
          </div>
        </div>
      </div>

      {/* Transaction Steps */}
      <div className="space-y-4 mb-6">
        <h4 className="font-semibold text-[#F5F5F5]">Transaction Steps</h4>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-[#00374C]/10 rounded-lg border border-[#00374C]/20">
            {getStepIcon('prepare')}
            <div className="flex-1">
              <div className="font-medium text-[#F5F5F5]">Prepare Transaction</div>
              <div className="text-sm text-[#F5F5F5]/70">Validate order details and wallet connection</div>
            </div>
          </div>

          {!optedIn && (
            <div className="flex items-center space-x-3 p-3 bg-[#00374C]/10 rounded-lg border border-[#00374C]/20">
              {getStepIcon('optin')}
              <div className="flex-1">
                <div className="font-medium text-[#F5F5F5]">Asset Opt-in Required</div>
                <div className="text-sm text-[#F5F5F5]/70">Enable receiving this carbon credit asset</div>
              </div>
              <button
                onClick={handleOptIn}
                disabled={processing}
                className="px-4 py-2 bg-[#00374C] text-[#F5F5F5] rounded-lg text-sm font-medium hover:bg-[#00374C]/80 disabled:opacity-50 transition-colors"
              >
                Opt-in
              </button>
            </div>
          )}

          <div className="flex items-center space-x-3 p-3 bg-[#00374C]/10 rounded-lg border border-[#00374C]/20">
            {getStepIcon('execute')}
            <div className="flex-1">
              <div className="font-medium text-[#F5F5F5]">Execute Order</div>
              <div className="text-sm text-[#F5F5F5]/70">Submit transaction to Algorand blockchain</div>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Information */}
      {selectedCredit.algorand_asset_id && (
        <div className="bg-[#22BFFD]/10 rounded-xl p-4 mb-6 border border-[#22BFFD]/20">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className="w-4 h-4 text-[#22BFFD]" />
            <span className="text-sm font-medium text-[#22BFFD]">Blockchain Asset Info</span>
          </div>
          <div className="text-xs text-[#F5F5F5]/70 space-y-1">
            <div>Asset ID: {selectedCredit.algorand_asset_id}</div>
            <div>Your Balance: {assetBalance.toFixed(2)} tons</div>
            <div>Status: {optedIn ? 'Opted-in' : 'Not opted-in'}</div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-6">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-sm text-red-400">{error}</span>
        </div>
      )}

      {/* Success Display */}
      {step === 'complete' && txId && (
        <div className="flex items-center space-x-2 p-4 bg-[#22BFFD]/10 border border-[#22BFFD]/30 rounded-lg mb-6">
          <CheckCircle className="w-5 h-5 text-[#22BFFD]" />
          <div className="flex-1">
            <div className="text-sm font-medium text-[#22BFFD]">Transaction Successful!</div>
            <div className="text-xs text-[#F5F5F5]/70 font-mono">TX: {txId.slice(0, 20)}...</div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleCreateOrder}
        disabled={processing || !optedIn || step === 'complete'}
        className={`w-full py-4 rounded-xl font-semibold transition-all duration-300 ${
          orderType === 'buy'
            ? 'bg-gradient-to-r from-[#22BFFD] to-[#00374C] hover:from-[#22BFFD]/80 hover:to-[#00374C]/80 text-white'
            : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105`}
      >
        {processing ? (
          <div className="flex items-center justify-center space-x-2">
            <Clock className="w-5 h-5 animate-spin" />
            <span>Processing Transaction...</span>
          </div>
        ) : step === 'complete' ? (
          'Transaction Complete'
        ) : (
          `Execute ${orderType === 'buy' ? 'Buy' : 'Sell'} Order`
        )}
      </button>

      <div className="mt-4 text-xs text-[#F5F5F5]/50 text-center">
        <p>Transactions are secured by the Algorand blockchain</p>
        <p>Network: TestNet • Fees: ~0.001 ALGO</p>
      </div>
    </div>
  );
};

export default BlockchainTradingPanel;