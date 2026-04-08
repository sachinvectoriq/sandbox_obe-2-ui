import { useState } from 'react';
import { Code, Copy, Check } from 'lucide-react';

// ════════════════════════════════════════════════════════════════════════════
// Thought Process JSON Viewer Component - FIXED LAYOUT
// ════════════════════════════════════════════════════════════════════════════

const ThoughtProcessJSON = ({ thoughtProcess }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedJSON, setCopiedJSON] = useState(false);

  if (!thoughtProcess || thoughtProcess.length === 0) return null;

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(thoughtProcess, null, 2));
    setCopiedJSON(true);
    setTimeout(() => setCopiedJSON(false), 2000);
  };

  // Format JSON with syntax highlighting
  const formatJSON = (obj) => {
    const jsonString = JSON.stringify(obj, null, 2);
    return jsonString
      .replace(/(".*?"):/g, '<span class="text-purple-600 font-semibold">$1</span>:')
      .replace(/: (".*?")/g, ': <span class="text-green-600">$1</span>')
      .replace(/: (true|false)/g, ': <span class="text-blue-600">$1</span>')
      .replace(/: (null)/g, ': <span class="text-gray-500">$1</span>')
      .replace(/: (\d+)/g, ': <span class="text-orange-600">$1</span>');
  };

  return (
    <div className='mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-md border border-blue-200 shadow-sm'>
      <div className='flex items-center justify-between mb-2'>
        <div className='flex items-center gap-2'>
          <div className='p-1.5 bg-blue-600 rounded'>
            <Code size={14} className='text-white' />
          </div>
          <h3 className='text-sm font-bold text-blue-900'>
            Thought Process JSON
          </h3>
          <span className='text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full'>
            {thoughtProcess.length} steps
          </span>
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={handleCopyJSON}
            className='flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 px-2.5 py-1.5 rounded bg-white border border-blue-300 hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer font-medium'
          >
            {copiedJSON ? (
              <>
                <Check size={12} />
                Copied
              </>
            ) : (
              <>
                <Copy size={12} />
                Copy
              </>
            )}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className='text-xs text-blue-700 hover:text-blue-900 font-semibold cursor-pointer'
          >
            {isExpanded ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className='mt-3 animate-fadeIn'>
          {/* ✅ FIX: Added proper overflow containment and word breaking */}
          <div className='max-h-[500px] overflow-auto rounded border border-blue-200 bg-white shadow-inner'>
            <pre className='text-xs p-4 font-mono leading-relaxed whitespace-pre-wrap break-words overflow-x-auto'>
              <code 
                className='text-gray-800 block'
                style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: formatJSON(thoughtProcess) }}
              />
            </pre>
          </div>
          <p className='text-[10px] text-blue-600 mt-2 text-center'>
            Full AI reasoning trace • Use for debugging and analysis
          </p>
        </div>
      )}
    </div>
  );
};

export default ThoughtProcessJSON;
