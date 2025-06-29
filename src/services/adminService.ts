import { supabase } from '../lib/supabase';
import { Package } from '../types';

export class AdminService {
  static async getDashboardStats() {
    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get active subscriptions
    const { count: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get monthly revenue
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const { data: monthlyTransactions } = await supabase
      .from('payment_transactions')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', `${currentMonth}-01`)
      .lt('created_at', `${currentMonth}-32`);

    const monthlyRevenue = monthlyTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;

    // Get total analyses
    const { count: totalAnalyses } = await supabase
      .from('resume_analyses')
      .select('*', { count: 'exact', head: true });

    return {
      totalUsers: totalUsers || 0,
      activeSubscriptions: activeSubscriptions || 0,
      monthlyRevenue,
      totalAnalyses: totalAnalyses || 0
    };
  }

  static async getUsers(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('profiles')
      .select(`
        *,
        subscriptions!inner(
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
}