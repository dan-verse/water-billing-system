import React, { useState, useEffect } from 'react';
import { Plus, Activity, FileText, CheckCircle, AlertCircle, Calendar, Eye, Trash2, Edit2, X } from 'lucide-react';
import api from '../../services/api';
import FormModal from '../../components/forms/FormModal';
import FormField from '../../components/forms/FormField';
import FormInput from '../../components/forms/FormInput';

const MeterReadingsPage = ({ navigate }) => {
  const [readings, setReadings] = useState([]);
  const [filteredReadings, setFilteredReadings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedReading, setSelectedReading] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [anomalyFilter, setAnomalyFilter] = useState('all');
  const [formData, setFormData] = useState({
    user: '',
    reading_date: new Date().toISOString().split('T')[0],
    previous_reading: '',
    current_reading: '',
    billing_period_start: '',
    billing_period_end: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchReadings();
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterReadings();
  }, [searchTerm, anomalyFilter, readings]);

  const fetchReadings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/accounts/meter-readings/');
      console.log('Meter readings fetched:', response.data);
      // Handle both array and paginated responses
      const readingsArray = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setReadings(readingsArray);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch readings: ' + (error.response?.data?.detail || error.message) });
      console.error('Error fetching readings:', error);
      setReadings([]);
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

  const filterReadings = () => {
    let filtered = readings;

    if (anomalyFilter !== 'all') {
      const isAnomaly = anomalyFilter === 'anomaly';
      filtered = filtered.filter(r => r.is_anomaly === isAnomaly);
    }

    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredReadings(filtered);
  };

  const openModal = (mode = 'create', reading = null) => {
    setModalMode(mode);
    setSelectedReading(reading);
    setFormErrors({});
    setMessage({ type: '', text: '' });

    if (mode === 'create') {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setFormData({
        user: '',
        reading_date: today.toISOString().split('T')[0],
        previous_reading: '',
        current_reading: '',
        billing_period_start: firstDay.toISOString().split('T')[0],
        billing_period_end: today.toISOString().split('T')[0],
        notes: ''
      });
    } else if (mode === 'edit' && reading) {
      setFormData({
        user: reading.user || '',
        reading_date: reading.reading_date || '',
        previous_reading: reading.previous_reading || '',
        current_reading: reading.current_reading || '',
        billing_period_start: reading.billing_period_start || '',
        billing_period_end: reading.billing_period_end || '',
        notes: reading.notes || ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedReading(null);
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
    if (!formData.user) errors.user = 'Customer is required';
    if (!formData.reading_date) errors.reading_date = 'Reading date is required';
    if (!formData.previous_reading) errors.previous_reading = 'Previous reading is required';
    if (!formData.current_reading) errors.current_reading = 'Current reading is required';
    if (!formData.billing_period_start) errors.billing_period_start = 'Start date is required';
    if (!formData.billing_period_end) errors.billing_period_end = 'End date is required';
    
    if (isNaN(formData.previous_reading) || isNaN(formData.current_reading)) {
      errors.current_reading = 'Invalid meter readings';
    } else if (parseFloat(formData.current_reading) <= parseFloat(formData.previous_reading)) {
      errors.current_reading = 'Current reading must be greater than previous reading';
    }
    
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
        const response = await api.post('/accounts/meter-readings/', formData);
        console.log('Reading created successfully:', response.data);
        setMessage({ type: 'success', text: 'Meter reading recorded successfully' });
      } else if (modalMode === 'edit' && selectedReading) {
        const response = await api.put(`/accounts/meter-readings/${selectedReading.id}/`, formData);
        console.log('Reading updated successfully:', response.data);
        setMessage({ type: 'success', text: 'Meter reading updated successfully' });
      }

      setTimeout(() => {
        closeModal();
        fetchReadings();
      }, 500);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message || 'Failed to save reading';
      setMessage({ type: 'error', text: errorMsg });
      console.error('Error saving reading:', error.response?.data || error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteReading = async (readingId) => {
    if (!window.confirm('Are you sure you want to delete this reading?')) return;

    try {
      await api.delete(`/accounts/meter-readings/${readingId}/`);
      setMessage({ type: 'success', text: 'Meter reading deleted successfully' });
      fetchReadings();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete reading' });
      console.error('Error:', error);
    }
  };

  const handleGenerateBill = async (reading) => {
    if (!window.confirm(`Generate bill for ${reading.user_name}?`)) return;

    try {
      await api.post(`/accounts/meter-readings/${reading.id}/generate_bill/`);
      setMessage({ type: 'success', text: 'Bill generated successfully!' });
      setTimeout(() => {
        fetchReadings();
      }, 1000);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to generate bill';
      setMessage({ type: 'error', text: errorMsg });
    }
  };

  const consumption = formData.current_reading && formData.previous_reading
    ? (parseFloat(formData.current_reading) - parseFloat(formData.previous_reading)).toFixed(2)
    : '0.00';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading meter readings...</p>
          <p className="text-xs text-gray-500 mt-2">(Check browser console for errors)</p>
        </div>
      </div>
    );
  }

  // Debug: Show data status
  console.log('Meter readings page render - readings count:', readings.length, 'filtered count:', filteredReadings.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meter Readings</h1>
          <p className="text-gray-600 mt-1">Record water meter readings and generate bills</p>
        </div>
        <button
          onClick={() => openModal('create')}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:shadow-lg transition-all font-medium"
        >
          <Plus className="w-5 h-5" />
          Record Reading
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
            <Activity className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={anomalyFilter}
            onChange={(e) => setAnomalyFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Readings</option>
            <option value="normal">Normal</option>
            <option value="anomaly">Anomalies Only</option>
          </select>
        </div>
      </div>

      {/* Readings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredReadings.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>No meter readings found</p>
            <button
              onClick={() => openModal('create')}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Record your first reading
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reading Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Previous</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Current</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Consumption</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReadings.map((reading) => (
                  <tr key={reading.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{reading.user_name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(reading.reading_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      {reading.previous_reading} m³
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      {reading.current_reading} m³
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {reading.consumption} m³
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(reading.billing_period_start).toLocaleDateString()} to {new Date(reading.billing_period_end).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {reading.is_anomaly ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                          <AlertCircle className="w-3 h-3" />
                          Anomaly
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal('view', reading)}
                          className="p-2 hover:bg-blue-100 rounded-lg transition text-blue-600"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('edit', reading)}
                          className="p-2 hover:bg-green-100 rounded-lg transition text-green-600"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleGenerateBill(reading)}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
                        >
                          <FileText className="w-4 h-4" />
                          Bill
                        </button>
                        <button
                          onClick={() => handleDeleteReading(reading.id)}
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
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <FormModal
          isOpen={showModal}
          onClose={closeModal}
          title={
            modalMode === 'create' ? 'Record Meter Reading' :
            modalMode === 'edit' ? 'Edit Meter Reading' :
            'Meter Reading Details'
          }
          isViewOnly={modalMode === 'view'}
          onSubmit={modalMode !== 'view' ? handleSubmit : null}
          submitText={modalMode === 'create' ? 'Record Reading' : modalMode === 'edit' ? 'Update Reading' : null}
          isLoading={submitLoading}
          message={message.text ? message : null}
          size="lg"
        >
          {modalMode === 'view' && selectedReading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <FormField label="Customer">
                  <p className="text-gray-900 font-medium">{selectedReading.user_name}</p>
                </FormField>
                <FormField label="Reading Date">
                  <p className="text-gray-900 font-medium">{new Date(selectedReading.reading_date).toLocaleDateString()}</p>
                </FormField>
                <FormField label="Previous Reading">
                  <p className="text-gray-900 font-medium">{selectedReading.previous_reading} m³</p>
                </FormField>
                <FormField label="Current Reading">
                  <p className="text-gray-900 font-medium">{selectedReading.current_reading} m³</p>
                </FormField>
                <FormField label="Consumption">
                  <p className="text-lg font-bold text-blue-600">{selectedReading.consumption} m³</p>
                </FormField>
                <FormField label="Status">
                  <p className={`text-lg font-medium ${selectedReading.is_anomaly ? 'text-red-600' : 'text-green-600'}`}>
                    {selectedReading.is_anomaly ? 'Anomaly' : 'Normal'}
                  </p>
                </FormField>
              </div>

              {selectedReading.notes && (
                <FormField label="Notes">
                  <p className="text-gray-900">{selectedReading.notes}</p>
                </FormField>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <FormField
                label="Customer"
                required
                error={formErrors.user}
              >
                <select
                  name="user"
                  value={formData.user}
                  onChange={handleInputChange}
                  disabled={modalMode === 'edit'}
                  className={`w-full px-4 py-2.5 text-gray-900 bg-white border rounded-lg transition-colors
                    ${formErrors.user 
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                    }
                    focus:outline-none`}
                >
                  <option value="">Select a customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.first_name} {customer.last_name} - {customer.meter_number}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-5">
                <FormField
                  label="Reading Date"
                  required
                  error={formErrors.reading_date}
                >
                  <FormInput
                    type="date"
                    name="reading_date"
                    value={formData.reading_date}
                    onChange={handleInputChange}
                    error={formErrors.reading_date}
                  />
                </FormField>

                <FormField
                  label="Consumption (m³)"
                >
                  <div className="px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 font-bold text-lg">
                    {formData.current_reading - formData.previous_reading || 0}
                  </div>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <FormField
                  label="Previous Reading (m³)"
                  required
                  error={formErrors.previous_reading}
                >
                  <FormInput
                    type="number"
                    name="previous_reading"
                    value={formData.previous_reading}
                    onChange={handleInputChange}
                    error={formErrors.previous_reading}
                    placeholder="0"
                  />
                </FormField>

                <FormField
                  label="Current Reading (m³)"
                  required
                  error={formErrors.current_reading}
                >
                  <FormInput
                    type="number"
                    name="current_reading"
                    value={formData.current_reading}
                    onChange={handleInputChange}
                    error={formErrors.current_reading}
                    placeholder="0"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <FormField
                  label="Billing Period Start"
                  required
                  error={formErrors.billing_period_start}
                >
                  <FormInput
                    type="date"
                    name="billing_period_start"
                    value={formData.billing_period_start}
                    onChange={handleInputChange}
                    error={formErrors.billing_period_start}
                  />
                </FormField>

                <FormField
                  label="Billing Period End"
                  required
                  error={formErrors.billing_period_end}
                >
                  <FormInput
                    type="date"
                    name="billing_period_end"
                    value={formData.billing_period_end}
                    onChange={handleInputChange}
                    error={formErrors.billing_period_end}
                  />
                </FormField>
              </div>

              <FormField
                label="Notes"
                error={formErrors.notes}
              >
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Any additional notes..."
                  className={`w-full px-4 py-2.5 text-gray-900 placeholder-gray-400 bg-white border rounded-lg transition-colors
                    ${formErrors.notes 
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                    }
                    focus:outline-none`}
                />
              </FormField>
            </div>
          )}
        </FormModal>
      )}
    </div>
  );
};

export default MeterReadingsPage;