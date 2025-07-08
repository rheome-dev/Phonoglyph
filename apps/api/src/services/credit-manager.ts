import { createClient } from '@supabase/supabase-js';
import { 
  CreditTransaction, 
  CreditBalance, 
  DeductCreditsRequest, 
  RefundCreditsRequest,
  CreditBalanceResponse 
} from '../types/credit-system';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class CreditManager {
  private static readonly CREDIT_TRANSACTIONS_TABLE = 'credit_transactions';
  private static readonly CREDIT_BALANCES_TABLE = 'credit_balances';
  
  /**
   * Get user's current credit balance
   */
  static async getCreditBalance(userId: string): Promise<CreditBalanceResponse> {
    try {
      // Get current balance
      const { data: balance, error: balanceError } = await supabase
        .from(this.CREDIT_BALANCES_TABLE)
        .select('*')
        .eq('user_id', userId)
        .single();

      if (balanceError && balanceError.code !== 'PGRST116') { // Not found error
        throw new Error(`Failed to fetch credit balance: ${balanceError.message}`);
      }

      // Calculate pending transactions (reserved credits)
      const { data: pendingTransactions, error: pendingError } = await supabase
        .from(this.CREDIT_TRANSACTIONS_TABLE)
        .select('amount')
        .eq('user_id', userId)
        .eq('operation_type', 'pending')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (pendingError) {
        throw new Error(`Failed to fetch pending transactions: ${pendingError.message}`);
      }

      const currentBalance = balance?.balance || 0;
      const pending = pendingTransactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
      const availableBalance = Math.max(0, currentBalance - pending);

      return {
        balance: currentBalance,
        pendingTransactions: pending,
        availableBalance,
        lastUpdated: balance?.last_updated ? new Date(balance.last_updated) : new Date()
      };

    } catch (error) {
      throw new Error(`Credit balance lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deduct credits from user's balance (with authorization check)
   */
  static async deductCredits(request: DeductCreditsRequest): Promise<{
    success: boolean;
    transactionId?: string;
    newBalance?: number;
    error?: string;
  }> {
    try {
      // Start transaction
      const { data: currentBalance } = await supabase
        .from(this.CREDIT_BALANCES_TABLE)
        .select('balance')
        .eq('user_id', request.userId)
        .single();

      const balance = currentBalance?.balance || 0;

      if (balance < request.amount) {
        return {
          success: false,
          error: `Insufficient credits. Required: ${request.amount}, Available: ${balance}`
        };
      }

      // Create transaction record
      const transaction: Omit<CreditTransaction, 'createdAt'> = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: request.userId,
        amount: -request.amount, // Negative for deduction
        operationType: request.operationType,
        resourceUsage: request.resourceUsage,
        jobId: request.jobId,
        metadata: {
          deductionReason: 'Job processing',
          jobType: request.operationType
        }
      };

      const { error: txnError } = await supabase
        .from(this.CREDIT_TRANSACTIONS_TABLE)
        .insert({
          id: transaction.id,
          user_id: transaction.userId,
          amount: transaction.amount,
          operation_type: transaction.operationType,
          resource_usage: transaction.resourceUsage,
          job_id: transaction.jobId,
          metadata: transaction.metadata
        });

      if (txnError) {
        throw new Error(`Failed to create transaction: ${txnError.message}`);
      }

      // Update balance
      const newBalance = balance - request.amount;
      const { error: balanceError } = await supabase
        .from(this.CREDIT_BALANCES_TABLE)
        .upsert({
          user_id: request.userId,
          balance: newBalance,
          last_updated: new Date().toISOString()
        });

      if (balanceError) {
        // Rollback transaction
        await supabase
          .from(this.CREDIT_TRANSACTIONS_TABLE)
          .delete()
          .eq('id', transaction.id);
        
        throw new Error(`Failed to update balance: ${balanceError.message}`);
      }

      return {
        success: true,
        transactionId: transaction.id,
        newBalance
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Refund credits to user's balance
   */
  static async refundCredits(request: RefundCreditsRequest): Promise<{
    success: boolean;
    transactionId?: string;
    newBalance?: number;
    error?: string;
  }> {
    try {
      // Verify original transaction exists
      const { data: originalTxn, error: txnError } = await supabase
        .from(this.CREDIT_TRANSACTIONS_TABLE)
        .select('*')
        .eq('id', request.originalTransactionId)
        .eq('user_id', request.userId)
        .single();

      if (txnError || !originalTxn) {
        return {
          success: false,
          error: 'Original transaction not found'
        };
      }

      // Check if already refunded
      const { data: existingRefund } = await supabase
        .from(this.CREDIT_TRANSACTIONS_TABLE)
        .select('id')
        .eq('user_id', request.userId)
        .eq('operation_type', 'refund')
        .eq('metadata->>originalTransactionId', request.originalTransactionId)
        .single();

      if (existingRefund) {
        return {
          success: false,
          error: 'Transaction already refunded'
        };
      }

      // Create refund transaction
      const refundTransaction: Omit<CreditTransaction, 'createdAt'> = {
        id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: request.userId,
        amount: request.amount, // Positive for refund
        operationType: 'refund',
        metadata: {
          originalTransactionId: request.originalTransactionId,
          refundReason: request.reason
        }
      };

      const { error: refundError } = await supabase
        .from(this.CREDIT_TRANSACTIONS_TABLE)
        .insert({
          id: refundTransaction.id,
          user_id: refundTransaction.userId,
          amount: refundTransaction.amount,
          operation_type: refundTransaction.operationType,
          metadata: refundTransaction.metadata
        });

      if (refundError) {
        throw new Error(`Failed to create refund transaction: ${refundError.message}`);
      }

      // Update balance
      const { data: currentBalance } = await supabase
        .from(this.CREDIT_BALANCES_TABLE)
        .select('balance')
        .eq('user_id', request.userId)
        .single();

      const balance = currentBalance?.balance || 0;
      const newBalance = balance + request.amount;

      const { error: balanceError } = await supabase
        .from(this.CREDIT_BALANCES_TABLE)
        .upsert({
          user_id: request.userId,
          balance: newBalance,
          last_updated: new Date().toISOString()
        });

      if (balanceError) {
        // Rollback refund transaction
        await supabase
          .from(this.CREDIT_TRANSACTIONS_TABLE)
          .delete()
          .eq('id', refundTransaction.id);
        
        throw new Error(`Failed to update balance: ${balanceError.message}`);
      }

      return {
        success: true,
        transactionId: refundTransaction.id,
        newBalance
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Add credits to user's balance (for purchases or admin actions)
   */
  static async addCredits(
    userId: string, 
    amount: number, 
    reason: string = 'Purchase'
  ): Promise<{
    success: boolean;
    transactionId?: string;
    newBalance?: number;
    error?: string;
  }> {
    try {
      // Create transaction record
      const transaction: Omit<CreditTransaction, 'createdAt'> = {
        id: `add_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        amount, // Positive for addition
        operationType: 'purchase',
        metadata: {
          additionReason: reason
        }
      };

      const { error: txnError } = await supabase
        .from(this.CREDIT_TRANSACTIONS_TABLE)
        .insert({
          id: transaction.id,
          user_id: transaction.userId,
          amount: transaction.amount,
          operation_type: transaction.operationType,
          metadata: transaction.metadata
        });

      if (txnError) {
        throw new Error(`Failed to create transaction: ${txnError.message}`);
      }

      // Update balance
      const { data: currentBalance } = await supabase
        .from(this.CREDIT_BALANCES_TABLE)
        .select('balance')
        .eq('user_id', userId)
        .single();

      const balance = currentBalance?.balance || 0;
      const newBalance = balance + amount;

      const { error: balanceError } = await supabase
        .from(this.CREDIT_BALANCES_TABLE)
        .upsert({
          user_id: userId,
          balance: newBalance,
          last_updated: new Date().toISOString()
        });

      if (balanceError) {
        // Rollback transaction
        await supabase
          .from(this.CREDIT_TRANSACTIONS_TABLE)
          .delete()
          .eq('id', transaction.id);
        
        throw new Error(`Failed to update balance: ${balanceError.message}`);
      }

      return {
        success: true,
        transactionId: transaction.id,
        newBalance
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user's transaction history
   */
  static async getTransactionHistory(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<CreditTransaction[]> {
    try {
      const { data, error } = await supabase
        .from(this.CREDIT_TRANSACTIONS_TABLE)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to fetch transaction history: ${error.message}`);
      }

      return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        amount: row.amount,
        operationType: row.operation_type,
        resourceUsage: row.resource_usage,
        batchId: row.batch_id,
        jobId: row.job_id,
        metadata: row.metadata,
        createdAt: new Date(row.created_at)
      }));

    } catch (error) {
      throw new Error(`Transaction history lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reserve credits for a pending job (prevents double-spending)
   */
  static async reserveCredits(
    userId: string, 
    amount: number, 
    jobId: string
  ): Promise<{
    success: boolean;
    reservationId?: string;
    error?: string;
  }> {
    try {
      const balance = await this.getCreditBalance(userId);
      
      if (balance.availableBalance < amount) {
        return {
          success: false,
          error: `Insufficient available credits. Required: ${amount}, Available: ${balance.availableBalance}`
        };
      }

      // Create pending transaction
      const reservationId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { error } = await supabase
        .from(this.CREDIT_TRANSACTIONS_TABLE)
        .insert({
          id: reservationId,
          user_id: userId,
          amount: -amount,
          operation_type: 'pending',
          job_id: jobId,
          metadata: {
            reservationType: 'job_processing',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
          }
        });

      if (error) {
        throw new Error(`Failed to reserve credits: ${error.message}`);
      }

      return {
        success: true,
        reservationId
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Release reserved credits (cancel reservation)
   */
  static async releaseReservedCredits(reservationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.CREDIT_TRANSACTIONS_TABLE)
        .delete()
        .eq('id', reservationId)
        .eq('operation_type', 'pending');

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Get credit usage statistics for a user
   */
  static async getCreditUsageStats(userId: string, days: number = 30): Promise<{
    totalSpent: number;
    totalRefunded: number;
    operationBreakdown: Record<string, number>;
    dailyUsage: Array<{ date: string; credits: number }>;
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from(this.CREDIT_TRANSACTIONS_TABLE)
        .select('amount, operation_type, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .neq('operation_type', 'pending');

      if (error) {
        throw new Error(`Failed to fetch usage stats: ${error.message}`);
      }

      const transactions = data || [];
      const totalSpent = transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const totalRefunded = transactions
        .filter(t => t.operation_type === 'refund')
        .reduce((sum, t) => sum + t.amount, 0);

      const operationBreakdown: Record<string, number> = {};
      transactions
        .filter(t => t.amount < 0)
        .forEach(t => {
          operationBreakdown[t.operation_type] = (operationBreakdown[t.operation_type] || 0) + Math.abs(t.amount);
        });

      // Calculate daily usage
      const dailyUsage: Array<{ date: string; credits: number }> = [];
      const dailyMap = new Map<string, number>();
      
      transactions
        .filter(t => t.amount < 0)
        .forEach(t => {
          const date = new Date(t.created_at).toISOString().split('T')[0];
          dailyMap.set(date, (dailyMap.get(date) || 0) + Math.abs(t.amount));
        });
      
      for (const [date, credits] of dailyMap) {
        dailyUsage.push({ date, credits });
      }
      
      dailyUsage.sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalSpent,
        totalRefunded,
        operationBreakdown,
        dailyUsage
      };

    } catch (error) {
      throw new Error(`Usage stats lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}