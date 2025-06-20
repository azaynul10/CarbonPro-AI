import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  console.error('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database service functions
export const dbService = {
  // User operations
  async getUser(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateUser(userId: string, updates: Partial<any>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Carbon predictions
  async createPrediction(prediction: any) {
    const { data, error } = await supabase
      .from('carbon_predictions')
      .insert(prediction)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getUserPredictions(userId: string) {
    const { data, error } = await supabase
      .from('carbon_predictions')
      .select('*')
      .eq('user_id', userId)
      .order('prediction_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Trading orders
  async createOrder(order: any) {
    const { data, error } = await supabase
      .from('trading_orders')
      .insert(order)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getUserOrders(userId: string) {
    const { data, error } = await supabase
      .from('trading_orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Carbon credits
  async getCarbonCredits() {
    const { data, error } = await supabase
      .from('carbon_credits')
      .select('*')
      .gt('available_quantity', 0)
      .order('price_per_ton', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // User portfolio
  async getUserPortfolio(userId: string) {
    const { data, error } = await supabase
      .from('user_portfolios')
      .select(`
        *,
        carbon_credit:carbon_credits(*)
      `)
      .eq('user_id', userId)
      .gt('quantity', 0);
    
    if (error) throw error;
    return data;
  },

  // Market data
  async getMarketData(creditId?: string, period: string = 'daily') {
    let query = supabase
      .from('market_data')
      .select('*')
      .eq('period_type', period)
      .order('timestamp', { ascending: false })
      .limit(30);
    
    if (creditId) {
      query = query.eq('credit_id', creditId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Transactions
  async getUserTransactions(userId: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        carbon_credit:carbon_credits(project_name, project_type)
      `)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('transaction_date', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Prediction accuracy
  async getPredictionAccuracy(userId: string) {
    const { data, error } = await supabase
      .from('prediction_accuracy')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
};