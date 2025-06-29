import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AdminService, DashboardStats, UsageStats, RevenueData, UserActivityData } from '../../services/adminService';
import { Package, User, Users, DollarSign, TrendingUp, TrendingDown, Settings, Plus, BarChart3, Activity, FileText, Download } from 'lucide-react';
import { PackageManager } from './PackageManager';
import { UserManager } from './UserManager';
import { AnalyticsChart } from './AnalyticsChart';
import { format } from 'date-fns';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'packages' | 'users'>('overview');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    totalAnalyses: 0,
    userGrowth: 0,
    subscriptionGrowth: 0,
    revenueGrowth: 0,
    analysisGrowth: 0
  });
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [userActivityData, setUserActivityData] = useState<UserActivityData[]>([]);
  const [recentSubscriptions, setRecentSubscriptions] = useState([]);
  const [topTemplates, setTopTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [
        dashboardStats,
        usage,
        revenue,
        activity,
        subscriptions,
        templates
      ] = await Promise.all([
        AdminService.getDashboardStats(),
        AdminService.getUsageStats(),
        AdminService.getRevenueChart(6),
        AdminService.getUserActivity(30),
        AdminService.getRecentSubscriptions(5),
        AdminService.getTopTemplates(5)
      ]);

      setStats(dashboardStats);
      setUsageStats(usage);
      setRevenueData(revenue);
      setUserActivityData(activity);
      setRecentSubscriptions(subscriptions);
      setTopTemplates(templates);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: TrendingUp },
    { id: 'analytics', name: 'Analytics', icon: BarChart3 },
    { id: 'packages', name: 'Packages', icon: Package },
    { id: 'users', name: 'Users', icon: User },
  ];

  const statCards = [
    { 
      name: 'Total Users', 
      value: stats.totalUsers.toLocaleString(), 
      icon: Users, 
      change: `${stats.userGrowth > 0 ? '+' : ''}${stats.userGrowth}%`, 
      changeType: stats.userGrowth >= 0 ? 'positive' : 'negative',
      description: 'vs last month'
    },
    { 
      name: 'Active Subscriptions', 
      value: stats.activeSubscriptions.toLocaleString(), 
      icon: TrendingUp, 
      change: `${stats.subscriptionGrowth > 0 ? '+' : ''}${stats.subscriptionGrowth}%`, 
      changeType: stats.subscriptionGrowth >= 0 ? 'positive' : 'negative',
      description: 'vs last month'
    },
    { 
      name: 'Monthly Revenue', 
      value: `$${stats.monthlyRevenue.toLocaleString()}`, 
      icon: DollarSign, 
      change: `${stats.revenueGrowth > 0 ? '+' : ''}${stats.revenueGrowth}%`, 
      changeType: stats.revenueGrowth >= 0 ? 'positive' : 'negative',
      description: 'vs last month'
    },
    { 
      name: 'AI Analyses', 
      value: stats.totalAnalyses.toLocaleString(), 
      icon: Activity, 
      change: `${stats.analysisGrowth > 0 ? '+' : ''}${stats.analysisGrowth}%`, 
      changeType: stats.analysisGrowth >= 0 ? 'positive' : 'negative',
      description: 'vs last month'
    },
  ];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your platform, users, and subscription packages.</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          isLoading={refreshing}
          className="flex items-center space-x-2"
        >
          <Activity className="w-4 h-4" />
          <span>Refresh Data</span>
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8">
        <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
                  ${activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              const TrendIcon = stat.changeType === 'positive' ? TrendingUp : TrendingDown;
              return (
                <Card key={stat.name} hover>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                      <div className="flex items-center mt-2">
                        <TrendIcon className={`w-4 h-4 mr-1 ${
                          stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`} />
                        <span className={`text-sm font-medium ${
                          stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.change}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">{stat.description}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Platform Usage */}
          {usageStats && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Platform Usage</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Resume Uploads</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{usageStats.resumeUploads.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
                      style={{ width: `${usageStats.resumeUploads.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {usageStats.resumeUploads.current} this month / {usageStats.resumeUploads.total} total
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">AI Analyses</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{usageStats.aiAnalyses.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-1000" 
                      style={{ width: `${usageStats.aiAnalyses.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {usageStats.aiAnalyses.current} this month / {usageStats.aiAnalyses.total} total
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700">Template Usage</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{usageStats.templateUsage.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-1000" 
                      style={{ width: `${usageStats.templateUsage.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {usageStats.templateUsage.current} this month / {usageStats.templateUsage.total} total
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Download className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-gray-700">PDF Downloads</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{usageStats.pdfDownloads.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full transition-all duration-1000" 
                      style={{ width: `${usageStats.pdfDownloads.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {usageStats.pdfDownloads.current} this month / {usageStats.pdfDownloads.total} total
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Subscriptions</h3>
              <div className="space-y-3">
                {recentSubscriptions.map((sub: any, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        {sub.profiles?.first_name} {sub.profiles?.last_name}
                      </p>
                      <p className="text-sm text-gray-600">{sub.package?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600 capitalize">{sub.status}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(sub.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Templates</h3>
              <div className="space-y-3">
                {topTemplates.map((template: any, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{template.template?.name}</p>
                      <p className="text-sm text-gray-600 capitalize">{template.template?.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-blue-600">{template.count} uses</p>
                      <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
                        <div 
                          className="bg-blue-600 h-1 rounded-full" 
                          style={{ width: `${Math.min((template.count / Math.max(...topTemplates.map((t: any) => t.count))) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-8">
          <AnalyticsChart 
            revenueData={revenueData}
            userActivityData={userActivityData}
          />
        </div>
      )}

      {activeTab === 'packages' && <PackageManager />}
      {activeTab === 'users' && <UserManager />}
    </div>
  );
};