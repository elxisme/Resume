import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { RevenueData, UserActivityData } from '../../services/adminService';
import { BarChart3, TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

interface AnalyticsChartProps {
  revenueData: RevenueData[];
  userActivityData: UserActivityData[];
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  revenueData,
  userActivityData
}) => {
  const [activeChart, setActiveChart] = useState<'revenue' | 'activity'>('revenue');

  const maxRevenue = Math.max(...revenueData.map(d => d.revenue));
  const maxSubscriptions = Math.max(...revenueData.map(d => d.subscriptions));
  const maxNewUsers = Math.max(...userActivityData.map(d => d.newUsers));
  const maxActiveUsers = Math.max(...userActivityData.map(d => d.activeUsers));
  const maxAnalyses = Math.max(...userActivityData.map(d => d.analyses));

  return (
    <div className="space-y-6">
      {/* Chart Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h2>
        <div className="flex space-x-2">
          <Button
            variant={activeChart === 'revenue' ? 'primary' : 'outline'}
            onClick={() => setActiveChart('revenue')}
            size="sm"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Revenue
          </Button>
          <Button
            variant={activeChart === 'activity' ? 'primary' : 'outline'}
            onClick={() => setActiveChart('activity')}
            size="sm"
          >
            <Activity className="w-4 h-4 mr-2" />
            User Activity
          </Button>
        </div>
      </div>

      {/* Revenue Chart */}
      {activeChart === 'revenue' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Monthly Revenue</h3>
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-4">
              {revenueData.map((data, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{data.month}</span>
                    <span className="font-medium">${data.revenue.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
                      style={{ width: `${maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">New Subscriptions</h3>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="space-y-4">
              {revenueData.map((data, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{data.month}</span>
                    <span className="font-medium">{data.subscriptions}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-1000" 
                      style={{ width: `${maxSubscriptions > 0 ? (data.subscriptions / maxSubscriptions) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* User Activity Chart */}
      {activeChart === 'activity' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">New Users (30 days)</h3>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {userActivityData.slice(-10).map((data, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">{data.date}</span>
                      <span className="font-medium">{data.newUsers}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div 
                        className="bg-blue-600 h-1 rounded-full transition-all duration-500" 
                        style={{ width: `${maxNewUsers > 0 ? (data.newUsers / maxNewUsers) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Active Users (30 days)</h3>
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {userActivityData.slice(-10).map((data, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">{data.date}</span>
                      <span className="font-medium">{data.activeUsers}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div 
                        className="bg-green-600 h-1 rounded-full transition-all duration-500" 
                        style={{ width: `${maxActiveUsers > 0 ? (data.activeUsers / maxActiveUsers) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Daily Analyses (30 days)</h3>
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {userActivityData.slice(-10).map((data, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">{data.date}</span>
                      <span className="font-medium">{data.analyses}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div 
                        className="bg-purple-600 h-1 rounded-full transition-all duration-500" 
                        style={{ width: `${maxAnalyses > 0 ? (data.analyses / maxAnalyses) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Summary Stats */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">30-Day Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {userActivityData.reduce((sum, data) => sum + data.newUsers, 0)}
                </p>
                <p className="text-sm text-blue-800">Total New Users</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {Math.round(userActivityData.reduce((sum, data) => sum + data.activeUsers, 0) / userActivityData.length)}
                </p>
                <p className="text-sm text-green-800">Avg Daily Active</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {userActivityData.reduce((sum, data) => sum + data.analyses, 0)}
                </p>
                <p className="text-sm text-purple-800">Total Analyses</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {Math.round(userActivityData.reduce((sum, data) => sum + data.analyses, 0) / userActivityData.length)}
                </p>
                <p className="text-sm text-orange-800">Avg Daily Analyses</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};