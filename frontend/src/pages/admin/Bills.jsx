import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, X, Search, Filter, Download, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const Bills = ({ navigate }) => {
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // view, create, edit
  const [selectedBill, setSelectedBill] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [readings, setReadings] = useState([]);
  const [formData, setFormData] = useState({
    meter_reading: '',
    user: '',
    due_date: '',
    base_charge: 50,
    discount: 0,
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchBills();
    fetchCustomers();
    fetchReadings();
  }, []);

  useEffect(() => {
    filterBills();
  }, [searchTerm, statusFilter, bills]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const response = await api.get('/accounts/bills/');
      console.log('Bills fetched:', response.data);
      // Handle both array and paginated responses
      const billsArray = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setBills(billsArray);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch bills: ' + (error.response?.data?.detail || error.message) });
      console.error('Error fetching bills:', error);
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/accounts/users/customers/');
      const customerArray = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setCustomers(customerArray);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const fetchReadings = async () => {
    try {
      const response = await api.get('/accounts/meter-readings/');
      const readingsArray = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setReadings(readingsArray);
    } catch (error) {
      console.error('Error fetching readings:', error);
      setReadings([]);
    }
  };

  const filterBills = () => {
    let filtered = bills;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(bill => bill.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(bill =>
        bill.bill_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredBills(filtered);
  };

  const openModal = (mode, bill = null) => {
    setModalMode(mode);
    setSelectedBill(bill);
    setFormErrors({});
    setMessage({ type: '', text: '' });

    if (mode === 'create') {
      setFormData({
        meter_reading: '',
        user: '',
        due_date: '',
        base_charge: 50,
        discount: 0,
        notes: ''
      });
    } else if (mode === 'edit' && bill) {
      setFormData({
        meter_reading: bill.meter_reading || '',
        user: bill.user || '',
        due_date: bill.due_date || '',
        base_charge: bill.base_charge || 50,
        discount: bill.discount || 0,
        notes: bill.notes || ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedBill(null);
    setFormErrors({});
    setMessage({ type: '', text: '' });
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
    if (modalMode === 'create') {
      if (!formData.meter_reading) errors.meter_reading = 'Meter reading is required';
      if (!formData.user) errors.user = 'Customer is required';
    }
    if (!formData.due_date) errors.due_date = 'Due date is required';
    if (isNaN(formData.base_charge) || formData.base_charge < 0) errors.base_charge = 'Invalid base charge';
    if (isNaN(formData.discount) || formData.discount < 0) errors.discount = 'Invalid discount';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitLoading(true);
    try {
      if (modalMode === 'create') {
        // First check if bill already exists for this reading
        const existingBill = bills.find(b => b.meter_reading == formData.meter_reading);
        if (existingBill) {
          setMessage({ type: 'error', text: 'A bill already exists for this meter reading' });
          setSubmitLoading(false);
          return;
        }

        // Use the auto-generate endpoint to create bill from meter reading
        const reading = readings.find(r => r.id == formData.meter_reading);
        if (!reading) {
          setMessage({ type: 'error', text: 'Meter reading not found' });
          setSubmitLoading(false);
          return;
        }

        // POST to auto-generate endpoint with meter reading ID
        await api.post(`/accounts/meter-readings/${reading.id}/generate_bill/`);
        setMessage({ type: 'success', text: 'Bill created successfully' });
      } else if (modalMode === 'edit' && selectedBill) {
        // For editing, only update due_date, base_charge, discount, notes
        const submitData = {
          due_date: formData.due_date,
          base_charge: formData.base_charge,
          discount: formData.discount,
          notes: formData.notes
        };
        await api.patch(`/accounts/bills/${selectedBill.id}/`, submitData);
        setMessage({ type: 'success', text: 'Bill updated successfully' });
      }

      setTimeout(() => {
        fetchBills();
        closeModal();
      }, 1000);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message || 'Failed to save bill';
      setMessage({ type: 'error', text: errorMsg });
      console.error('Error:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (billId) => {
    if (!window.confirm('Are you sure you want to delete this bill?')) return;

    try {
      await api.delete(`/accounts/bills/${billId}/`);
      setMessage({ type: 'success', text: 'Bill deleted successfully' });
      fetchBills();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete bill' });
      console.error('Error:', error);
    }
  };

  const handleApplyLateFee = async (billId) => {
    try {
      await api.post(`/accounts/bills/${billId}/apply_late_fee/`);
      setMessage({ type: 'success', text: 'Late fee applied successfully' });
      fetchBills();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to apply late fee' });
    }
  };

  const handleCancelBill = async (billId) => {
    if (!window.confirm('Are you sure you want to cancel this bill?')) return;

    try {
      await api.post(`/accounts/bills/${billId}/cancel/`);
      setMessage({ type: 'success', text: 'Bill cancelled successfully' });
      fetchBills();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cancel bill' });
    }
  };

  const formatCurrency = (amount) => {
    return `KSh ${parseFloat(amount || 0).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const getStatusColor = (status) => {
    const colors = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      partially_paid: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const isOverdue = (bill) => {
    return bill.status === 'pending' && new Date(bill.due_date) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bills...</p>
          <p className="text-xs text-gray-500 mt-2">(Check browser console for errors)</p>
        </div>
      </div>
    );
  }

  // Debug: Show data status
  console.log('Bills page render - bills count:', bills.length, 'filtered count:', filteredBills.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bills Management</h1>
          <p className="text-gray-600 mt-1">Manage and track water bills</p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Create Bill
        </button>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by bill number or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {filteredBills.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No bills found
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Bill #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Issue Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Due Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Amount</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{bill.bill_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{bill.user_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(bill.issue_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className={isOverdue(bill) ? 'text-red-600 font-medium' : ''}>
                        {new Date(bill.due_date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(bill.total_amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      {formatCurrency(bill.paid_amount)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                        {bill.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {isOverdue(bill) && (
                        <div className="text-red-600 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Overdue
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal('view', bill)}
                          className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-600"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {bill.status !== 'paid' && bill.status !== 'cancelled' && (
                          <button
                            onClick={() => openModal('edit', bill)}
                            className="p-2 hover:bg-green-100 rounded-lg transition text-green-600"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {isOverdue(bill) && bill.late_fee === 0 && (
                          <button
                            onClick={() => handleApplyLateFee(bill.id)}
                            className="p-2 hover:bg-orange-100 rounded-lg transition text-orange-600"
                            title="Apply Late Fee"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </button>
                        )}
                        {bill.status !== 'paid' && bill.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancelBill(bill.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(bill.id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition text-red-600"
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 flex justify-between items-center p-6 border-b border-gray-200 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">
                {modalMode === 'view' ? 'Bill Details' : modalMode === 'create' ? 'Create New Bill' : 'Edit Bill'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            {modalMode === 'view' && selectedBill ? (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-gray-600 text-sm">Bill Number</p>
                    <p className="text-lg font-medium">{selectedBill.bill_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Customer</p>
                    <p className="text-lg font-medium">{selectedBill.user_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Issue Date</p>
                    <p className="text-lg">{new Date(selectedBill.issue_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Due Date</p>
                    <p className="text-lg">{new Date(selectedBill.due_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Status</p>
                    <p className={`text-lg font-medium ${getStatusColor(selectedBill.status)}`}>
                      {selectedBill.status.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Total Amount</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedBill.total_amount)}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-bold text-gray-900 mb-4">Charge Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Consumption Charge</span>
                      <span>{formatCurrency(selectedBill.consumption_charge)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Base Charge</span>
                      <span>{formatCurrency(selectedBill.base_charge)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (16%)</span>
                      <span>{formatCurrency(selectedBill.tax_amount)}</span>
                    </div>
                    {selectedBill.late_fee > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Late Fee</span>
                        <span>{formatCurrency(selectedBill.late_fee)}</span>
                      </div>
                    )}
                    {selectedBill.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-{formatCurrency(selectedBill.discount)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <p className="text-gray-600">Total Paid</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(selectedBill.paid_amount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Balance Due</p>
                      <p className="text-lg font-bold text-red-600">{formatCurrency(selectedBill.balance_due)}</p>
                    </div>
                  </div>
                </div>

                {selectedBill.notes && (
                  <div className="border-t pt-4">
                    <p className="text-gray-600 text-sm">Notes</p>
                    <p className="text-gray-900">{selectedBill.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {message.text && (
                  <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                  </div>
                )}

                {modalMode === 'create' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Meter Reading</label>
                      <select
                        name="meter_reading"
                        value={formData.meter_reading}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Meter Reading</option>
                        {readings.map(reading => (
                          <option key={reading.id} value={reading.id}>
                            {reading.user_name} - {reading.consumption}m³ ({reading.billing_period_start})
                          </option>
                        ))}
                      </select>
                      {formErrors.meter_reading && <p className="text-red-600 text-xs mt-1">{formErrors.meter_reading}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                      <select
                        name="user"
                        value={formData.user}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Customer</option>
                        {customers.map(customer => (
                          <option key={customer.id} value={customer.id}>
                            {customer.first_name} {customer.last_name} ({customer.meter_number})
                          </option>
                        ))}
                      </select>
                      {formErrors.user && <p className="text-red-600 text-xs mt-1">{formErrors.user}</p>}
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  />
                  {formErrors.due_date && <p className="text-red-600 text-xs mt-1">{formErrors.due_date}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Charge</label>
                    <input
                      type="number"
                      name="base_charge"
                      value={formData.base_charge}
                      onChange={handleInputChange}
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    />
                    {formErrors.base_charge && <p className="text-red-600 text-xs mt-1">{formErrors.base_charge}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                    <input
                      type="number"
                      name="discount"
                      value={formData.discount}
                      onChange={handleInputChange}
                      step="0.01"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    />
                    {formErrors.discount && <p className="text-red-600 text-xs mt-1">{formErrors.discount}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                  >
                    {submitLoading ? 'Saving...' : modalMode === 'create' ? 'Create Bill' : 'Update Bill'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Bills;