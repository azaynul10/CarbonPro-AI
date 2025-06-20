import algosdk from 'algosdk';

// Algorand network configuration
const ALGORAND_CONFIG = {
  // TestNet configuration (switch to MainNet for production)
  algodToken: '',
  algodServer: 'https://testnet-api.algonode.cloud',
  algodPort: 443,
  indexerToken: '',
  indexerServer: 'https://testnet-idx.algonode.cloud',
  indexerPort: 443,
  network: 'testnet'
};

// Initialize Algorand clients
export const algodClient = new algosdk.Algodv2(
  ALGORAND_CONFIG.algodToken,
  ALGORAND_CONFIG.algodServer,
  ALGORAND_CONFIG.algodPort
);

export const indexerClient = new algosdk.Indexer(
  ALGORAND_CONFIG.indexerToken,
  ALGORAND_CONFIG.indexerServer,
  ALGORAND_CONFIG.indexerPort
);

// Carbon Credit Asset Configuration
const CARBON_CREDIT_CONFIG = {
  unitName: 'CARBON',
  assetName: 'Carbon Credit Token',
  decimals: 2, // Allow fractional carbon credits
  defaultFrozen: false,
  manager: null, // Will be set to marketplace address
  reserve: null,
  freeze: null,
  clawback: null
};

/**
 * Connect to Algorand wallet (PeraWallet, MyAlgo, etc.)
 */
export class AlgorandWallet {
  connector: any;
  accounts: string[];
  activeAccount: string | null;

  constructor() {
    this.connector = null;
    this.accounts = [];
    this.activeAccount = null;
  }

  async connectPeraWallet() {
    try {
      // Import PeraWallet dynamically
      const { PeraWalletConnect } = await import('@perawallet/connect');
      this.connector = new PeraWalletConnect();
      
      const accounts = await this.connector.connect();
      this.accounts = accounts;
      this.activeAccount = accounts[0];
      
      return {
        success: true,
        accounts: this.accounts,
        activeAccount: this.activeAccount
      };
    } catch (error: any) {
      console.error('Failed to connect to PeraWallet:', error);
      return { success: false, error: error.message };
    }
  }

  async disconnectWallet() {
    if (this.connector) {
      await this.connector.disconnect();
      this.connector = null;
      this.accounts = [];
      this.activeAccount = null;
    }
  }

  isConnected() {
    return this.activeAccount !== null;
  }

  getActiveAccount() {
    return this.activeAccount;
  }
}

/**
 * Carbon Credit Asset Management
 */
export class CarbonCreditAsset {
  wallet: AlgorandWallet;

  constructor(walletInstance: AlgorandWallet) {
    this.wallet = walletInstance;
  }

  /**
   * Create a new carbon credit asset on Algorand
   */
  async createCarbonCreditAsset(projectDetails: any) {
    try {
      if (!this.wallet.isConnected()) {
        throw new Error('Wallet not connected');
      }

      const suggestedParams = await algodClient.getTransactionParams().do();
      const creator = this.wallet.getActiveAccount()!;

      // Create asset creation transaction
      const assetCreateTxn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
        from: creator,
        suggestedParams,
        total: Math.floor(projectDetails.totalQuantity * 100), // Convert to smallest unit
        decimals: CARBON_CREDIT_CONFIG.decimals,
        defaultFrozen: CARBON_CREDIT_CONFIG.defaultFrozen,
        manager: creator,
        reserve: creator,
        freeze: undefined,
        clawback: undefined,
        unitName: CARBON_CREDIT_CONFIG.unitName,
        assetName: `${projectDetails.projectName} Carbon Credit`,
        assetURL: projectDetails.projectURL || '',
        assetMetadataHash: projectDetails.metadataHash || undefined,
        note: new Uint8Array(Buffer.from(JSON.stringify({
          projectType: projectDetails.projectType,
          verificationStandard: projectDetails.verificationStandard,
          vintageYear: projectDetails.vintageYear,
          location: projectDetails.location
        })))
      });

