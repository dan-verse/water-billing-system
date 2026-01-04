import React from 'react';
import { 
  Droplet, Users, FileText, DollarSign, Activity,
  Bell, LogOut, Menu, X, Home
} from 'lucide-react';

// Import pages
import AdminDashboard from '../../pages/admin/Dashboard';
import CustomersPage from '../../pages/admin/Customers';
import MeterReadingsPage from '../../pages/admin/MeterReadings';
import BillsPage from '../../pages/admin/Bills';
import PaymentsPage from '../../pages/admin/Payments';

const AdminLayout = ({ user, currentRoute, navigate, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [notifications, setNotifications] = React.useState([]);

  React.useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://127.0.0.1:8000/api/accounts/notifications/unread/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const menuItems = [
    { id: 'admin_dashboard', icon: Home, label: 'Dashboard' },
    { id: 'admin_customers', icon: Users, label: 'Customers' },
    { id: 'admin_readings', icon: Activity, label: 'Meter Readings' },
    { id: 'admin_bills', icon: FileText, label: 'Bills' },
    { id: 'admin_payments', icon: DollarSign, label: 'Payments' }
  ];

  const renderPage = () => {
    const props = { navigate, user };
    
    switch(currentRoute) {
      case 'admin_dashboard':
        return <AdminDashboard {...props} />;
      case 'admin_customers':
        return <CustomersPage {...props} />;
      case 'admin_readings':
        return <MeterReadingsPage {...props} />;
      case 'admin_bills':
        return <BillsPage {...props} />;
      case 'admin_payments':
        return <PaymentsPage {...props} />;
      default:
        return <AdminDashboard {...props} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`bg-gradient-to-b from-blue-700 to-blue-900 text-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
        {/* Logo */}
        <div className="p-6 border-b border-blue-600 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Droplet className="w-8 h-8" />
              <div>
                <h1 className="font-bold text-lg">Mbugua</h1>
                <p className="text-xs text-blue-200">Water Billing</p>
              </div>
            </div>
          )}
          {!sidebarOpen && <Droplet className="w-8 h-8 mx-auto" />}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => navigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive 
                        ? 'bg-white text-blue-700 shadow-lg' 
                        : 'text-blue-100 hover:bg-blue-600'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="font-medium">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-blue-600">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-semibold">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-blue-200 capitalize">{user?.role}</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-semibold mx-auto mb-3">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
          )}
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="w-6 h-6 text-gray-600" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;