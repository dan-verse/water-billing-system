import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, X, Search, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const Payments = ({ navigate }) => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [bills, setBills] = useState([]);
  const [formData, setFormData] = useState({
    bill: '',
    amount: '',
    payment_method: 'mpesa',
    payment_reference: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchPayments();
    fetchBills();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [searchTerm, methodFilter, payments]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/accounts/payments/');
      console.log('Payments fetched:', response.data);
      // Handle both array and paginated responses
      const paymentsArray = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setPayments(paymentsArray);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch payments: ' + (error.response?.data?.detail || error.message) });
      console.error('Error fetching payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBills = async () => {
    try {
      const response = await api.get('/accounts/bills/');
      console.log('Bills fetched for payments:', response.data);
      
      // Handle both array and paginated responses
      const billsArray = Array.isArray(response.data) ? response.data : (response.data.results || []);
      
      // Filter only pending and partially paid bills
      const unpaidBills = billsArray.filter(bill => 
        bill.status === 'pending' || bill.status === 'partially_paid'
      );
      setBills(unpaidBills);
    } catch (error) {
      console.error('Error fetching bills:', error);
      setBills([]);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    if (methodFilter !== 'all') {
      filtered = filtered.filter(payment => payment.payment_method === methodFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.bill_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPayments(filtered);
  };

  const openModal = (mode, payment = null) => {
    setModalMode(mode);
    setSelectedPayment(payment);
    setFormErrors({});
    setMessage({ type: '', text: '' });

    if (mode === 'create') {
      setFormData({
        bill: '',
        amount: '',
        payment_method: 'mpesa',
        payment_reference: '',
        notes: ''
      });
    } else if (mode === 'edit' && payment) {
      setFormData({
        bill: payment.bill || '',
        amount: payment.amount || '',
        payment_method: payment.payment_method || 'mpesa',
        payment_reference: payment.payment_reference || '',
        notes: payment.notes || ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPayment(null);
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
    if (!formData.bill) errors.bill = 'Bill is required';
    if (!formData.amount) errors.amount = 'Amount is required';
    if (isNaN(formData.amount) || parseFloat(formData.amount) <= 0) errors.amount = 'Invalid amount';
    if (!formData.payment_method) errors.payment_method = 'Payment method is required';
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
      const selectedBill = bills.find(b => b.id == formData.bill);
      if (!selectedBill) {
        setMessage({ type: 'error', text: 'Invalid bill selected' });
        setSubmitLoading(false);
        return;
      }

      if (parseFloat(formData.amount) > parseFloat(selectedBill.balance_due)) {
        setMessage({ type: 'error', text: `Amount cannot exceed balance due (KSh ${selectedBill.balance_due})` });
        setSubmitLoading(false);
        return;
      }

      if (modalMode === 'create') {
        await api.post('/accounts/payments/', formData);
        setMessage({ type: 'success', text: 'Payment recorded successfully' });
      } else if (modalMode === 'edit' && selectedPayment) {
        await api.put(`/accounts/payments/${selectedPayment.id}/`, formData);
        setMessage({ type: 'success', text: 'Payment updated successfully' });
      }

      setTimeout(() => {
        fetchPayments();
        fetchBills();
        closeModal();
      }, 1000);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.response?.data?.error || 'Failed to save payment';
      setMessage({ type: 'error', text: errorMsg });
      console.error('Error:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;

    try {
      await api.delete(`/accounts/payments/${paymentId}/`);
      setMessage({ type: 'success', text: 'Payment deleted successfully' });
      fetchPayments();
      fetchBills();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete payment' });
      console.error('Error:', error);
    }
  };

  const handleVerifyPayment = async (paymentId) => {
    try {
      await api.post(`/accounts/payments/${paymentId}/verify/`);
      setMessage({ type: 'success', text: 'Payment verified successfully' });
      fetchPayments();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to verify payment' });
    }
  };

  const formatCurrency = (amount) => {
    return `KSh ${parseFloat(amount || 0).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const getMethodColor = (method) => {
    const colors = {
      mpesa: 'bg-green-100 text-green-800',
      card: 'bg-blue-100 text-blue-800',
      bank: 'bg-purple-100 text-purple-800',
      cash: 'bg-yellow-100 text-yellow-800'
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  const getMethodLabel = (method) => {
    const labels = {
      mpesa: 'M-Pesa',
      card: 'Card',
      bank: 'Bank Transfer',
      cash: 'Cash'
    };
    return labels[method] || method;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payments...</p>
          <p className="text-xs text-gray-500 mt-2">(Check browser console for errors)</p>
        </div>
      </div>
    );
  }

  // Debug: Show data status
  console.log('Payments page render - payments count:', payments.length, 'filtered count:', filteredPayments.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments Management</h1>
          <p className="text-gray-600 mt-1">Record and manage customer payments</p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5" />
          Record Payment
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
              placeholder="Search by transaction ID or bill number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Methods</option>
            <option value="mpesa">M-Pesa</option>
            <option value="card">Card</option>
            <option value="bank">Bank Transfer</option>
            <option value="cash">Cash</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No payments found
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Transaction ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Bill #</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{payment.transaction_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{payment.bill_number}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getMethodColor(payment.payment_method)}`}>
                        {getMethodLabel(payment.payment_method)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {payment.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-yellow-600">
                          <AlertCircle className="w-4 h-4" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal('view', payment)}
                          className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-600"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {!payment.is_verified && (
                          <button
                            onClick={() => handleVerifyPayment(payment.id)}
                            className="p-2 hover:bg-green-100 rounded-lg transition text-green-600"
                            title="Verify Payment"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(payment.id)}
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
            <div className="sticky top-0 flex justify-between items-center p-6 border-b border-gray-200 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">
                {modalMode === 'view' ? 'Payment Details' : 'Record Payment'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {modalMode === 'view' && selectedPayment ? (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-gray-600 text-sm">Transaction ID</p>
                    <p className="text-lg font-medium">{selectedPayment.transaction_id}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Bill Number</p>
                    <p className="text-lg font-medium">{selectedPayment.bill_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Amount</p>
                    <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedPayment.amount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Payment Method</p>
                    <p className="text-lg font-medium">{getMethodLabel(selectedPayment.payment_method)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Payment Date</p>
                    <p className="text-lg">{new Date(selectedPayment.payment_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Status</p>
                    <p className={`text-lg font-medium ${selectedPayment.is_verified ? 'text-green-600' : 'text-yellow-600'}`}>
                      {selectedPayment.is_verified ? 'Verified' : 'Pending Verification'}
                    </p>
                  </div>
                </div>

                {selectedPayment.payment_reference && (
                  <div className="border-t pt-4">
                    <p className="text-gray-600 text-sm">Payment Reference</p>
                    <p className="text-gray-900 font-medium">{selectedPayment.payment_reference}</p>
                  </div>
                )}

                {selectedPayment.notes && (
                  <div className="border-t pt-4">
                    <p className="text-gray-600 text-sm">Notes</p>
                    <p className="text-gray-900">{selectedPayment.notes}</p>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bill</label>
                  <select
                    name="bill"
                    value={formData.bill}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Bill</option>
                    {bills.map(bill => (
                      <option key={bill.id} value={bill.id}>
                        {bill.bill_number} - {bill.user_name} - Balance: {formatCurrency(bill.balance_due)}
                      </option>
                    ))}
                  </select>
                  {formErrors.bill && <p className="text-red-600 text-xs mt-1">{formErrors.bill}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KSh)</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {formErrors.amount && <p className="text-red-600 text-xs mt-1">{formErrors.amount}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="mpesa">M-Pesa</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="cash">Cash</option>
                  </select>
                  {formErrors.payment_method && <p className="text-red-600 text-xs mt-1">{formErrors.payment_method}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Reference</label>
                  <input
                    type="text"
                    name="payment_reference"
                    value={formData.payment_reference}
                    onChange={handleInputChange}
                    placeholder="e.g., M-Pesa Code or Receipt Number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
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
                    {submitLoading ? 'Recording...' : 'Record Payment'}
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

export default Payments;