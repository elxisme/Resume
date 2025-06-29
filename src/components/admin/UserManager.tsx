import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AdminService, UserSearchFilters, UserExportData } from '../../services/adminService';
import { 
  Search, 
  Download, 
  Eye, 
  ChevronLeft, 
  ChevronRight, 
  Filter,
  X,
  Calendar,
  Users,
  Crown,
  Shield,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

export const UserManager: React.FC = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  // Search and filter state
  const [filters, setFilters] = useState<UserSearchFilters>({
    searchTerm: '',
    subscriptionStatus: 'all',
    userRole: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  const [tempFilters, setTempFilters] = useState<UserSearchFilters>(filters);

  useEffect(() => {
    loadUsers();
  }, [currentPage, filters]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const { users: userData, pages, total, filteredCount: filtered } = await AdminService.getUsers(
        currentPage, 
        10, 
        filters
      );
      setUsers(userData);
      setTotalPages(pages);
      setTotalUsers(total);
      setFilteredCount(filtered);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, searchTerm }));
    setCurrentPage(1);
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setCurrentPage(1);
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    const resetFilters: UserSearchFilters = {
      searchTerm: '',
      subscriptionStatus: 'all',
      userRole: 'all',
      sortBy: 'created_at',
      sortOrder: 'desc'
    };
    setFilters(resetFilters);
    setTempFilters(resetFilters);
    setCurrentPage(1);
    setShowFilters(false);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Export all users matching current filters (not just current page)
      const exportData: UserExportData[] = await AdminService.exportUsers(filters);
      
      if (exportData.length === 0) {
        alert('No data to export with current filters');
        return;
      }

      // Generate CSV content
      const csvContent = AdminService.generateCSV(exportData);
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `users-export-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewUser = async (user: any) => {
    try {
      const userDetails = await AdminService.getUserDetails(user.id);
      setSelectedUser(userDetails);
      setShowUserDetails(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
      alert('Failed to load user details');
    }
  };

  const handleUpdateUserRole = async (userId: string, isAdmin: boolean) => {
    try {
      await AdminService.updateUserStatus(userId, isAdmin);
      await loadUsers(); // Refresh the list
      alert(`User role updated successfully`);
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    }
  };

  const getSubscriptionStatusBadge = (status: string, packageName: string) => {
    const baseClasses = "inline-flex px-2 py-1 text-xs font-semibold rounded-full";
    
    switch (status) {
      case 'active':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            {packageName}
          </span>
        );
      case 'cancelled':
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            Cancelled
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            Free
          </span>
        );
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredCount !== totalUsers 
              ? `Showing ${filteredCount} of ${totalUsers} users`
              : `${totalUsers} total users`
            }
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="search"
              placeholder="Search users..."
              value={filters.searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {(filters.subscriptionStatus !== 'all' || filters.userRole !== 'all' || filters.dateRange) && (
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExport}
            isLoading={isExporting}
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={loadUsers}
            isLoading={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card className="border-blue-200 bg-blue-50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Advanced Filters</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subscription Status
                </label>
                <select
                  value={tempFilters.subscriptionStatus}
                  onChange={(e) => setTempFilters(prev => ({ 
                    ...prev, 
                    subscriptionStatus: e.target.value as any 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Subscription</option>
                  <option value="inactive">No Subscription</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Role
                </label>
                <select
                  value={tempFilters.userRole}
                  onChange={(e) => setTempFilters(prev => ({ 
                    ...prev, 
                    userRole: e.target.value as any 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="user">Regular Users</option>
                  <option value="admin">Administrators</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <div className="flex space-x-2">
                  <select
                    value={tempFilters.sortBy}
                    onChange={(e) => setTempFilters(prev => ({ 
                      ...prev, 
                      sortBy: e.target.value as any 
                    }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="created_at">Join Date</option>
                    <option value="name">Name</option>
                    <option value="last_login">Last Login</option>
                  </select>
                  <select
                    value={tempFilters.sortOrder}
                    onChange={(e) => setTempFilters(prev => ({ 
                      ...prev, 
                      sortOrder: e.target.value as any 
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="desc">Newest</option>
                    <option value="asc">Oldest</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-blue-200">
              <Button variant="outline" onClick={handleResetFilters}>
                Reset Filters
              </Button>
              <Button onClick={handleApplyFilters}>
                Apply Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Users Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user: any) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                          <span>{user.first_name} {user.last_name}</span>
                          {user.is_admin && (
                            <Crown className="w-4 h-4 text-yellow-500" title="Administrator" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {user.is_admin ? (
                        <>
                          <Shield className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-600">Admin</span>
                        </>
                      ) : (
                        <>
                          <Users className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-600">User</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getSubscriptionStatusBadge(user.subscription_status, user.subscription_package)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>{user.total_analyses} analyses</div>
                      <div className="text-xs text-gray-400">
                        Last seen: {format(new Date(user.last_login), 'MMM dd')}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(user.created_at), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewUser(user)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <div className="relative group">
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                          <button 
                            onClick={() => handleUpdateUserRole(user.id, !user.is_admin)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <Edit className="w-4 h-4" />
                            <span>{user.is_admin ? 'Remove Admin' : 'Make Admin'}</span>
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                                AdminService.deleteUser(user.id).then(() => {
                                  loadUsers();
                                  alert('User deleted successfully');
                                }).catch(() => {
                                  alert('Failed to delete user');
                                });
                              }
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete User</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages} • {filteredCount} users
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowUserDetails(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedUser.is_admin ? 'Administrator' : 'User'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Joined</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {format(new Date(selectedUser.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>

              {/* Subscription Info */}
              {selectedUser.subscriptions && selectedUser.subscriptions.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Subscription</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {selectedUser.subscriptions.map((sub: any, index: number) => (
                      <div key={index} className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Package:</span>
                          <span className="ml-2 font-medium">{sub.package?.name}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <span className="ml-2 font-medium capitalize">{sub.status}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Start Date:</span>
                          <span className="ml-2">{format(new Date(sub.start_date), 'MMM dd, yyyy')}</span>
                        </div>
                        {sub.end_date && (
                          <div>
                            <span className="text-gray-600">End Date:</span>
                            <span className="ml-2">{format(new Date(sub.end_date), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              {selectedUser.resume_analyses && selectedUser.resume_analyses.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Recent Analyses</h4>
                  <div className="space-y-2">
                    {selectedUser.resume_analyses.slice(0, 5).map((analysis: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">
                            {analysis.resume_templates?.name || 'Unknown Template'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(analysis.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                        {analysis.ats_score && (
                          <div className="text-right">
                            <p className="text-sm font-medium text-blue-600">
                              {analysis.ats_score}% ATS
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};