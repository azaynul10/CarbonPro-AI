import React, { useState, useEffect } from 'react';
import { Wallet, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { AlgorandWallet, AlgorandUtils } from '../lib/algorand';

interface AlgorandWalletConnectProps {
  onWalletConnect: (wallet: AlgorandWallet, address: string) => void;
  onWalletDisconnect: () => void;
  currentAddress?: string;
}

const AlgorandWalletConnect: React.FC<AlgorandWalletConnectProps> = ({
  onWalletConnect,
  onWalletDisconnect,
  currentAddress
}) => {
  const [wallet, setWallet] = useState<AlgorandWallet | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (currentAddress) {
      setConnected(true);
      loadAccountBalance(currentAddress);
    }
  }, [currentAddress]);

  const loadAccountBalance = async (address: string) => {
    try {
      const result = await AlgorandUtils.getAccountInfo(address);
      if (result.success) {
        const algoBalance = AlgorandUtils.microAlgosToAlgos(result.accountInfo.amount);
        setBalance(algoBalance);
      }
    } catch (error) {
      console.error('Failed to load account balance:', error);
    }
  };

  const connectWallet = async () => {
    setConnecting(true);
    setError(null);

    try {
      const walletInstance = new AlgorandWallet();
      const result = await walletInstance.connectPeraWallet();

      if (result.success && result.activeAccount) {
        setWallet(walletInstance);
        setConnected(true);
        onWalletConnect(walletInstance, result.activeAccount);
        await loadAccountBalance(result.activeAccount);
      } else {
        setError(result.error || 'Failed to connect wallet');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    if (wallet) {
      await wallet.disconnectWallet();
      setWallet(null);
      setConnected(false);
      setBalance(null);
      onWalletDisconnect();
    }
  };

  if (connected && currentAddress) {
    return (
      <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#22BFFD]/20 rounded-lg border border-[#22BFFD]/30">
              <CheckCircle className="w-5 h-5 text-[#22BFFD]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#F5F5F5]">Algorand Wallet Connected</h3>
              <p className="text-sm text-[#F5F5F5]/70">Ready for blockchain transactions</p>
            </div>
          </div>
          <button
            onClick={disconnectWallet}
            className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
          >
            Disconnect
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[#00374C]/10 rounded-lg border border-[#00374C]/20">
            <span className="text-sm font-medium text-[#F5F5F5]/80">Address:</span>
            <span className="text-sm text-[#F5F5F5] font-mono">
              {AlgorandUtils.formatAddress(currentAddress, 6)}
            </span>
          </div>

          {balance !== null && (
            <div className="flex items-center justify-between p-3 bg-[#00374C]/10 rounded-lg border border-[#00374C]/20">
              <span className="text-sm font-medium text-[#F5F5F5]/80">Balance:</span>
              <span className="text-sm text-[#F5F5F5] font-semibold">
                {balance.toFixed(4)} ALGO
              </span>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-[#22BFFD]/10 rounded-lg border border-[#22BFFD]/20">
            <span className="text-sm font-medium text-[#F5F5F5]/80">Network:</span>
            <span className="text-sm text-[#22BFFD] font-semibold">Algorand TestNet</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0D0D0D]/60 backdrop-blur-xl rounded-2xl border border-[#00374C]/30 p-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#22BFFD]/20 rounded-full mb-4 border border-[#22BFFD]/30">
          <Wallet className="w-8 h-8 text-[#22BFFD]" />
        </div>

        <h3 className="text-xl font-semibold text-[#F5F5F5] mb-2">
          Connect Algorand Wallet
        </h3>
        <p className="text-[#F5F5F5]/70 mb-6">
          Connect your Algorand wallet to trade carbon credits on the blockchain
        </p>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}

        <button
          onClick={connectWallet}
          disabled={connecting}
          className="inline-flex items-center space-x-3 bg-gradient-to-r from-[#22BFFD] to-[#00374C] text-white px-8 py-3 rounded-xl font-semibold hover:from-[#22BFFD]/80 hover:to-[#00374C]/80 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
        >
          {connecting ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              <span>Connect PeraWallet</span>
            </>
          )}
        </button>

        <div className="mt-6 text-xs text-[#F5F5F5]/50">
          <p>Supported wallets: PeraWallet</p>
          <p>Network: Algorand TestNet</p>
        </div>
      </div>
    </div>
  );
};

export default AlgorandWalletConnect;