      // Sign and submit transaction
      const signedTxn = await this.wallet.connector.signTransaction([assetCreateTxn]);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      // Wait for confirmation
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
      const assetId = confirmedTxn['asset-index'];

      return {
        success: true,
        assetId,
        txId,
        confirmedRound: confirmedTxn['confirmed-round']
      };
    } catch (error: any) {
      console.error('Failed to create carbon credit asset:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Transfer carbon credits between accounts
   */
  async transferCarbonCredits(assetId: number, toAddress: string, amount: number, note = '') {
    try {
      if (!this.wallet.isConnected()) {
        throw new Error('Wallet not connected');
      }

      const suggestedParams = await algodClient.getTransactionParams().do();
      const fromAddress = this.wallet.getActiveAccount()!;

      // Create asset transfer transaction
      const assetTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: fromAddress,
        to: toAddress,
        assetIndex: assetId,
        amount: Math.floor(amount * 100), // Convert to smallest unit
        suggestedParams,
        note: new Uint8Array(Buffer.from(note))
      });

      // Sign and submit transaction
      const signedTxn = await this.wallet.connector.signTransaction([assetTransferTxn]);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      // Wait for confirmation
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

      return {
        success: true,
        txId,
        confirmedRound: confirmedTxn['confirmed-round'],
        amount,
        from: fromAddress,
        to: toAddress
      };
    } catch (error: any) {
      console.error('Failed to transfer carbon credits:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Opt-in to receive a carbon credit asset
   */
  async optInToAsset(assetId: number) {
    try {
      if (!this.wallet.isConnected()) {
        throw new Error('Wallet not connected');
      }

      const suggestedParams = await algodClient.getTransactionParams().do();
      const account = this.wallet.getActiveAccount()!;

      // Create opt-in transaction (transfer 0 to self)
      const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: account,
        to: account,
        assetIndex: assetId,
        amount: 0,
        suggestedParams
      });

      // Sign and submit transaction
      const signedTxn = await this.wallet.connector.signTransaction([optInTxn]);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      // Wait for confirmation
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

      return {
        success: true,
        txId,
        confirmedRound: confirmedTxn['confirmed-round']
      };
    } catch (error: any) {
      console.error('Failed to opt-in to asset:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get asset information
   */
  async getAssetInfo(assetId: number) {
    try {
      const assetInfo = await algodClient.getAssetByID(assetId).do();
      return {
        success: true,
        assetInfo
      };
    } catch (error: any) {
      console.error('Failed to get asset info:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get account's asset balance
   */
  async getAssetBalance(address: string, assetId: number) {
    try {
      const accountInfo = await algodClient.accountInformation(address).do();
      const asset = accountInfo.assets.find((a: any) => a['asset-id'] === assetId);
      
      if (!asset) {
        return { success: true, balance: 0, optedIn: false };
      }

      return {
        success: true,
        balance: asset.amount / 100, // Convert from smallest unit
        optedIn: true,
        frozen: asset['is-frozen']
      };
    } catch (error: any) {
      console.error('Failed to get asset balance:', error);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Smart Contract for Carbon Credit Trading
 */
export class CarbonTradingContract {
  wallet: AlgorandWallet;
  appId: number | null;

  constructor(walletInstance: AlgorandWallet) {
    this.wallet = walletInstance;
    this.appId = null; // Will be set after deployment
  }

  /**
   * Create a trading order on the blockchain
   */
  async createTradingOrder(orderDetails: any) {
    try {
      if (!this.wallet.isConnected()) {
        throw new Error('Wallet not connected');
      }

      const suggestedParams = await algodClient.getTransactionParams().do();
      const sender = this.wallet.getActiveAccount()!;

      // For now, we'll create a simple payment transaction as a placeholder
      // In production, this would interact with a deployed smart contract
      const noteData = {
        type: 'carbon_credit_order',
        orderType: orderDetails.orderType,
        quantity: orderDetails.quantity,
        price: orderDetails.price,
        assetId: orderDetails.assetId,
        timestamp: Date.now()
      };

      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: sender,
        to: sender, // Self-transaction for order creation
        amount: 1000, // Minimal amount (0.001 ALGO)
        suggestedParams,
        note: new Uint8Array(Buffer.from(JSON.stringify(noteData)))
      });

      const signedTxn = await this.wallet.connector.signTransaction([txn]);
      const { txId } = await algodClient.sendRawTransaction(signedTxn).do();
      
      const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

      return {
        success: true,
        txId,
        confirmedRound: confirmedTxn['confirmed-round'],
        orderDetails
      };
    } catch (error: any) {
      console.error('Failed to create trading order:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute an atomic swap for carbon credit trading
   */
  async executeAtomicSwap(buyerAddress: string, sellerAddress: string, assetId: number, quantity: number, price: number) {
    try {
      if (!this.wallet.isConnected()) {
        throw new Error('Wallet not connected');
      }

      const suggestedParams = await algodClient.getTransactionParams().do();

      // Create atomic transaction group
      const transactions = [];

      // 1. Payment from buyer to seller
      const paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: buyerAddress,
        to: sellerAddress,
        amount: Math.floor(quantity * price * 1000000), // Convert to microAlgos
        suggestedParams,
        note: new Uint8Array(Buffer.from(`Carbon credit purchase: ${quantity} tons`))
      });

      // 2. Asset transfer from seller to buyer
      const assetTransferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: sellerAddress,
        to: buyerAddress,
        assetIndex: assetId,
        amount: Math.floor(quantity * 100),
        suggestedParams,
        note: new Uint8Array(Buffer.from(`Carbon credit sale: ${quantity} tons`))
      });

      transactions.push(paymentTxn, assetTransferTxn);

      // Group transactions
      const groupId = algosdk.computeGroupID(transactions);
      transactions.forEach(txn => txn.group = groupId);

      // Note: In a real implementation, both parties would need to sign
      // For now, we'll return the transaction group for external signing
      return {
        success: true,
        transactionGroup: transactions,
        groupId: Buffer.from(groupId).toString('base64')
      };
    } catch (error: any) {
      console.error('Failed to create atomic swap:', error);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Utility functions for Algorand integration
 */
export const AlgorandUtils = {
  /**
   * Convert Algos to microAlgos
   */
  algosToMicroAlgos(algos: number) {
    return Math.floor(algos * 1000000);
  },

  /**
   * Convert microAlgos to Algos
   */
  microAlgosToAlgos(microAlgos: number) {
    return microAlgos / 1000000;
  },

  /**
   * Format Algorand address for display
   */
  formatAddress(address: string, length = 8) {
    if (!address) return '';
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  },

  /**
   * Validate Algorand address
   */
  isValidAddress(address: string) {
    try {
      return algosdk.isValidAddress(address);
    } catch {
      return false;
    }
  },

  /**
   * Get transaction details from Algorand
   */
  async getTransactionDetails(txId: string) {
    try {
      const txInfo = await indexerClient.lookupTransactionByID(txId).do();
      return { success: true, transaction: txInfo.transaction };
    } catch (error: any) {
      console.error('Failed to get transaction details:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get account information
   */
  async getAccountInfo(address: string) {
    try {
      const accountInfo = await algodClient.accountInformation(address).do();
      return { success: true, accountInfo };
    } catch (error: any) {
      console.error('Failed to get account info:', error);
      return { success: false, error: error.message };
    }
  }
};

// Export main classes and utilities
export default {
  AlgorandWallet,
  CarbonCreditAsset,
  CarbonTradingContract,
  AlgorandUtils,
  algodClient,
  indexerClient
};