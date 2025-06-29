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

export interface UserSearchFilters {
  searchTerm?: string;
  subscriptionStatus?: 'all' | 'active' | 'inactive' | 'cancelled';
  userRole?: 'all' | 'admin' | 'user';
  dateRange?: {
    start: string;
    end: string;
  };
  sortBy?: 'created_at' | 'last_login' | 'name' | 'subscription_status';
  sortOrder?: 'asc' | 'desc';
}

export interface UserExportData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_admin: boolean;
  subscription_status: string;
  subscription_package: string;
  subscription_start_date: string;
  subscription_end_date: string;
  total_analyses: number;
  last_login: string;
  created_at: string;
  updated_at: string;
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

  // Enhanced User Management Methods
  static async getUsers(
    page = 1, 
    limit = 10, 
    filters: UserSearchFilters = {}
  ): Promise<{
    users: any[];
    total: number;
    pages: number;
    filteredCount: number;
  }> {
    const offset = (page - 1) * limit;
    
    try {
      // Build the base query
      let query = supabase
        .from('profiles')
        .select(`
          *,
          subscriptions(
            *,
            package:packages(name, price)
          ),
          resume_analyses(count)
        `, { count: 'exact' });

      // Apply search filter
      if (filters.searchTerm && filters.searchTerm.trim()) {
        const searchTerm = filters.searchTerm.trim();
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      // Apply role filter
      if (filters.userRole && filters.userRole !== 'all') {
        if (filters.userRole === 'admin') {
          query = query.eq('is_admin', true);
        } else {
          query = query.eq('is_admin', false);
        }
      }

      // Apply date range filter
      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'created_at';
      const sortOrder = filters.sortOrder || 'desc';
      
      if (sortBy === 'name') {
        query = query.order('first_name', { ascending: sortOrder === 'asc' });
      } else {
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      }

      // Get total count for filtered results
      const { count: filteredCount } = await query;

      // Apply pagination
      const { data, error, count } = await query
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Process users to include subscription status and analysis count
      const processedUsers = data?.map(user => {
        const activeSubscription = user.subscriptions?.find((sub: any) => sub.status === 'active');
        const analysisCount = user.resume_analyses?.length || 0;
        
        return {
          ...user,
          subscription_status: activeSubscription ? 'active' : 'inactive',
          subscription_package: activeSubscription?.package?.name || 'Free',
          subscription_price: activeSubscription?.package?.price || 0,
          total_analyses: analysisCount,
          last_login: user.updated_at // Using updated_at as proxy for last login
        };
      }) || [];

      // Filter by subscription status if specified
      let finalUsers = processedUsers;
      if (filters.subscriptionStatus && filters.subscriptionStatus !== 'all') {
        finalUsers = processedUsers.filter(user => {
          switch (filters.subscriptionStatus) {
            case 'active':
              return user.subscription_status === 'active';
            case 'inactive':
              return user.subscription_status === 'inactive';
            case 'cancelled':
              return user.subscriptions?.some((sub: any) => sub.status === 'cancelled');
            default:
              return true;
          }
        });
      }

      return {
        users: finalUsers,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
        filteredCount: filteredCount || 0
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  static async searchUsers(searchTerm: string, limit = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          subscriptions(
            *,
            package:packages(name)
          )
        `)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  static async exportUsers(filters: UserSearchFilters = {}): Promise<UserExportData[]> {
    try {
      // Get all users matching the filters (no pagination for export)
      let query = supabase
        .from('profiles')
        .select(`
          *,
          subscriptions(
            *,
            package:packages(name, price)
          ),
          resume_analyses(count)
        `);

      // Apply the same filters as getUsers
      if (filters.searchTerm && filters.searchTerm.trim()) {
        const searchTerm = filters.searchTerm.trim();
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      if (filters.userRole && filters.userRole !== 'all') {
        if (filters.userRole === 'admin') {
          query = query.eq('is_admin', true);
        } else {
          query = query.eq('is_admin', false);
        }
      }

      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data for export
      const exportData: UserExportData[] = (data || []).map(user => {
        const activeSubscription = user.subscriptions?.find((sub: any) => sub.status === 'active');
        const analysisCount = user.resume_analyses?.length || 0;

        return {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email || '', // Get email from auth if needed
          is_admin: user.is_admin,
          subscription_status: activeSubscription ? 'active' : 'inactive',
          subscription_package: activeSubscription?.package?.name || 'Free',
          subscription_start_date: activeSubscription?.start_date || '',
          subscription_end_date: activeSubscription?.end_date || '',
          total_analyses: analysisCount,
          last_login: user.updated_at,
          created_at: user.created_at,
          updated_at: user.updated_at
        };
      });

      // Apply subscription status filter for export
      if (filters.subscriptionStatus && filters.subscriptionStatus !== 'all') {
        return exportData.filter(user => {
          switch (filters.subscriptionStatus) {
            case 'active':
              return user.subscription_status === 'active';
            case 'inactive':
              return user.subscription_status === 'inactive';
            case 'cancelled':
              // Would need to check subscription history for cancelled status
              return false;
            default:
              return true;
          }
        });
      }

      return exportData;
    } catch (error) {
      console.error('Error exporting users:', error);
      throw error;
    }
  }

  static generateCSV(data: UserExportData[]): string {
    if (data.length === 0) {
      return 'No data to export';
    }

    // Define CSV headers
    const headers = [
      'User ID',
      'First Name',
      'Last Name',
      'Email',
      'Is Admin',
      'Subscription Status',
      'Subscription Package',
      'Subscription Start Date',
      'Subscription End Date',
      'Total Analyses',
      'Last Login',
      'Created At',
      'Updated At'
    ];

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(user => [
        user.id,
        `"${user.first_name}"`,
        `"${user.last_name}"`,
        `"${user.email}"`,
        user.is_admin ? 'Yes' : 'No',
        user.subscription_status,
        `"${user.subscription_package}"`,
        user.subscription_start_date ? format(new Date(user.subscription_start_date), 'yyyy-MM-dd') : '',
        user.subscription_end_date ? format(new Date(user.subscription_end_date), 'yyyy-MM-dd') : '',
        user.total_analyses,
        user.last_login ? format(new Date(user.last_login), 'yyyy-MM-dd HH:mm:ss') : '',
        format(new Date(user.created_at), 'yyyy-MM-dd HH:mm:ss'),
        format(new Date(user.updated_at), 'yyyy-MM-dd HH:mm:ss')
      ].join(','))
    ].join('\n');

    return csvContent;
  }

  static async getUserDetails(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          subscriptions(
            *,
            package:packages(*)
          ),
          resume_analyses(
            id,
            ats_score,
            created_at,
            resume_templates(name)
          ),
          payment_transactions(
            id,
            amount,
            status,
            created_at
          )
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user details:', error);
      throw error;
    }
  }

  static async updateUserStatus(userId: string, isAdmin: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: isAdmin })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating user status:', error);
      throw error;
    }
  }

  static async deleteUser(userId: string): Promise<void> {
    try {
      // Note: This will cascade delete due to foreign key constraints
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Private helper methods
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

  // Existing methods for packages and other functionality...
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