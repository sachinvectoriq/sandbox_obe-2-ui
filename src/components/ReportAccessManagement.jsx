import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, AlertCircle, CheckCircle, X, Users } from 'lucide-react';
import { useSelector } from 'react-redux';
import apiClient from '../services/apiClient';

const ReportAccessManagement = () => {
  const authState = useSelector((state) => state.auth);

  // Resolve admin/provider name from auth state
  const rawUserName = authState?.user?.name;
  const adminName = (Array.isArray(rawUserName) && rawUserName.length > 0)
    ? rawUserName[0]
    : rawUserName || 'Admin';

  const [accessUsers, setAccessUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ user_name: '', user_mail: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchAccessUsers();
  }, []);

  // ✅ FIXED: GET /api/report-access/all (was /get_reports_access on wrong base URL)
  const fetchAccessUsers = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/api/report-access/all');
      // API returns a plain string or array — handle both
      const data = response.data;
      if (Array.isArray(data)) {
        setAccessUsers(data);
      } else if (data?.records) {
        setAccessUsers(data.records);
      } else {
        setAccessUsers([]);
      }
    } catch (err) {
      setError(err.response?.data?.detail?.[0]?.msg || err.message || 'Failed to fetch access users');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ FIXED: POST /api/report-access/insert with correct fields: user_mail, user_name, provider_name
  const handleAddUser = async () => {
    if (!formData.user_name.trim() || !formData.user_mail.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.user_mail)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await apiClient.post('/api/report-access/insert', {
        user_name: formData.user_name.trim(),
        user_mail: formData.user_mail.trim(),
        provider_name: adminName, // ✅ FIXED: was "granted_by", API expects "provider_name"
      });

      setSuccess(`Access granted to ${formData.user_name}`);
      setFormData({ user_name: '', user_mail: '' });
      setShowModal(false);
      await fetchAccessUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const apiError = err.response?.data?.detail?.[0]?.msg
        || err.response?.data?.message
        || err.message
        || 'Failed to add user';
      setError(apiError);
    } finally {
      setIsSaving(false);
    }
  };

  // ⚠️ NOTE: No DELETE endpoint exists in the current API spec.
  // This is a placeholder — wire up to the real endpoint once it's available.
  const handleDeleteUser = async (id, userName) => {
    if (!window.confirm(`Are you sure you want to revoke report access for ${userName}?`)) {
      return;
    }

    setDeletingId(id);
    setError(null);

    try {
      // TODO: Replace with actual DELETE endpoint when available, e.g.:
      // await apiClient.delete(`/api/report-access/${id}`);
      throw new Error('Delete endpoint not yet available. Please contact the API team.');
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openModal = () => {
    setShowModal(true);
    setError(null);
    setFormData({ user_name: '', user_mail: '' });
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ user_name: '', user_mail: '' });
    setError(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#174a7e] mb-2">Access Management</h1>
        <p className="text-gray-600">Manage user access to reports section</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-[#174a7e]">Report Access List</h2>
          <button
            onClick={openModal}
            className="bg-[#174a7e] text-white px-4 py-2 rounded-lg hover:bg-[#0d3559] flex items-center gap-2 transition-colors"
          >
            <UserPlus size={18} />
            Grant Access
          </button>
        </div>

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <CheckCircle size={20} />
            <span>{success}</span>
          </div>
        )}

        {error && !showModal && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X size={18} />
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#174a7e]"></div>
            <span className="ml-3 text-gray-600 font-medium">Loading users...</span>
          </div>
        ) : accessUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users size={56} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No users have report access yet</p>
            <p className="text-sm mt-2">Click "Grant Access" to add users</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="text-left py-4 px-5 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-4 px-5 font-semibold text-gray-700">Email</th>
                  <th className="text-left py-4 px-5 font-semibold text-gray-700">Granted By</th>
                  <th className="text-left py-4 px-5 font-semibold text-gray-700">Date</th>
                  <th className="text-center py-4 px-5 font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {accessUsers.map((user, index) => (
                  <tr
                    key={user.id ?? index}
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    {/* ✅ Safely read both user.user_name and user.name fallback */}
                    <td className="py-4 px-5 text-gray-800 font-medium">
                      {user.user_name || user.name || '—'}
                    </td>
                    {/* ✅ Safely read both user.user_mail and user.email fallback */}
                    <td className="py-4 px-5 text-gray-600">
                      {user.user_mail || user.email || '—'}
                    </td>
                    {/* ✅ Safely read both user.provider_name and user.granted_by fallback */}
                    <td className="py-4 px-5 text-gray-600">
                      {user.provider_name || user.granted_by || '—'}
                    </td>
                    <td className="py-4 px-5 text-gray-600 text-sm">
                      {formatDate(user.permission_granted_at || user.created_at)}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <button
                        onClick={() => handleDeleteUser(user.id, user.user_name || user.name)}
                        disabled={deletingId === user.id}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center justify-center"
                        title="Revoke Access"
                      >
                        {deletingId === user.id ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <strong>Note:</strong> Users granted access here will be able to view the Reports section in the application header.
        </div>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-[#174a7e]">Grant Report Access</h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSaving}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                  <AlertCircle size={20} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    User Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.user_name}
                    onChange={(e) =>
                      setFormData({ ...formData, user_name: e.target.value })
                    }
                    placeholder="Enter user's full name"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#174a7e] focus:border-transparent"
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.user_mail} // ✅ FIXED: was formData.email
                    onChange={(e) =>
                      setFormData({ ...formData, user_mail: e.target.value })
                    }
                    placeholder="user@example.com"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#174a7e] focus:border-transparent"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={closeModal}
                className="px-5 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors font-medium"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="px-5 py-2 rounded-lg bg-[#174a7e] text-white hover:bg-[#0d3559] transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={isSaving}
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding...
                  </span>
                ) : (
                  'Grant Access'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportAccessManagement;