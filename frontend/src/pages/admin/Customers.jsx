import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Eye, X, User, Mail, Phone } from 'lucide-react';
import api from '../../services/api';
import FormModal from '../../components/forms/FormModal';
import FormField from '../../components/forms/FormField';
import FormInput from '../../components/forms/FormInput';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [formData, setFormData] = useState({
    username: '', email: '', first_name: '', last_name: '',
    phone_number: '+254', address: '', meter_number: '',
    password: '', password_confirm: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const filtered = customers.filter(customer => 
      customer.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.meter_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://127.0.0.1:8000/api/accounts/users/customers/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Customers fetched:', data);
        const customerArray = Array.isArray(data) ? data : (data.results || []);
        setCustomers(customerArray);
        setFilteredCustomers(customerArray);
      } else {
        console.error('Failed to fetch customers:', response.status);
        setCustomers([]);
        setFilteredCustomers([]);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
      setFilteredCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (mode, customer = null) => {
    setModalMode(mode);
    setSelectedCustomer(customer);
    setFormErrors({});
    setSuccessMessage('');
    
    if (mode === 'add') {
      setFormData({
        username: '', email: '', first_name: '', last_name: '',
        phone_number: '+254', address: '', meter_number: '',
        password: '', password_confirm: ''
      });
    } else if (mode === 'edit' && customer) {
      setFormData({
        username: customer.username, email: customer.email,
        first_name: customer.first_name, last_name: customer.last_name,
        phone_number: customer.phone_number, address: customer.address,
        meter_number: customer.meter_number, password: '', password_confirm: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCustomer(null);
    setFormErrors({});
    setSuccessMessage('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.username.trim()) errors.username = 'Username is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.first_name.trim()) errors.first_name = 'First name is required';
    if (!formData.last_name.trim()) errors.last_name = 'Last name is required';
    if (!formData.phone_number.trim()) errors.phone_number = 'Phone number is required';
    if (!formData.meter_number.trim()) errors.meter_number = 'Meter number is required';
    
    if (modalMode === 'add') {
      if (!formData.password) errors.password = 'Password is required';
      if (formData.password !== formData.password_confirm) {
        errors.password_confirm = 'Passwords do not match';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setSubmitLoading(true);
    setFormErrors({});

    try {
      const token = localStorage.getItem('access_token');
      const url = modalMode === 'add' 
        ? 'http://127.0.0.1:8000/api/accounts/users/'
        : `http://127.0.0.1:8000/api/accounts/users/${selectedCustomer.id}/`;
      
      const method = modalMode === 'add' ? 'POST' : 'PATCH';
      const payload = { ...formData, role: 'customer' };
      
      if (modalMode === 'edit' && !formData.password) {
        delete payload.password;
        delete payload.password_confirm;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSuccessMessage(`Customer ${modalMode === 'add' ? 'added' : 'updated'} successfully!`);
        setTimeout(() => {
          closeModal();
          fetchCustomers();
        }, 1500);
      } else {
        const errorData = await response.json();
        setFormErrors(errorData);
      }
    } catch (error) {
      setFormErrors({ general: 'An error occurred. Please try again.' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Are you sure you want to delete ${customer.first_name} ${customer.last_name}?`)) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://127.0.0.1:8000/api/accounts/users/${customer.id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage water billing customers</p>
        </div>
        <button
          onClick={() => openModal('add')}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading customers...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p>No customers found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meter #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {customer.first_name?.[0]}{customer.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{customer.first_name} {customer.last_name}</p>
                          <p className="text-sm text-gray-500">@{customer.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {customer.email}
                        </p>
                        <p className="text-gray-600 flex items-center gap-2 mt-1">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {customer.phone_number}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {customer.meter_number}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        customer.is_active_customer ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {customer.is_active_customer ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal('view', customer)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('edit', customer)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <FormModal
        isOpen={showModal}
        onClose={closeModal}
        title={
          modalMode === 'add' ? 'Add New Customer' :
          modalMode === 'edit' ? 'Edit Customer' :
          'Customer Details'
        }
        isViewOnly={modalMode === 'view'}
        onSubmit={modalMode !== 'view' ? handleSubmit : null}
        submitText={modalMode === 'add' ? 'Add Customer' : modalMode === 'edit' ? 'Save Changes' : null}
        isLoading={submitLoading}
        message={successMessage || (formErrors.general ? { type: 'error', text: formErrors.general } : null)}
        size="lg"
      >
        {modalMode === 'view' && selectedCustomer ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <FormField label="First Name">
                <p className="text-gray-900 font-medium">{selectedCustomer?.first_name}</p>
              </FormField>
              <FormField label="Last Name">
                <p className="text-gray-900 font-medium">{selectedCustomer?.last_name}</p>
              </FormField>
              <FormField label="Username">
                <p className="text-gray-900 font-medium">{selectedCustomer?.username}</p>
              </FormField>
              <FormField label="Email">
                <p className="text-gray-900 font-medium">{selectedCustomer?.email}</p>
              </FormField>
              <FormField label="Phone">
                <p className="text-gray-900 font-medium">{selectedCustomer?.phone_number}</p>
              </FormField>
              <FormField label="Meter Number">
                <p className="text-gray-900 font-medium">{selectedCustomer?.meter_number}</p>
              </FormField>
            </div>
            <FormField label="Address" className="col-span-2">
              <p className="text-gray-900">{selectedCustomer?.address || '-'}</p>
            </FormField>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-5">
              <FormField
                label="First Name"
                required
                error={formErrors.first_name}
              >
                <FormInput
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  error={formErrors.first_name}
                  placeholder="John"
                />
              </FormField>

              <FormField
                label="Last Name"
                required
                error={formErrors.last_name}
              >
                <FormInput
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  error={formErrors.last_name}
                  placeholder="Doe"
                />
              </FormField>

              <FormField
                label="Username"
                required
                error={formErrors.username}
              >
                <FormInput
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  error={formErrors.username}
                  placeholder="johndoe"
                />
              </FormField>

              <FormField
                label="Email"
                required
                error={formErrors.email}
              >
                <FormInput
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  error={formErrors.email}
                  placeholder="john@example.com"
                />
              </FormField>

              <FormField
                label="Phone Number"
                required
                error={formErrors.phone_number}
              >
                <FormInput
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  error={formErrors.phone_number}
                  placeholder="+254123456789"
                />
              </FormField>

              <FormField
                label="Meter Number"
                required
                error={formErrors.meter_number}
              >
                <FormInput
                  name="meter_number"
                  value={formData.meter_number}
                  onChange={handleInputChange}
                  error={formErrors.meter_number}
                  placeholder="MTR001"
                />
              </FormField>
            </div>

            <FormField
              label="Address"
              error={formErrors.address}
            >
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows="3"
                placeholder="123 Main Street, City, Country"
                className={`w-full px-4 py-2.5 text-gray-900 placeholder-gray-400 bg-white border rounded-lg transition-colors
                  ${formErrors.address 
                    ? 'border-red-500 focus:ring-2 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                  }
                  focus:outline-none`}
              />
            </FormField>

            {modalMode === 'add' && (
              <div className="grid grid-cols-2 gap-5 pt-2">
                <FormField
                  label="Password"
                  required
                  error={formErrors.password}
                >
                  <FormInput
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    error={formErrors.password}
                    placeholder="••••••••"
                  />
                </FormField>

                <FormField
                  label="Confirm Password"
                  required
                  error={formErrors.password_confirm}
                >
                  <FormInput
                    type="password"
                    name="password_confirm"
                    value={formData.password_confirm}
                    onChange={handleInputChange}
                    error={formErrors.password_confirm}
                    placeholder="••••••••"
                  />
                </FormField>
              </div>
            )}
          </div>
        )}
      </FormModal>
    </div>
  );
};

export default CustomersPage;