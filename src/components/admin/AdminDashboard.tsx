import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { AdminService } from '../../services/adminService';
import { Package, User, Users, DollarSign, TrendingUp, Settings, Plus } from 'lucide-react';
import { PackageManager } from './PackageManager';
import { UserManager } from './UserManager';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'users'>('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    totalAnalyses: 0
  });
  const [recentSubscriptions, setRecentSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [dashboardStats, subscriptions] = await Promise.all([
        AdminService.getDashboardStats(),
        AdminService.getRecentSubscriptions(5)
      ]);

      setStats(dashboardStats);
      setRecentSubscriptions(subscriptions);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: TrendingUp },
    { id: 'packages', name: 'Packages', icon: Package },
    { id: 'users', name: 'Users', icon: User },
  ];

  const statCards = [
    { 
      name: 'Total Users', 
      value: stats.totalUsers.toLocaleString(), 
      icon: Users, 
      change: '+12%', 
      changeType: 'positive' 
    },
    { 
      name: 'Active Subscriptions', 
      value: stats.activeSubscriptions.toLocaleString(), 
      icon: TrendingUp, 
      change: '+8%', 
      changeType: 'positive' 
    },
    { 
      name: 'Monthly Revenue', 
      value: `$${stats.monthlyRevenue.toLocaleString()}`, 
      icon: DollarSign, 
      change: '+15%', 
      changeType: 'positive' 
    },
    { 
      name: 'Resume Analyses', 
      value: stats.totalAnalyses.toLocaleString(), 
      icon: Package, 
      change: '+22%', 
      changeType: 'positive' 
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage your platform, users, and subscription packages.</p>
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
              return (
                <Card key={stat.name} hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                      <div className="flex items-center mt-2">
                        <span className={`text-sm font-medium ${
                          stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.change}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">vs last month</span>
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
                      <p className="text-sm font-medium text-green-600">{sub.status}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Usage</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Resume Uploads</span>
                    <span className="font-medium">85%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">AI Analyses</span>
                    <span className="font-medium">72%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '72%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Template Usage</span>
                    <span className="font-medium">91%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '91%' }}></div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'packages' && <PackageManager />}
      {activeTab === 'users' && <UserManager />}
    </div>
  );
};