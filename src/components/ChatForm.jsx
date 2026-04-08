import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Eraser, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import {
  sendQuestionToAPI,
  setInput,
  clearChat,
  resetSessionId,
  resetUserId,
} from '../app/features/chat/chatSlice';
import { useNavigate, useLocation } from 'react-router-dom';
import FilterBar from './FilterBar';

const ChatForm = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();

  const { input, isResponding } = useSelector((state) => state.chat);

  // ✅ ADDED: Gate — chat is disabled until user picks an OPCO
  const isOpcoSelected = useSelector(
    (state) => !!(state.chat.filters?.opco_values?.[0])
  );

  const [text, setText]               = useState(input);
  const [attachedFile, setAttachedFile] = useState(null);
  const textareaRef = useRef(null);

  // Focus on mount
  useEffect(() => { textareaRef.current?.focus(); }, []);

  // File inserted from BlobFileManager
  useEffect(() => {
    if (location.state?.insertedFile) {
      setAttachedFile(location.state.insertedFile);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Auto-resize textarea (max 120px)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const messageToSend = text.trim();
    // ✅ ADDED: isOpcoSelected guard
    if ((!messageToSend && !attachedFile) || isResponding || !isOpcoSelected) return;

    const fullMessage = attachedFile
      ? `[File: ${attachedFile}] ${messageToSend}`
      : messageToSend;

    dispatch(sendQuestionToAPI(fullMessage));
    setText('');
    dispatch(setInput(''));
    setAttachedFile(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleClearChat = () => {
    dispatch(clearChat());
    dispatch(resetSessionId());
    dispatch(resetUserId());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  // ✅ UPDATED: canSend now also requires OPCO to be selected
  const canSend = isOpcoSelected && !isResponding && (text.trim().length > 0 || !!attachedFile);

  return (
    <div className="w-[95%] max-w-[968px] flex flex-col mb-6">

      {/* ── FilterBar — compact strip directly above input ── */}
      <FilterBar />

      {/* ✅ ADDED: Warning nudge shown when no OPCO selected */}
      {!isOpcoSelected && (
        <p className="text-xs text-amber-600 mb-1.5 px-1 flex items-center gap-1">
          <span>⚠️</span>
          <span>Please select an OPCO above to start chatting</span>
        </p>
      )}

      {/* ── Chat Input ────────────────────────────────────── */}
      <form
        id="chat_form"
        onSubmit={handleSubmit}
        className={`
          w-full
          border border-gray-300 border-b-4
          rounded-xl shadow-md
          px-3 py-2.5
          flex flex-col gap-2
          transition-colors
          ${isOpcoSelected
            ? 'border-b-[#174a7e] bg-white'
            : 'border-b-gray-300 bg-gray-50'}
        `}
      >
        {/* Attached-file chip */}
        {attachedFile && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 bg-blue-50 text-blue-800 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-200">
              <span>📎 {attachedFile}</span>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="text-blue-400 hover:text-blue-700 transition-colors"
                aria-label="Remove file"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-2">

          {/* Clear chat */}
          <button
            type="button"
            onClick={handleClearChat}
            title="Clear Chat"
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <Eraser size={15} />
          </button>

          {/* Textarea — ✅ UPDATED: disabled when no OPCO selected */}
          <textarea
            ref={textareaRef}
            name="text"
            id="text"
            rows={1}
            disabled={isResponding || !isOpcoSelected}
            placeholder={
              isResponding
                ? 'Please wait…'
                : !isOpcoSelected
                ? 'Select an OPCO above to start chatting…'
                : 'Type a new question'
            }
            value={text}
            onChange={(e) => { setText(e.target.value); dispatch(setInput(e.target.value)); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isResponding && isOpcoSelected) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            className={`
              flex-1 border-none outline-none resize-none
              text-sm leading-relaxed
              overflow-y-auto scroll-smooth
              py-1.5 px-1
              placeholder:text-gray-400
              transition-colors
              ${isResponding || !isOpcoSelected
                ? 'bg-transparent text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-800'}
            `}
          />

          {/* Send — ✅ already gated via canSend which now includes isOpcoSelected */}
          <button
            type="submit"
            disabled={!canSend}
            title={!isOpcoSelected ? 'Select an OPCO first' : 'Send'}
            className={`
              shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors
              ${canSend
                ? 'bg-[#174a7e] text-white hover:bg-[#0f3460] cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
            `}
          >
            {isResponding
              ? <Loader2 size={15} className="animate-spin" />
              : <Send size={15} />
            }
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatForm;