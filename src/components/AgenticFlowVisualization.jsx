import { useState } from 'react';
import {
  ChevronDown, ChevronRight, Search, CheckCircle2, XCircle,
  RefreshCw, Database, Brain, MessageSquare, Eye, EyeOff,
  Zap, FileText, ArrowDown, Info
} from 'lucide-react';

// ════════════════════════════════════════════════════════════════════════════
// Professional Agentic Flow Visualization - Light Theme, Enterprise Design
// ════════════════════════════════════════════════════════════════════════════

const AgenticFlowVisualization = ({ adminMetadata }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState({});
  const [expandedResults, setExpandedResults] = useState({});

  if (!adminMetadata) return null;

  const {
    thought_process = [],
    search_history = [],
    decisions = [],
    attempts = 0,
    document_count = 0,
  } = adminMetadata;

  // Group by attempt
  const stepsByAttempt = {};
  thought_process.forEach((step) => {
    const attemptMatch = step.details?.attempt?.match(/(\d+) out of/);
    const attemptNum = attemptMatch ? parseInt(attemptMatch[1]) : 1;
    if (!stepsByAttempt[attemptNum]) stepsByAttempt[attemptNum] = [];
    stepsByAttempt[attemptNum].push(step);
  });

  const attemptKeys = Object.keys(stepsByAttempt).sort((a, b) => a - b);

  const toggleStep = (key) => {
    setExpandedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleResult = (key) => {
    setExpandedResults((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="my-4">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm text-sm font-semibold"
      >
        {isVisible ? <EyeOff size={15} /> : <Eye size={15} />}
        <span>{isVisible ? 'Hide' : 'Show'} Reasoning Process</span>
      </button>

      {isVisible && (
        <div className="mt-4 border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
                  <Brain size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">AI Reasoning Process</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {attempts} iteration{attempts !== 1 ? 's' : ''} • Progressive refinement
                  </p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="flex items-center gap-3">
                <MetricBadge icon={Database} label="Documents" value={document_count} color="blue" />
                <MetricBadge icon={Zap} label="Attempts" value={attempts} color="amber" />
                <MetricBadge 
                  icon={decisions[decisions.length - 1] === 'finalize' ? CheckCircle2 : RefreshCw}
                  label="Status" 
                  value={decisions[decisions.length - 1] || 'pending'} 
                  color={decisions[decisions.length - 1] === 'finalize' ? 'green' : 'orange'}
                />
              </div>
            </div>
          </div>

          {/* Progressive Flow */}
          <div className="p-6 space-y-6">
            {attemptKeys.map((attemptNum, attemptIdx) => {
              const steps = stepsByAttempt[attemptNum];
              const retrieveStep = steps.find((s) => s.step === 'retrieve');
              const reviewStep = steps.find((s) => s.step === 'review');
              const decision = decisions[attemptIdx];
              const isLastAttempt = attemptIdx === attemptKeys.length - 1;

              // Progressive narrowing
              const funnelWidth = Math.max(100 - (attemptIdx * 15), 50);

              return (
                <div key={attemptNum} className="relative">

                  {/* Attempt Header */}
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                        <ArrowDown size={14} className="text-blue-600" />
                        <span className="text-sm font-bold text-gray-900">Iteration {attemptNum}</span>
                      </div>
                      <DecisionBadge decision={decision} />
                    </div>
                    
                    {/* Valid/Invalid Counts */}
                    {reviewStep?.details?.valid_count !== undefined && (
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-green-700">
                          <CheckCircle2 size={14} />
                          <strong>{reviewStep.details.valid_count}</strong> valid
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle size={14} />
                          <strong>{reviewStep.details.invalid_count || 0}</strong> invalid
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Funnel */}
                  <div
                    className="mx-auto transition-all duration-500"
                    style={{ width: `${funnelWidth}%` }}
                  >
                    <div className="space-y-3">
                      {retrieveStep && (
                        <StageCard
                          stage="retrieve"
                          step={retrieveStep}
                          stepKey={`attempt-${attemptNum}-retrieve`}
                          expanded={expandedSteps[`attempt-${attemptNum}-retrieve`]}
                          onToggle={() => toggleStep(`attempt-${attemptNum}-retrieve`)}
                          expandedResults={expandedResults}
                          onToggleResult={toggleResult}
                        />
                      )}
                      {reviewStep && (
                        <StageCard
                          stage="review"
                          step={reviewStep}
                          stepKey={`attempt-${attemptNum}-review`}
                          expanded={expandedSteps[`attempt-${attemptNum}-review`]}
                          onToggle={() => toggleStep(`attempt-${attemptNum}-review`)}
                          expandedResults={expandedResults}
                          onToggleResult={toggleResult}
                        />
                      )}
                    </div>
                  </div>

                  {/* Connector */}
                  {!isLastAttempt && (
                    <div className="flex flex-col items-center my-4">
                      <ChevronDown size={24} className="text-blue-500" />
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Refining</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Final Response */}
            {thought_process.find((s) => s.step === 'response') && (
              <div className="mx-auto" style={{ width: '40%' }}>
                <StageCard
                  stage="response"
                  step={thought_process.find((s) => s.step === 'response')}
                  stepKey="final-response"
                  expanded={expandedSteps['final-response']}
                  onToggle={() => toggleStep('final-response')}
                  expandedResults={expandedResults}
                  onToggleResult={toggleResult}
                />
              </div>
            )}
          </div>

          {/* Search History */}
          {search_history.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Info size={14} className="text-gray-600" />
                <h4 className="text-sm font-bold text-gray-900">Query Evolution</h4>
              </div>
              <div className="space-y-2">
                {search_history.map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded border border-gray-200 text-xs">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-bold shrink-0">Q{idx + 1}</span>
                    <p className="text-gray-700 leading-relaxed flex-1">{entry.query}</p>
                    <span className="text-gray-500 shrink-0">{entry.results_count} hits</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Stage Card
// ════════════════════════════════════════════════════════════════════════════
const StageCard = ({ stage, step, stepKey, expanded, onToggle, expandedResults, onToggleResult }) => {
  const config = {
    retrieve: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', icon: Search },
    review: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', icon: Brain },
    response: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', icon: MessageSquare },
  }[stage] || { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-700', icon: FileText };

  const Icon = config.icon;

  return (
    <div className={`border-2 ${config.border} rounded-lg overflow-hidden ${config.bg}`}>
      
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 ${config.bg} rounded-md border ${config.border}`}>
            <Icon size={16} className={config.text} />
          </div>
          <span className={`text-xs font-bold uppercase tracking-wider ${config.text}`}>
            {stage}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {step.details?.results_summary && (
            <span className="text-xs text-gray-600 font-semibold">
              {step.details.results_summary.length} results
            </span>
          )}
          {expanded ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-200 bg-white">

          {/* Query */}
          {step.details?.generated_search_query && (
            <DetailBlock 
              icon={Search} 
              label="Generated Query" 
              content={step.details.generated_search_query} 
            />
          )}

          {/* Filters */}
          {step.details?.applied_filters && (
            <div>
              <Label icon={Database} text="Applied Filters" />
              <div className="flex flex-wrap gap-2 mt-2">
                {step.details.applied_filters.opco_values?.map((v, i) => (
                  <Pill key={`opco-${i}`} label="OPCO" value={v} color="blue" />
                ))}
                {step.details.applied_filters.persona_values?.map((v, i) => (
                  <Pill key={`persona-${i}`} label="Persona" value={v} color="purple" />
                ))}
              </div>
            </div>
          )}

          {/* Reasoning */}
          {step.details?.review_thought_process && (
            <DetailBlock 
              icon={Brain} 
              label="AI Reasoning" 
              content={step.details.review_thought_process} 
            />
          )}

          {/* Results */}
          {step.details?.results_summary && step.details.results_summary.length > 0 && (
            <div>
              <button
                onClick={() => onToggleResult(stepKey)}
                className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                {expandedResults[stepKey] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                View {step.details.results_summary.length} Documents
              </button>
              {expandedResults[stepKey] && (
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  {step.details.results_summary.map((result, idx) => (
                    <div key={idx} className="p-2 bg-gray-50 rounded border border-gray-200">
                      <p className="text-[11px] text-gray-800 font-medium truncate" title={result.title}>
                        {result.title || result.content_id}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Final Answer */}
          {step.details?.final_answer && (
            <DetailBlock 
              icon={MessageSquare} 
              label="Final Answer" 
              content={step.details.final_answer} 
            />
          )}
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Micro Components
// ════════════════════════════════════════════════════════════════════════════
const MetricBadge = ({ icon: Icon, label, value, color }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
  };
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${colors[color]}`}>
      <Icon size={13} />
      <span className="text-xs font-bold">{typeof value === 'string' ? value.toUpperCase() : value}</span>
    </div>
  );
};

const DecisionBadge = ({ decision }) => {
  const config = {
    retry: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: RefreshCw },
    finalize: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle2 },
  }[decision] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: Info };

  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${config.border} ${config.bg}`}>
      <Icon size={12} className={config.text} />
      <span className={`text-xs font-bold uppercase ${config.text}`}>{decision}</span>
    </div>
  );
};

const Label = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-1.5 mb-2">
    <Icon size={12} className="text-gray-500" />
    <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">{text}</p>
  </div>
);

const DetailBlock = ({ icon: Icon, label, content }) => (
  <div>
    <Label icon={Icon} text={label} />
    <p className="text-xs text-gray-800 bg-gray-50 p-3 rounded border border-gray-200 leading-relaxed">
      {content}
    </p>
  </div>
);

const Pill = ({ label, value, color }) => {
  const colors = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
  };
  return (
    <span className={`px-2 py-1 rounded-full border text-[10px] font-semibold ${colors[color]}`}>
      {label}: {value}
    </span>
  );
};

export default AgenticFlowVisualization;