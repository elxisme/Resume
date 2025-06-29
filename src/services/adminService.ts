import { supabase } from '../lib/supabase';
import { Package } from '../types';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  totalAnalyses: number;
  userGrowth: number;
  subscriptionGrowth: number;
  revenueGrowth: number;
  analysisGrowth: number;
}

export interface UsageStats {
  resumeUploads: {
    current: number;
    total: number;
    percentage: number;
  };
  aiAnalyses: {
    current: number;
    total: number;
    percentage: number;
  };
  templateUsage: {
    current: number;
    total: number;
    percentage: number;
  };
  pdfDownloads: {
    current: number;
    total: number;
    percentage: number;
  };
}

export interface RevenueData {
  month: string;
  revenue: number;
  subscriptions: number;
}

export interface UserActivityData {
  date: string;
  newUsers: number;
  activeUsers: number;
  analyses: number;
}

export class AdminService {
  static async getDashboardStats(): Promise<DashboardStats> {
    const currentMonth = new Date();
    const lastMonth = subMonths(currentMonth, 1);
    
    const currentMonthStart = startOfMonth(currentMonth);
    const currentMonthEnd = endOfMonth(currentMonth);
    const lastMonthStart = startOfMonth(lastMonth);
    const lastMonthEnd = endOfMonth(lastMonth);

    try {
      // Get current month stats
      const [
        currentUsers,
        currentSubscriptions,
        currentRevenue,
        currentAnalyses,
        lastMonthUsers,
        lastMonthSubscriptions,
        lastMonthRevenue,
        lastMonthAnalyses
      ] = await Promise.all([
        this.getUserCount(currentMonthStart, currentMonthEnd),
        this.getActiveSubscriptionCount(),
        this.getMonthlyRevenue(currentMonthStart, currentMonthEnd),
        this.getAnalysisCount(currentMonthStart, currentMonthEnd),
        this.getUserCount(lastMonthStart, lastMonthEnd),
        this.getActiveSubscriptionCount(lastMonthEnd),
        this.getMonthlyRevenue(lastMonthStart, lastMonthEnd),
        this.getAnalysisCount(lastMonthStart, lastMonthEnd)
      ]);

      // Calculate growth percentages
      const userGrowth = this.calculateGrowth(currentUsers.total, lastMonthUsers.total);
      const subscriptionGrowth = this.calculateGrowth(currentSubscriptions, lastMonthSubscriptions);
      const revenueGrowth = this.calculateGrowth(currentRevenue, lastMonthRevenue);
      const analysisGrowth = this.calculateGrowth(currentAnalyses, lastMonthAnalyses);

      return {
        totalUsers: currentUsers.total,
        activeSubscriptions: currentSubscriptions,
        monthlyRevenue: currentRevenue,
        totalAnalyses: currentAnalyses,
        userGrowth,
        subscriptionGrowth,
        revenueGrowth,
        analysisGrowth
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  static async getUsageStats(): Promise<UsageStats> {
    const currentMonth = new Date();
    const currentMonthStart = startOfMonth(currentMonth);
    const currentMonthEnd = endOfMonth(currentMonth);

    try {
      const [
        resumeUploadsData,
        aiAnalysesData,
        templateUsageData,
        pdfDownloadsData
      ] = await Promise.all([
        this.getUsageData('resume_upload', currentMonthStart, currentMonthEnd),
        this.getUsageData('analysis', currentMonthStart, currentMonthEnd),
        this.getUsageData('template_usage', currentMonthStart, currentMonthEnd),
        this.getUsageData('pdf_download', currentMonthStart, currentMonthEnd)
      ]);

      return {
        resumeUploads: resumeUploadsData,
        aiAnalyses: aiAnalysesData,
        templateUsage: templateUsageData,
        pdfDownloads: pdfDownloadsData
      };
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      throw error;
    }
  }

  static async getRevenueChart(months: number = 6): Promise<RevenueData[]> {
    const data: RevenueData[] = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const [revenue, subscriptions] = await Promise.all([
        this.getMonthlyRevenue(monthStart, monthEnd),
        this.getNewSubscriptions(monthStart, monthEnd)
      ]);

      data.push({
        month: format(date, 'MMM yyyy'),
        revenue,
        subscriptions
      });
    }

    return data;
  }

  static async getUserActivity(days: number = 30): Promise<UserActivityData[]> {
    const data: UserActivityData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const [newUsers, activeUsers, analyses] = await Promise.all([
        this.getDailyNewUsers(dayStart, dayEnd),
        this.getDailyActiveUsers(dayStart, dayEnd),
        this.getAnalysisCount(dayStart, dayEnd)
      ]);

      data.push({
        date: format(dayStart, 'MMM dd'),
        newUsers,
        activeUsers,
        analyses
      });
    }

    return data;
  }

  private static async getUserCount(startDate: Date, endDate: Date): Promise<{ total: number; new: number }> {
    // Total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // New users in period
    const { count: newUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    return {
      total: totalUsers || 0,
      new: newUsers || 0
    };
  }

  private static async getActiveSubscriptionCount(asOfDate?: Date): Promise<number> {
    let query = supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    if (asOfDate) {
      query = query.lte('created_at', asOfDate.toISOString());
    }

    const { count } = await query;
    return count || 0;
  }

  private static async getMonthlyRevenue(startDate: Date, endDate: Date): Promise<number> {
    const { data } = await supabase
      .from('payment_transactions')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    return data?.reduce((sum, transaction) => sum + Number(transaction.amount), 0) || 0;
  }

  private static async getAnalysisCount(startDate: Date, endDate: Date): Promise<number> {
    const { count } = await supabase
      .from('resume_analyses')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    return count || 0;
  }

  private static async getUsageData(actionType: string, startDate: Date, endDate: Date): Promise<{
    current: number;
    total: number;
    percentage: number;
  }> {
    // Get current month usage
    const monthYear = format(startDate, 'yyyy-MM');
    const { data: currentUsage } = await supabase
      .from('usage_tracking')
      .select('count')
      .eq('action_type', actionType)
      .eq('month_year', monthYear);

    const current = currentUsage?.reduce((sum, item) => sum + item.count, 0) || 0;

    // Get total usage
    const { data: totalUsage } = await supabase
      .from('usage_tracking')
      .select('count')
      .eq('action_type', actionType);

    const total = totalUsage?.reduce((sum, item) => sum + item.count, 0) || 0;

    // Calculate percentage (current month vs total)
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

    return { current, total, percentage };
  }

  private static async getNewSubscriptions(startDate: Date, endDate: Date): Promise<number> {
    const { count } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    return count || 0;
  }

  private static async getDailyNewUsers(startDate: Date, endDate: Date): Promise<number> {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    return count || 0;
  }

  private static async getDailyActiveUsers(startDate: Date, endDate: Date): Promise<number> {
    // Count users who performed any action on this day
    const { data } = await supabase
      .from('resume_analyses')
      .select('user_id')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Get unique user IDs
    const uniqueUsers = new Set(data?.map(item => item.user_id) || []);
    return uniqueUsers.size;
  }

  private static calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  // Existing methods...
  static async getUsers(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('profiles')
      .select(`
        *,
        subscriptions(
          *,
          package:packages(name)
        )
      `, { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      users: data,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit)
    };
  }

  static async getPackages(): Promise<Package[]> {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .order('price');

    if (error) throw error;
    return data;
  }

  static async createPackage(packageData: Omit<Package, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('packages')
      .insert(packageData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updatePackage(id: string, packageData: Partial<Package>) {
    const { data, error } = await supabase
      .from('packages')
      .update(packageData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deletePackage(id: string) {
    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getRecentSubscriptions(limit = 10) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        profiles(first_name, last_name),
        package:packages(name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  static async getRecentTransactions(limit = 10) {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select(`
        *,
        profiles(first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  static async getTopTemplates(limit = 5) {
    const { data, error } = await supabase
      .from('resume_analyses')
      .select(`
        template_id,
        resume_templates(name, category),
        count:template_id
      `)
      .not('template_id', 'is', null)
      .limit(limit);

    if (error) throw error;

    // Group by template and count usage
    const templateUsage = data?.reduce((acc: any, item) => {
      const templateId = item.template_id;
      if (!acc[templateId]) {
        acc[templateId] = {
          template: item.resume_templates,
          count: 0
        };
      }
      acc[templateId].count++;
      return acc;
    }, {});

    return Object.values(templateUsage || {})
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, limit);
  }
}