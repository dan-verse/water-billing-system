import React from 'react';
import CustomerDashboard from '../dashboard/CustomerDashboard';

const CustomerLayout = ({ user, onLogout }) => {
  return <CustomerDashboard user={user} onLogout={onLogout} />;
};

export default CustomerLayout;