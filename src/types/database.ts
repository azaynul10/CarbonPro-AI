export interface User {
  user_id: string;
  email: string;
  created_at: string;
  updated_at: string;
  wallet_address?: string;
  verification_status: boolean;
  profile_data: Record<string, any>;
  total_emissions: number;
  carbon_credits_owned: number;
}

export interface CarbonPrediction {
  prediction_id: string;
  user_id: string;
  consumption_data: Record<string, any>;
  predicted_emissions: number;
  prediction_date: string;
  actual_emissions?: number;
  accuracy_score?: number;
  prediction_period: 'monthly' | 'quarterly' | 'yearly';
  status: 'pending' | 'confirmed' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface TradingOrder {
  order_id: string;
  user_id: string;
  order_type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total_value: number;
  status: 'pending' | 'completed' | 'cancelled' | 'partial';
  filled_quantity: number;
  remaining_quantity: number;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  blockchain_tx_hash?: string;
  algorand_asset_id?: number;
}

export interface CarbonCredit {
  credit_id: string;
  project_name: string;
  project_description?: string;
  verification_standard: string;
  price_per_ton: number;
  available_quantity: number;
  total_quantity: number;
  project_location?: string;
  project_type?: string;
  vintage_year?: number;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
  algorand_asset_id?: number;
  project_registry_id?: string;
  co_benefits: string[];
}

export interface Transaction {
  transaction_id: string;
  buyer_id: string;
  seller_id: string;
  credit_id: string;
  quantity: number;
  price_per_ton: number;
  total_amount: number;
  transaction_date: string;
  blockchain_tx_hash: string;
  algorand_block_number?: number;
  status: 'pending' | 'confirmed' | 'failed';
  fees: number;
  created_at: string;
}

export interface MarketData {
  data_id: string;
  credit_id: string;
  price: number;
  volume: number;
  timestamp: string;
  high_price?: number;
  low_price?: number;
  opening_price?: number;
  closing_price?: number;
  period_type: 'minute' | 'hourly' | 'daily' | 'weekly';
}

export interface UserPortfolio {
  portfolio_id: string;
  user_id: string;
  credit_id: string;
  quantity: number;
  average_purchase_price?: number;
  total_invested?: number;
  last_updated: string;
  carbon_credit?: CarbonCredit;
}

export interface PredictionAccuracy {
  accuracy_id: string;
  user_id: string;
  prediction_id: string;
  predicted_value: number;
  actual_value: number;
  accuracy_percentage: number;
  created_at: string;
}