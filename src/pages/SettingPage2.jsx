// src/pages/SettingPage.jsx
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Settings, Users } from 'lucide-react';
import Header from '../components/Header';
import ReportAccessManagement from '../components/ReportAccessManagement';

const API_BASE = 'https://app-ocm20-obe-dev-001-dgd8hbbyeyc2d2fv.eastus2-01.azurewebsites.net//';

const SettingPage = () => {
  const navigate = useNavigate();

  // Get dynamic values from Redux
  const user = useSelector(state => state.auth.user);
  const selectedLanguage = useSelector(state => state.chat.selectedLanguage);
  const rawUserName = user?.name;
  const userName = (Array.isArray(rawUserName) && rawUserName.length > 0)
    ? rawUserName[0]
    : rawUserName || 'Anonymous';
  const loginSessionId = useSelector(state => state.auth.login_session_id);

  // Language text helper
  const getText = (key) => {
    const translations = {
      loadingSettings: { en: 'Loading settings...', fr: 'Chargement des paramètres...' },
      error: { en: 'Error!', fr: 'Erreur !' },
      saving: { en: 'Saving...', fr: 'Enregistrement...' },
      savingMessage: { en: 'Please wait while we update your settings.', fr: 'Veuillez patienter pendant que nous mettons à jour vos paramètres.' }
    };
    return translations[key][selectedLanguage] || translations[key]['en'];
  };

  // --- ADMIN ACCESS CHECK ---
 

  const [activeSection, setActiveSection] = useState('general');

  const [formData, setFormData] = useState({
    azure_search_endpoint: '',
    azure_search_index_name: '',
    current_prompt: '',
    openai_model_deployment_name: '',
    openai_endpoint: '',
    openai_api_version: '',
    openai_model_temperature: '',
    openai_api_key: '',
    semantic_configuration_name_english: '',
    azure_search_index_name_french: '',
    current_prompt_french: '',
    semantic_configuration_name_french: ''
  });

  const [originalData, setOriginalData] = useState({});
  const [azureEdit, setAzureEdit] = useState(false);
  const [promptEdit, setPromptEdit] = useState(false);
  const [openaiEdit, setOpenaiEdit] = useState(false);
  const [semanticEdit, setSemanticEdit] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch settings from API only if user is admin
  useEffect(() => {
    const adminId = user?.group === 'admin' ? user?.admin_id : null;

    fetch(`${API_BASE}/get_settings`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch settings: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setFormData(data);
        setOriginalData(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [user]);

  const updateField = (field, value) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const postSettings = async () => {
    setIsSaving(true);
    setError(null);

    const allowedKeys = [
      'azure_search_endpoint',
      'azure_search_index_name',
      'current_prompt',
      'openai_model_deployment_name',
      'openai_endpoint',
      'openai_api_version',
      'openai_model_temperature',
      'openai_api_key',
      'semantic_configuration_name_english',
      'azure_search_index_name_french',
      'current_prompt_french',
      'semantic_configuration_name_french'
    ];

    const body = new URLSearchParams();
    allowedKeys.forEach(k => {
      if (formData[k] !== undefined) body.append(k, formData[k]);
    });

    body.append('user_name', userName);
    body.append('login_session_id', loginSessionId);

    try {
      const response = await fetch(`${API_BASE}/update_settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || `Failed to update settings`);
      }

      const successMsg = await response.json();
      console.log('Update successful:', successMsg);
      setOriginalData({ ...formData });
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const saveSection = async (setter) => {
    if (await postSettings()) setter(false);
  };

  const cancelSection = (fields, setter) => {
    setFormData(prev => {
      const updated = { ...prev };
      fields.forEach(f => updated[f] = originalData[f]);
      return updated;
    });
    setter(false);
  };

  

  const menuItems = [
    { id: 'general', label: 'General Settings', icon: Settings },
    { id: 'access', label: 'Access Management', icon: Users }
  ];

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      <Header />
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg fixed left-0 top-0 h-screen pt-20">
          <div className="p-4 h-full overflow-y-auto">
            <h2 className="text-xl font-bold text-[#174a7e] px-3 py-2 mb-6">Settings</h2>
            <nav className="space-y-2">
              {menuItems.map(item => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive ? 'bg-[#174a7e] text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64 p-8 overflow-y-auto">
          {isLoading && <LoadingSpinner getText={getText} />}
          {error && <ErrorBanner message={error} onClose={() => setError(null)} getText={getText} />}
          {isSaving && <SavingBanner getText={getText} />}

          {!isLoading && (
            <>
              {activeSection === 'general' && (
                <>
                  {/* Azure Search Parameters */}
                  <SectionCard title="Azure Search Parameters">
                    <LabelledInput
                      disabled={!azureEdit}
                      label="Search Endpoint"
                      value={formData.azure_search_endpoint}
                      onChange={v => updateField('azure_search_endpoint', v)}
                    />
                    <LabelledInput
                      disabled={!azureEdit}
                      label="English Index Name"
                      value={formData.azure_search_index_name}
                      onChange={v => updateField('azure_search_index_name', v)}
                    />
                    <LabelledInput
                      disabled={!azureEdit}
                      label="French Index Name"
                      value={formData.azure_search_index_name_french}
                      onChange={v => updateField('azure_search_index_name_french', v)}
                    />
                    {!azureEdit ? (
                      <ChangeButton onClick={() => setAzureEdit(true)} />
                    ) : (
                      <ActionButtons
                        onSave={() => saveSection(setAzureEdit)}
                        onCancel={() =>
                          cancelSection(['azure_search_endpoint', 'azure_search_index_name', 'azure_search_index_name_french'], setAzureEdit)
                        }
                        disabled={isSaving}
                      />
                    )}
                  </SectionCard>

                  {/* Semantic Model Parameters */}
                  <SectionCard title="Semantic Model Parameters">
                    <LabelledInput
                      disabled={!semanticEdit}
                      label="English Semantic Configuration Name"
                      value={formData.semantic_configuration_name_english}
                      onChange={v => updateField('semantic_configuration_name_english', v)}
                    />
                    <LabelledInput
                      disabled={!semanticEdit}
                      label="French Semantic Configuration Name"
                      value={formData.semantic_configuration_name_french}
                      onChange={v => updateField('semantic_configuration_name_french', v)}
                    />
                    {!semanticEdit ? (
                      <ChangeButton onClick={() => setSemanticEdit(true)} />
                    ) : (
                      <ActionButtons
                        onSave={() => saveSection(setSemanticEdit)}
                        onCancel={() =>
                          cancelSection(['semantic_configuration_name_english', 'semantic_configuration_name_french'], setSemanticEdit)
                        }
                        disabled={isSaving}
                      />
                    )}
                  </SectionCard>

                  {/* OpenAI Parameters */}
                  <SectionCard title="OpenAI Model Parameters">
                    <LabelledInput
                      disabled={!openaiEdit}
                      label="Deployment Name"
                      value={formData.openai_model_deployment_name}
                      onChange={v => updateField('openai_model_deployment_name', v)}
                    />
                    <LabelledInput
                      disabled={!openaiEdit}
                      label="Endpoint"
                      value={formData.openai_endpoint}
                      onChange={v => updateField('openai_endpoint', v)}
                    />
                    <LabelledInput
                      disabled={!openaiEdit}
                      label="API Version"
                      value={formData.openai_api_version}
                      onChange={v => updateField('openai_api_version', v)}
                    />
                    <LabelledInput
                      disabled={!openaiEdit}
                      label="Temperature"
                      type="number"
                      step="0.01"
                      min="0"
                      max="2"
                      value={formData.openai_model_temperature}
                      onChange={v => updateField('openai_model_temperature', v)}
                    />
                    <LabelledInput
                      disabled={!openaiEdit}
                      label="OpenAI API Key"
                      value={formData.openai_api_key}
                      onChange={v => updateField('openai_api_key', v)}
                    />
                    {!openaiEdit ? (
                      <ChangeButton onClick={() => setOpenaiEdit(true)} />
                    ) : (
                      <ActionButtons
                        onSave={() => saveSection(setOpenaiEdit)}
                        onCancel={() =>
                          cancelSection(
                            ['openai_model_deployment_name', 'openai_endpoint', 'openai_api_version', 'openai_model_temperature', 'openai_api_key'],
                            setOpenaiEdit
                          )
                        }
                        disabled={isSaving}
                      />
                    )}
                  </SectionCard>

                  {/* Prompts */}
                  <SectionCard title="System Prompts">
                    <LabelledTextarea
                      disabled={!promptEdit}
                      label="English Prompt"
                      value={formData.current_prompt}
                      onChange={v => updateField('current_prompt', v)}
                    />
                    <LabelledTextarea
                      disabled={!promptEdit}
                      label="French Prompt"
                      value={formData.current_prompt_french}
                      onChange={v => updateField('current_prompt_french', v)}
                    />
                    {!promptEdit ? (
                      <ChangeButton onClick={() => setPromptEdit(true)} />
                    ) : (
                      <ActionButtons
                        onSave={() => saveSection(setPromptEdit)}
                        onCancel={() => cancelSection(['current_prompt', 'current_prompt_french'], setPromptEdit)}
                        disabled={isSaving}
                      />
                    )}
                  </SectionCard>
                </>
              )}

              {/* Access Management Section */}
              {activeSection === 'access' && (
                <ReportAccessManagement adminName={userName} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ----------------- SMALL COMPONENTS ------------------ */

const LoadingSpinner = ({ getText }) => (
  <div className="flex justify-center items-center py-12">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <div className="text-lg font-semibold text-blue-600">{getText('loadingSettings')}</div>
    </div>
  </div>
);

const ErrorBanner = ({ message, onClose, getText }) => (
  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
    <strong className="font-bold">{getText('error')}</strong>
    <span className="block sm:inline"> {message}</span>
    <button onClick={onClose} className="absolute top-0 bottom-0 right-0 px-4 py-3">×</button>
  </div>
);

const SavingBanner = ({ getText }) => (
  <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
    <strong className="font-bold">{getText('saving')}</strong>
    <span className="block sm:inline"> {getText('savingMessage')}</span>
  </div>
);

const SectionCard = ({ title, children }) => (
  <div className="bg-white p-6 rounded shadow-md mb-8">
    <h2 className="text-xl font-semibold text-[#174a7e] mb-4">{title}</h2>
    {children}
  </div>
);

const LabelledInput = ({ label, value, onChange, disabled, type = "text", ...props }) => (
  <div className="mb-4">
    <label className="block font-medium text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      className={`w-full border rounded px-4 py-2 ${disabled ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-400'}`}
      {...props}
    />
  </div>
);

const LabelledTextarea = ({ label, value, onChange, disabled }) => (
  <div className="mb-4">
    <label className="block font-medium text-gray-700 mb-1">{label}</label>
    <textarea
      rows="4"
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      className={`w-full border rounded px-4 py-2 resize-vertical ${disabled ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-400'}`}
    />
  </div>
);

const ChangeButton = ({ onClick }) => (
  <div className="flex justify-end pt-2">
    <button onClick={onClick} className="text-blue-600 font-medium hover:underline">Change</button>
  </div>
);

const ActionButtons = ({ onSave, onCancel, disabled = false }) => (
  <div className="flex justify-end gap-3 pt-4">
    <button
      onClick={onCancel}
      disabled={disabled}
      className={`px-4 py-2 rounded ${disabled ? 'bg-gray-100 text-gray-400' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
    >
      Cancel
    </button>
    <button
      onClick={onSave}
      disabled={disabled}
      className={`px-4 py-2 rounded ${disabled ? 'bg-yellow-200 text-gray-400' : 'bg-yellow-400 text-black hover:bg-yellow-500'}`}
    >
      {disabled ? 'Saving...' : 'Save'}
    </button>
  </div>
);

export default SettingPage;
