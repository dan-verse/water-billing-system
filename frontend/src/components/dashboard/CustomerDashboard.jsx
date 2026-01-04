import React, { useState, useEffect } from 'react';
import { 
  Droplet, DollarSign, Clock, TrendingUp, Download, 
  Bell, AlertCircle, CheckCircle, Calendar, LogOut
} from 'lucide-react';

const CustomerDashboard = ({ user, onLogout }) => {
  const [summary, setSummary] = useState({
    totalBills: 0,
    pendingBills: 0,
    totalAmount: 0,
    currentBalance: 0
  });
  const [recentBills, setRecentBills] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      // Fetch summary
      const summaryRes = await fetch('http://127.0.0.1:8000/api/accounts/dashboard/summary/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary({
          totalBills: data.total_bills || 0,
          pendingBills: data.pending_bills || 0,
          totalAmount: data.total_revenue || 0,
          currentBalance: data.pending_revenue || 0
        });
      }

      // Fetch bills
      const billsRes = await fetch('http://127.0.0.1:8000/api/accounts/bills/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (billsRes.ok) {
        const billsData = await billsRes.json();
        setRecentBills(billsData.results || billsData || []);
      }

      // Fetch notifications
      const notifsRes = await fetch('http://127.0.0.1:8000/api/accounts/notifications/unread/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (notifsRes.ok) {
        const notifsData = await notifsRes.json();
        setNotifications(notifsData || []);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      partially_paid: 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    if (status === 'paid') return <CheckCircle className="w-4 h-4" />;
    if (status === 'overdue') return <AlertCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const formatCurrency = (amount) => {
    return `KSh ${parseFloat(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2 rounded-lg">
                <Droplet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Mbugua Water Billing</h1>
                <p className="text-sm text-gray-500">Welcome back, {user.first_name} {user.last_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-6 h-6 text-gray-600" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.first_name?.[0]}{user.last_name?.[0]}
                </div>
              </div>
              <button
                onClick={onLogout}
                className="ml-2 p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Droplet className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-1">Total Bills</p>
            <p className="text-3xl font-bold text-gray-900">{summary.totalBills}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-yellow-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-1">Pending Bills</p>
            <p className="text-3xl font-bold text-yellow-600">{summary.pendingBills}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalAmount)}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-1">Current Balance</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.currentBalance)}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Bills Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Recent Bills</h2>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                  View All
                  <TrendingUp className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                {recentBills.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <Droplet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p>No bills yet. Your first bill will appear here.</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bill Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Issue Date
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recentBills.map((bill) => (
                        <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {bill.bill_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {bill.issue_date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                            {formatCurrency(bill.total_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                              {getStatusIcon(bill.status)}
                              {bill.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <div className="flex items-center justify-end gap-2">
                              <button className="text-blue-600 hover:text-blue-700 font-medium">
                                View
                              </button>
                              {bill.status === 'pending' && (
                                <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors">
                                  Pay Now
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Notifications & Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Make Payment
                </button>
                <button className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-lg font-medium hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                  <Calendar className="w-5 h-5" />
                  View Usage History
                </button>
                <button className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" />
                  Download Reports
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
                {notifications.length > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                    {notifications.length} New
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">No new notifications</p>
                ) : (
                  notifications.slice(0, 3).map((notif) => (
                    <div
                      key={notif.id}
                      className="p-4 rounded-lg border bg-blue-50 border-blue-200"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <Bell className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900">{notif.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;