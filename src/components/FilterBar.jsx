import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ChevronDown, X } from 'lucide-react';
import { setFilters } from '../app/features/chat/chatSlice';

const OPCO_OPTIONS = [
  { key: "actalent",                  text: "Actalent" },
  { key: "actalentservices",          text: "Actalent Services" },
  { key: "aerotek",                   text: "Aerotek" },
  { key: "aerotekservices",           text: "Aerotek Services" },
  { key: "astoncarter",               text: "Aston Carter" },
  { key: "teksystems",                text: "TEKsystems" },
  { key: "teksystemsglobalservices",  text: "TEKsystems Global Services" },
  { key: "allegiscorporateservices",  text: "Allegis Corporate Services" },
];

const PERSONA_OPTIONS = [
  { key: "fsg",                    text: "FSG" },
  { key: "cls",                    text: "CLS" },
  { key: "salesandrecruiting",     text: "Sales and Recruiting" },
  { key: "deliveryandtaservices",  text: "Delivery and TA Services" },
  { key: "frontoffice",            text: "Front Office" },
  { key: "backoffice",             text: "Back Office" },
  { key: "corporateservices",      text: "Corporate Services" },
  { key: "talent",                 text: "Talent" },
];

// ── Reusable single-select Dropup ────────────────────────────────────────────
const Dropup = ({
  label, required, options, selectedKey,
  onSelect, onClear, isOpen, setIsOpen, dropupRef,
}) => {
  const selectedOption = options.find((o) => o.key === selectedKey) ?? null;

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0" ref={dropupRef}>
      {/* Inline label */}
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide shrink-0 select-none">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>

      {/* Trigger button */}
      <div className="relative flex-1 min-w-0 max-w-[240px]">
        <button
          type="button"
          onClick={() => setIsOpen((p) => !p)}
          className={`
            w-full flex items-center justify-between gap-1.5
            px-2.5 py-1.5 text-xs rounded-md border
            transition-all duration-150 leading-none
            ${isOpen
              ? 'border-[#174a7e] ring-1 ring-[#174a7e]/20 bg-white'
              : 'border-gray-300 bg-white hover:border-[#174a7e]'}
            ${!selectedOption ? 'text-gray-400' : 'text-gray-800'}
          `}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.text : 'Select item'}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            {/* Clear button — only for optional fields with a selection */}
            {!required && selectedOption && (
              <span
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onClear(e)}
                onClick={(e) => { e.stopPropagation(); onClear(e); }}
                className="p-0.5 rounded hover:bg-gray-100 transition-colors"
              >
                <X size={10} className="text-gray-400 hover:text-gray-600" />
              </span>
            )}
            <ChevronDown
              size={12}
              className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {/* ── Menu — opens UPWARD ── */}
        {isOpen && (
          <div className="
            absolute bottom-full left-0 mb-1
            bg-white border border-gray-200 rounded-md shadow-xl
            z-[100] overflow-hidden min-w-[180px] w-full
          ">
            <div className="max-h-44 overflow-y-auto overscroll-contain">
              {options.map((opt) => {
                const isSel = selectedKey === opt.key;
                return (
                  <div
                    key={opt.key}
                    onClick={() => onSelect(opt.key)}
                    className={`
                      flex items-center gap-2 px-3 py-2 cursor-pointer text-xs transition-colors
                      ${isSel
                        ? 'bg-blue-50 text-[#174a7e] font-medium'
                        : 'text-gray-700 hover:bg-gray-50'}
                    `}
                  >
                    {/* Simple dot indicator for selected item */}
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                      isSel ? 'bg-[#174a7e]' : 'bg-transparent'
                    }`} />
                    <span>{opt.text}</span>
                  </div>
                );
              })}
            </div>
            <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50">
              <p className="text-[9px] text-gray-400 leading-tight">
                {required ? 'Required — select one to enable chat' : 'Optional — leave empty for all'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── FilterBar ────────────────────────────────────────────────────────────────
const FilterBar = () => {
  const dispatch       = useDispatch();
  const currentFilters = useSelector((state) => state.chat.filters);

  const [isOpcoOpen,    setIsOpcoOpen]    = useState(false);
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);
  const opcoRef    = useRef(null);
  const personaRef = useRef(null);

  // Close dropups when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (opcoRef.current    && !opcoRef.current.contains(e.target))    setIsOpcoOpen(false);
      if (personaRef.current && !personaRef.current.contains(e.target)) setIsPersonaOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ✅ Single-select: store as a single string key (or '' for none)
  const selectedOpco    = currentFilters.opco_values?.[0]    ?? '';
  const selectedPersona = currentFilters.persona_values?.[0] ?? '';

  const handleOpcoSelect = (key) => {
    // Clicking the already-selected item deselects — but OPCO is required so prevent that
    // (user must pick a different one; they can't deselect entirely)
    dispatch(setFilters({ ...currentFilters, opco_values: [key] }));
    setIsOpcoOpen(false);
  };

  const handlePersonaSelect = (key) => {
    // Clicking same item again deselects it (it's optional)
    const next = selectedPersona === key ? [] : [key];
    dispatch(setFilters({ ...currentFilters, persona_values: next }));
    setIsPersonaOpen(false);
  };

  const clearPersona = (e) => {
    e.stopPropagation();
    dispatch(setFilters({ ...currentFilters, persona_values: [] }));
  };

  return (
    <div className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm mb-1.5">
      <div className="flex items-center gap-3">
        <Dropup
          label="OPCO"
          required
          options={OPCO_OPTIONS}
          selectedKey={selectedOpco}
          onSelect={handleOpcoSelect}
          onClear={() => {}} // OPCO can't be cleared once set
          isOpen={isOpcoOpen}
          setIsOpen={setIsOpcoOpen}
          dropupRef={opcoRef}
        />
        <div className="w-px h-5 bg-gray-200 shrink-0" />
        <Dropup
          label="Persona"
          required={false}
          options={PERSONA_OPTIONS}
          selectedKey={selectedPersona}
          onSelect={handlePersonaSelect}
          onClear={clearPersona}
          isOpen={isPersonaOpen}
          setIsOpen={setIsPersonaOpen}
          dropupRef={personaRef}
        />
      </div>
    </div>
  );
};

export default FilterBar;

// ✅ Export a hook so ChatForm can consume the OPCO gate
export const useIsOpcoSelected = () => {
  const currentFilters = useSelector((state) => state.chat.filters);
  return !!(currentFilters.opco_values?.[0]);
};
