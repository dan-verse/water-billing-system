import React, { useState, useEffect } from 'react';
import LoginPage from './components/auth/LoginPage';
import AdminLayout from './components/layouts/AdminLayout';
import CustomerLayout from './components/layouts/CustomerLayout';

// Simple router state management
const ROUTES = {
  LOGIN: 'login',
  ADMIN_DASHBOARD: 'admin_dashboard',
  ADMIN_CUSTOMERS: 'admin_customers',
  ADMIN_READINGS: 'admin_readings',
  ADMIN_BILLS: 'admin_bills',
  ADMIN_PAYMENTS: 'admin_payments',
  CUSTOMER_DASHBOARD: 'customer_dashboard',
  CUSTOMER_BILLS: 'customer_bills',
  CUSTOMER_PAYMENTS: 'customer_payments'
};

function App() {
  const [currentRoute, setCurrentRoute] = useState(ROUTES.LOGIN);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        
        // Set initial route based on role
        if (userData.role === 'admin' || userData.role === 'operator') {
          setCurrentRoute(ROUTES.ADMIN_DASHBOARD);
        } else {
          setCurrentRoute(ROUTES.CUSTOMER_DASHBOARD);
        }
      } catch (error) {
        console.error('Error parsing saved user:', error);
        handleLogout();
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Route to appropriate dashboard
    if (userData.role === 'admin' || userData.role === 'operator') {
      setCurrentRoute(ROUTES.ADMIN_DASHBOARD);
    } else {
      setCurrentRoute(ROUTES.CUSTOMER_DASHBOARD);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentRoute(ROUTES.LOGIN);
  };

  const navigate = (route) => {
    setCurrentRoute(route);
  };

  // Login route
  if (currentRoute === ROUTES.LOGIN) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Admin routes
  if (user && (user.role === 'admin' || user.role === 'operator')) {
    return (
      <AdminLayout 
        user={user}
        currentRoute={currentRoute}
        navigate={navigate}
        onLogout={handleLogout}
      />
    );
  }

  // Customer routes
  if (user && user.role === 'customer') {
    return (
      <CustomerLayout
        user={user}
        currentRoute={currentRoute}
        navigate={navigate}
        onLogout={handleLogout}
      />
    );
  }

  // Fallback
  return <LoginPage onLogin={handleLogin} />;
}

export default App;