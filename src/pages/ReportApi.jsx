import React, { useState, useMemo } from 'react';
import Header from '../components/Header';

const Report = () => {
  // --- Hardcoded Dummy Data (API Ready) ---
  // TODO: Replace with API call - const fetchLogData = async () => { const response = await fetch('/api/logs'); return await response.json(); }
  const loggingData = [
    {
      chat_session_id: 'log_001',
      user_id: 'U001',
      user_name: 'Alice Smith',
      job_title: 'Software Engineer',
      query: 'What is the capital of France?',
      ai_response: 'Paris is the capital of France.',
      citations: 'Wikipedia',
      feedback_type: 'Positive',
      feedback: 'Very helpful and accurate.',
      login_session_id: 'LSID001',
      date_and_time: '2024-07-20 10:00:00',
    },
    {
      chat_session_id: 'log_002',
      user_id: 'U002',
      user_name: 'Bob Johnson',
      job_title: 'Data Analyst',
      query: 'How to make a React component?',
      ai_response: 'You can create a function or class component.',
      citations: 'React Docs',
      feedback_type: 'Neutral',
      feedback: 'Good, but could be more detailed.',
      login_session_id: 'LSID002',
      date_and_time: '2024-07-20 10:15:00',
    },
    {
      chat_session_id: 'log_003',
      user_id: 'U001',
      user_name: 'Alice Smith',
      job_title: 'Software Engineer',
      query: 'What is photosynthesis?',
      ai_response: 'Process used by plants...',
      citations: 'Biology Textbook',
      feedback_type: 'Negative',
      feedback: 'Response was too short and incomplete.',
      login_session_id: 'LSID001',
      date_and_time: '2024-07-20 10:30:00',
    },
    {
      chat_session_id: 'log_004',
      user_id: 'U003',
      user_name: 'Charlie Brown',
      job_title: 'Product Manager',
      query: 'Latest news on AI?',
      ai_response: 'Recent advancements include...',
      citations: 'TechCrunch',
      feedback_type: 'Positive',
      feedback: 'Timely and relevant information.',
      login_session_id: 'LSID003',
      date_and_time: '2024-07-21 09:00:00',
    },
    {
      chat_session_id: 'log_005',
      user_id: 'U002',
      user_name: 'Bob Johnson',
      job_title: 'Data Analyst',
      query: 'Explain quantum computing.',
      ai_response: 'Quantum computing is a new type...',
      citations: 'IBM Research',
      feedback_type: 'Neutral',
      feedback: 'Complex topic, response was decent.',
      login_session_id: 'LSID002',
      date_and_time: '2024-07-21 09:30:00',
    },
    {
      chat_session_id: 'log_006',
      user_id: 'U001',
      user_name: 'Alice Smith',
      job_title: 'Software Engineer',
      query: 'Suggest a good sci-fi book.',
      ai_response: 'Project Hail Mary by Andy Weir.',
      citations: 'Goodreads',
      feedback_type: 'Positive',
      feedback: 'Great recommendation, loved the book!',
      login_session_id: 'LSID001',
      date_and_time: '2024-07-21 11:00:00',
    },
    {
      chat_session_id: 'log_007',
      user_id: 'U004',
      user_name: 'Diana Prince',
      job_title: 'DevOps Engineer',
      query: 'How to configure Nginx?',
      ai_response: 'Nginx configuration involves...',
      citations: 'Nginx Docs',
      feedback_type: 'Negative',
      feedback: 'Instructions were a bit unclear.',
      login_session_id: 'LSID004',
      date_and_time: '2024-07-22 13:00:00',
    },
    {
      chat_session_id: 'log_008',
      user_id: 'U003',
      user_name: 'Charlie Brown',
      job_title: 'Product Manager',
      query: 'Best practices for REST API design?',
      ai_response: 'Use meaningful URLs, HTTP methods...',
      citations: 'API Guide',
      feedback_type: 'Positive',
      feedback: 'Very informative.',
      login_session_id: 'LSID003',
      date_and_time: '2024-07-22 14:00:00',
    },
    {
      chat_session_id: 'log_009',
      user_id: 'U005',
      user_name: 'Eve Adams',
      job_title: 'Business Analyst',
      query: 'What is blockchain technology?',
      ai_response: 'Blockchain is a decentralized ledger...',
      citations: 'Investopedia',
      feedback_type: 'Positive',
      feedback: 'Clear explanation.',
      login_session_id: 'LSID005',
      date_and_time: '2024-07-22 15:00:00',
    },
    {
      chat_session_id: 'log_010',
      user_id: 'U001',
      user_name: 'Alice Smith',
      job_title: 'Software Engineer',
      query: 'How to install Python?',
      ai_response: 'Download from python.org and run installer.',
      citations: 'Python Docs',
      feedback_type: 'Positive',
      feedback: 'Simple and direct instructions.',
      login_session_id: 'LSID001',
      date_and_time: '2024-07-23 09:00:00',
    },
    { chat_session_id: 'log_011', user_id: 'U002', user_name: 'Bob Johnson', job_title: 'Data Analyst', query: 'CSS flexbox tutorial', ai_response: 'Flexbox is a one-dimensional layout method...', citations: 'MDN Web Docs', feedback_type: 'Neutral', feedback: 'Good overview.', login_session_id: 'LSID002', date_and_time: '2024-07-23 10:00:00' },
    { chat_session_id: 'log_012', user_id: 'U003', user_name: 'Charlie Brown', job_title: 'Product Manager', query: 'Meaning of existentialism', ai_response: 'A philosophical theory or approach...', citations: 'Stanford Encyclopedia', feedback_type: 'Negative', feedback: 'Did not fully answer the complexity of the question.', login_session_id: 'LSID003', date_and_time: '2024-07-23 11:00:00' },
    { chat_session_id: 'log_013', user_id: 'U004', user_name: 'Diana Prince', job_title: 'DevOps Engineer', query: 'Best practices for unit testing', ai_response: 'Write independent tests, use mocks...', citations: 'Martin Fowler', feedback_type: 'Positive', feedback: 'Concise and helpful tips.', login_session_id: 'LSID004', date_and_time: '2024-07-23 12:00:00' },
    { chat_session_id: 'log_014', user_id: 'U005', user_name: 'Eve Adams', job_title: 'Business Analyst', query: 'What is machine learning?', ai_response: 'Machine learning is an application...', citations: 'Wikipedia', feedback_type: 'Positive', feedback: 'Clear explanation for beginners.', login_session_id: 'LSID005', date_and_time: '2024-07-24 09:00:00' },
    { chat_session_id: 'log_015', user_id: 'U001', user_name: 'Alice Smith', job_title: 'Software Engineer', query: 'How to debug React apps?', ai_response: 'Use React DevTools, browser console...', citations: 'React Docs', feedback_type: 'Positive', feedback: 'Useful debugging strategies.', login_session_id: 'LSID001', date_and_time: '2024-07-24 10:00:00' },
    { chat_session_id: 'log_016', user_id: 'U002', user_name: 'Bob Johnson', job_title: 'Data Analyst', query: 'Explain Big O notation.', ai_response: 'Big O notation describes the performance...', citations: 'GeeksforGeeks', feedback_type: 'Neutral', feedback: 'Decent explanation, but could be simpler.', login_session_id: 'LSID002', date_and_time: '2024-07-24 11:00:00' },
    { chat_session_id: 'log_017', user_id: 'U003', user_name: 'Charlie Brown', job_title: 'Product Manager', query: 'What is cloud computing?', ai_response: 'Cloud computing is the on-demand...', citations: 'AWS', feedback_type: 'Positive', feedback: 'Well-explained concepts.', login_session_id: 'LSID003', date_and_time: '2024-07-24 12:00:00' },
    { chat_session_id: 'log_018', user_id: 'U004', user_name: 'Diana Prince', job_title: 'DevOps Engineer', query: 'How to write clean code?', ai_response: 'Follow SOLID principles, meaningful names...', citations: 'Robert C. Martin', feedback_type: 'Positive', feedback: 'Essential tips for good coding.', login_session_id: 'LSID004', date_and_time: '2024-07-25 09:00:00' },
    { chat_session_id: 'log_019', user_id: 'U005', user_name: 'Eve Adams', job_title: 'Business Analyst', query: 'Introduction to data science.', ai_response: 'Data science is an interdisciplinary field...', citations: 'Coursera', feedback_type: 'Positive', feedback: 'Good starting point.', login_session_id: 'LSID005', date_and_time: '2024-07-25 10:00:00' },
    { chat_session_id: 'log_020', user_id: 'U001', user_name: 'Alice Smith', job_title: 'Software Engineer', query: 'What is a closure in JavaScript?', ai_response: 'A closure is the combination of a function...', citations: 'MDN Web Docs', feedback_type: 'Positive', feedback: 'Clear and concise definition.', login_session_id: 'LSID001', date_and_time: '2024-07-25 11:00:00' },
  ];

  // --- State Management ---
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [byFilter, setByFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- Commented out: Tab state (can be uncommented if feedback tab is needed later) ---
  // const [activeTab, setActiveTab] = useState('Log');

  // --- Column Definitions ---
  const logColumns = [
    { key: 'user_name', label: 'User Name' },
    { key: 'job_title', label: 'Job Title' },
    { key: 'date_and_time', label: 'Date & Time' },
    { key: 'query', label: 'Query' },
    { key: 'ai_response', label: 'AI Response' },
    { key: 'citations', label: 'Citations' },
    { key: 'feedback_type', label: 'Feedback Type' },
    { key: 'feedback', label: 'Feedback' },
  ];

  // --- Filtering Logic ---
  const filteredData = useMemo(() => {
    return loggingData.filter(item => {
      const matchesSearchTerm = searchTerm === '' ||
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );

      const itemDate = new Date(item.date_and_time);
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(toDate) : null;

      if (to) to.setHours(23, 59, 59, 999);

      const matchesDateRange = (!from || itemDate >= from) && (!to || itemDate <= to);

      const matchesByFilter = byFilter === '' ||
        (item.user_name && String(item.user_name).toLowerCase().includes(byFilter.toLowerCase())) ||
        (item.user_id && String(item.user_id).toLowerCase().includes(byFilter.toLowerCase())) ||
        (item.job_title && String(item.job_title).toLowerCase().includes(byFilter.toLowerCase()));

      return matchesSearchTerm && matchesDateRange && matchesByFilter;
    });
  }, [searchTerm, fromDate, toDate, byFilter, loggingData]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentTableData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [currentPage, filteredData, itemsPerPage]);

  const handlePageChange = (direction) => {
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    } else if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // --- Export Function (API Ready) ---
  // TODO: Implement export to CSV/Excel functionality
  const handleExport = () => {
    console.log('Exporting data:', filteredData);
    alert('Export functionality would be implemented here!');
    // API Ready: Can send filteredData to backend for CSV/Excel generation
    // const exportData = async () => {
    //   const response = await fetch('/api/export', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(filteredData)
    //   });
    //   const blob = await response.blob();
    //   // Download file logic
    // }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />

      <div className="flex-grow p-6">
        <div className="w-[95%] max-w-[1400px] mx-auto bg-white shadow-md rounded-lg p-6">
          <h1 className="text-xl font-bold text-[#0f85a3] mb-6">Report Generator</h1>

          {/* Commented out: Tab Buttons (can be uncommented if needed) */}
          {/* <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-2">
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'Log'
                  ? 'bg-[#174a7e] text-white'
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 hover:border-[#174a7e]/50'
                  }`}
                onClick={() => { setActiveTab('Log'); setCurrentPage(1); }}
              >
                Log
              </button>
              <button
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'Feedback'
                  ? 'bg-[#174a7e] text-white'
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 hover:border-[#174a7e]/50'
                  }`}
                onClick={() => { setActiveTab('Feedback'); setCurrentPage(1); }}
              >
                Feedback
              </button>
            </div>
          </div> */}

          {/* Export Button */}
          <div className="flex justify-end mb-6">
            <button
              className="px-6 py-2 bg-[#174a7e] text-white rounded-md shadow-sm hover:bg-[#082340] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#174a7e]"
              onClick={handleExport}
            >
              Export
            </button>
          </div>

          {/* Control Panel: Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 items-end">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search</label>
              <input
                type="text"
                id="search"
                placeholder="Search all columns..."
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#174a7e] focus:border-[#174a7e]"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div>
              <label htmlFor="byFilter" className="block text-sm font-medium text-gray-700">Filter By (User/Job Title)</label>
              <input
                type="text"
                id="byFilter"
                placeholder="Filter by user or job..."
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#174a7e] focus:border-[#174a7e]"
                value={byFilter}
                onChange={(e) => { setByFilter(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div>
              <label htmlFor="fromDate" className="block text-sm font-medium text-gray-700">From Date</label>
              <input
                type="date"
                id="fromDate"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#174a7e] focus:border-[#174a7e]"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div>
              <label htmlFor="toDate" className="block text-sm font-medium text-gray-700">To Date</label>
              <input
                type="date"
                id="toDate"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#174a7e] focus:border-[#174a7e]"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>

          {/* Table Display */}
          <div className="overflow-x-auto shadow-md rounded-lg mb-6 border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {logColumns.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {currentTableData.length > 0 ? (
                  currentTableData.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {logColumns.map((col) => (
                        <td key={`${row.chat_session_id}-${col.key}`} className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={logColumns.length} className="px-4 py-2 text-center text-sm text-gray-500">
                      No data found for the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-700">
              Total Results: <span className="font-semibold">{filteredData.length}</span> |
              Current Result: <span className="font-semibold">
                {filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
              </span> - <span className="font-semibold">
                {Math.min(currentPage * itemsPerPage, filteredData.length)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                className="px-4 py-2 bg-[#174a7e] text-white rounded-md shadow-sm hover:bg-[#082340] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handlePageChange('prev')}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <span className="text-sm font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="px-4 py-2 bg-[#174a7e] text-white rounded-md shadow-sm hover:bg-[#082340] disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handlePageChange('next')}
                disabled={currentPage === totalPages || filteredData.length === 0}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;