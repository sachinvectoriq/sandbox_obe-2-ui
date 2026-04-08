import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FileText, Sparkles, ThumbsUp, ThumbsDown, X } from 'lucide-react';
import {
  sendQuestionToAPI,
  submitFeedback, // ✅ FIXED: Now actually imported and used
} from '../app/features/chat/chatSlice';
import { motion } from 'motion/react';
import AgenticFlowVisualization from './AgenticFlowVisualization';
import ThoughtProcessJSON from './ThoughtProcessJSON';

const escapeHtml = (str) => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const formatMessageContent = (content, citationsMap) => {
  if (!content) return content;

  let formatted = content
    .replace(/JSON list of (used )?sources:?/gi, '')
    .trim();

  formatted = formatted.replace(/<([^>]+)>/g, (match, tagContent) => {
    if (
      tagContent.startsWith('custom-heading') ||
      tagContent.startsWith('/custom-heading') ||
      tagContent.startsWith('ul') ||
      tagContent.startsWith('/ul') ||
      tagContent.startsWith('li') ||
      tagContent.startsWith('/li') ||
      tagContent.startsWith('strong') ||
      tagContent.startsWith('/strong') ||
      tagContent.startsWith('a') ||
      tagContent.startsWith('/a') ||
      tagContent.startsWith('ol') ||
      tagContent.startsWith('/ol') ||
      tagContent.startsWith('br') ||
      tagContent.startsWith('/br')
    ) {
      return match;
    }
    return `&lt;${tagContent}&gt;`;
  });

  formatted = formatted.replace(
    /^#+\s*(.*)$/gm,
    '<custom-heading>$1</custom-heading>'
  );

  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  formatted = formatted.replace(
    /\[(.*?)\]\((.*?)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  formatted = formatted.replace(/\[(\d+)\]/g, (match, citationId) => {
    const citation = citationsMap.get(parseInt(citationId));
    if (citation) {
      return `<sup class="citation-ref" data-citation-id="${citationId}">${citationId}</sup>`;
    }
    return match;
  });

  let lines = formatted.split('\n');
  let processedLines = [];
  let listStack = [];

  const getIndentLevel = (text) => {
    const match = text.match(/^\s*/);
    return match ? match[0].length : 0;
  };

  const closeLists = (currentIndent) => {
    while (
      listStack.length > 0 &&
      listStack[listStack.length - 1].indent >= currentIndent
    ) {
      const lastList = listStack.pop();
      processedLines.push(`</${lastList.type}>`);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let trimmedLine = line.trim();
    let currentIndent = getIndentLevel(line);

    if (trimmedLine === '') {
      if (listStack.length === 0) {
        processedLines.push('');
      }
      continue;
    }

    const orderedListMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/);
    const unorderedListMatch = trimmedLine.match(/^[-*]\s+(.*)$/);

    const isOrderedListItem = !!orderedListMatch;
    const isUnorderedListItem = !!unorderedListMatch;

    if (isOrderedListItem || isUnorderedListItem) {
      while (listStack.length > 0) {
        const lastList = listStack[listStack.length - 1];
        if (currentIndent > lastList.indent) {
          break;
        } else if (currentIndent < lastList.indent) {
          processedLines.push(`</${lastList.type}>`);
          listStack.pop();
        } else if (currentIndent === lastList.indent) {
          if (
            (isOrderedListItem && lastList.type === 'ul') ||
            (isUnorderedListItem && lastList.type === 'ol')
          ) {
            processedLines.push(`</${lastList.type}>`);
            listStack.pop();
          } else {
            break;
          }
        }
      }

      if (
        listStack.length === 0 ||
        currentIndent > listStack[listStack.length - 1].indent ||
        (currentIndent === listStack[listStack.length - 1].indent &&
          ((isOrderedListItem &&
            listStack[listStack.length - 1].type === 'ul') ||
            (isUnorderedListItem &&
              listStack[listStack.length - 1].type === 'ol')))
      ) {
        const listType = isOrderedListItem ? 'ol' : 'ul';
        const listClass =
          listType === 'ol'
            ? 'list-decimal list-outside pl-6 my-2 space-y-1'
            : 'list-disc list-outside pl-6 my-2 space-y-1';
        processedLines.push(
          `<${listType} class="${listClass}" style="list-style-type: ${
            listType === 'ol' ? 'decimal' : 'disc'
          };">`
        );
        listStack.push({ type: listType, indent: currentIndent });
      }

      let listItemContent;
      if (isOrderedListItem) {
        listItemContent = orderedListMatch[2];
      } else {
        listItemContent = unorderedListMatch[1];
      }

      processedLines.push(
        `<li class="text-base leading-6 text-gray-800">${listItemContent}</li>`
      );
    } else {
      closeLists(currentIndent);

      if (
        trimmedLine.includes('<strong>') &&
        !trimmedLine.includes('<custom-heading>')
      ) {
        processedLines.push(
          `<p class="text-base leading-7 text-gray-800 my-2">${trimmedLine}</p>`
        );
      } else if (trimmedLine !== '') {
        processedLines.push(trimmedLine);
      }
    }
  }

  closeLists(-1);

  formatted = processedLines.join('\n');

  formatted = formatted.replace(
    /<custom-heading>(.*?)<\/custom-heading>/g,
    '<p class="font-semibold text-lg leading-7 text-gray-900 mt-4 mb-2">$1</p>'
  );

  const placeholderMap = new Map();
  let placeholderCounter = 0;

  formatted = formatted.replace(/<[^>]*>/g, (match) => {
    const placeholder = `__HTML_PLACEHOLDER_${placeholderCounter++}__`;
    placeholderMap.set(placeholder, match);
    return placeholder;
  });

  formatted = formatted
    .split(/\n\s*\n/)
    .map((block) => {
      block = block.trim();
      if (block === '') return '';

      const startsWithPlaceholder = block.match(/^__HTML_PLACEHOLDER_\d+__/);
      if (
        startsWithPlaceholder &&
        placeholderMap.has(startsWithPlaceholder[0])
      ) {
        return block;
      }

      block = block.replace(/\n/g, '<br/>');
      return `<p class="text-base leading-7 text-gray-800 my-2">${block}</p>`;
    })
    .join('');

  placeholderMap.forEach((value, key) => {
    formatted = formatted.replace(key, value);
  });

  return formatted;
};

const ChatContent = ({ onViewPdf }) => {
  const {
    messages,
    isResponding,
    error,
    pendingMessageId,
    followUps,
    feedbackStatus,
    previewDocURL,
  } = useSelector((state) => state.chat);
  
  const authState = useSelector((state) => state.auth);
// ✅ NEW (FIXED):
const isAdmin = authState.user?.group === 'admin';

  const [expandedCitations, setExpandedCitations] = useState({});
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [currentFeedbackMessage, setCurrentFeedbackMessage] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackError, setFeedbackError] = useState(null);
  const [expandedAdminMetadata, setExpandedAdminMetadata] = useState({});
  
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const isUserAtBottomRef = useRef(true);
  const dispatch = useDispatch();

  useEffect(() => {
    if (isUserAtBottomRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
      isUserAtBottomRef.current = atBottom;
    };

    const el = containerRef.current;
    if (el) el.addEventListener('scroll', handleScroll);
    return () => el?.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCopy = (text, messageId) => {
    const cleanedText = text
      .replace(/<[^>]*>/g, '')
      .replace(/JSON list of used sources:/g, '')
      .replace(/^\d+\.\s*/gm, '')
      .replace(/^- /, '')
      .trim();

    navigator.clipboard.writeText(cleanedText).then(() => {
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    });
  };

  const toggleCitation = (messageId, citationId) => {
    setExpandedCitations((prev) => ({
      ...prev,
      [`${messageId}-${citationId}`]: !prev[`${messageId}-${citationId}`],
    }));
  };

  const toggleAdminMetadata = (messageId) => {
    setExpandedAdminMetadata((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const handleCitationClick = (source) => {
    if (onViewPdf && source) onViewPdf(source);
  };

  const handleInlineCitationClick = (event, messageId) => {
    const target = event.target;
    if (target.tagName === 'SUP' && target.classList.contains('citation-ref')) {
      const citationId = parseInt(target.dataset.citationId);
      const citationElement = document.getElementById(
        `citation-${messageId}-${citationId}`
      );
      if (citationElement) {
        citationElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        citationElement.style.backgroundColor = '#e0f2fe';
        setTimeout(() => {
          citationElement.style.backgroundColor = '';
        }, 1500);
      }
    }
  };

  const handleFollowUpClick = (question) => {
    const cleanQuestion = question.replace(/^Q\d+:\s*/, '').trim();
    dispatch(sendQuestionToAPI(cleanQuestion));
  };

  // ✅ FIXED: handleFeedback now actually dispatches submitFeedback
  const handleFeedback = (messageId, type) => {
    // Don't allow re-submission if already submitted
    if (feedbackStatus[messageId]?.submitted) return;

    if (type === 'thumbs_up') {
      // Thumbs up: submit immediately with no text
      dispatch(
        submitFeedback({
          messageId,
          type: 'thumbs_up',
          text: '',
          messages,
        })
      );
    } else {
      // Thumbs down: show modal to collect feedback text first
      const message = messages.find((msg) => msg.id === messageId);
      if (!message) return;
      setCurrentFeedbackMessage(message);
      setShowFeedbackModal(true);
      setFeedbackError(null);
    }
  };

  // ✅ FIXED: handleSubmitFeedback now actually dispatches submitFeedback
  const handleSubmitFeedback = async () => {
    if (!currentFeedbackMessage || !feedbackText.trim()) return;

    try {
      await dispatch(
        submitFeedback({
          messageId: currentFeedbackMessage.id,
          type: 'thumbs_down',
          text: feedbackText,
          messages,
        })
      ).unwrap();

      setShowFeedbackModal(false);
      setFeedbackText('');
      setCurrentFeedbackMessage(null);
    } catch (error) {
      setFeedbackError('Failed to submit feedback. Please try again.');
    }
  };

  const getDocumentNameFromSource = (source) => {
    if (!source) return '';
    try {
      const url = new URL(source);
      const parts = url.pathname.split('/');
      const filename = parts[parts.length - 1];
      return decodeURIComponent(filename).replace(/%20/g, ' ').trim();
    } catch (e) {
      return source.split('/').pop()?.replace(/%20/g, ' ').trim() || source;
    }
  };

  const getReferencedCitations = (message) => {
    if (
      !message.ai_response ||
      !message.citations ||
      message.citations.length === 0
    ) {
      return { referencedCitations: [], citationsMap: new Map() };
    }

    const citationsMap = new Map(message.citations.map((c) => [c.id, c]));
    const referencedIds = new Set();
    const inlineCitationRegex = /\[(\d+)\]/g;

    const cleanedResponse = message.ai_response
      .replace(/JSON list of used sources:/g, '')
      .trim();
    let match;
    while ((match = inlineCitationRegex.exec(cleanedResponse)) !== null) {
      referencedIds.add(parseInt(match[1]));
    }

    const referencedCitations = Array.from(referencedIds)
      .map((id) => citationsMap.get(id))
      .filter(Boolean);

    return { referencedCitations, citationsMap };
  };

  if (error) {
    return (
      <div className='flex justify-center items-center h-full'>
        <span className='text-lg text-red-500'>
          Something went wrong, please try again later.
        </span>
      </div>
    );
  }

  return (
     <div
      id='chat_content'
      ref={containerRef}
      className={`flex-1 w-full h-full px-4 relative ${
    previewDocURL 
      ? 'overflow-visible' 
      : 'max-h-[58vh] overflow-y-scroll'
  }`}
    >
      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg shadow-sm p-6 w-full max-w-lg'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-medium'>Provide Feedback</h3>
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setFeedbackError(null);
                }}
                className='text-gray-500 hover:text-gray-700 cursor-pointer'
              >
                <X size={20} />
              </button>
            </div>
            <p className='text-sm text-gray-600 mb-2'>
              What was the issue with this response?
            </p>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className='w-full p-3 border border-gray-300 rounded-md mb-2 text-sm'
              rows='4'
              placeholder='Your feedback helps us improve...'
            />
            {feedbackError && (
              <p className='text-red-500 text-sm mb-2'>{feedbackError}</p>
            )}
            <div className='flex justify-end gap-3'>
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setFeedbackError(null);
                }}
                className='px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 cursor-pointer'
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitFeedback}
                className='px-4 py-2 bg-[#174a7e] text-white rounded-md text-sm hover:bg-[#082340] disabled:bg-[#92bde8] cursor-pointer'
                disabled={!feedbackText.trim()}
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat messages */}
      <ul className='w-full mb-4'>
        {messages.map((message) => {
          const { referencedCitations, citationsMap } =
            message.role === 'agent'
              ? getReferencedCitations(message)
              : { referencedCitations: [], citationsMap: new Map() };

          const showFollowUps =
            message.id === messages[messages.length - 1]?.id &&
            !isResponding &&
            followUps?.length > 0 &&
            referencedCitations.length > 0;

          if (message.role === 'user') {
            return (
              <li
                key={message.id}
                className='relative w-fit max-w-[80%] p-4 shadow-md border border-gray-200 rounded-md my-4 break-words bg-white ml-auto mr-0 z-10'
              >
                <p className='whitespace-pre-wrap text-sm'>{message.content}</p>
              </li>
            );
          }

          const feedbackState = feedbackStatus[message.id];

          return (
            <motion.li
              key={message.id}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`relative w-fit p-4 shadow-md border border-gray-200 rounded-md my-4 break-words bg-white z-10 ${
                previewDocURL ? 'w-full' : 'w-full max-w-[85%]'
              }`}
            >
              <div className='flex justify-between items-start mb-2'>
                <Sparkles size={16} className='text-blue-500 mt-1' />
                <div className='flex items-center gap-3'>
                  <div className='flex gap-1'>
                    {/* ✅ Thumbs up button — disabled after any feedback submitted */}
                    <button
                      onClick={() => handleFeedback(message.id, 'thumbs_up')}
                      className={`p-1 cursor-pointer transition-colors ${
                        feedbackState?.type === 'thumbs_up'
                          ? 'text-green-500'
                          : feedbackState?.submitted
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:text-green-500'
                      }`}
                      title={feedbackState?.submitted ? 'Feedback submitted' : 'Good response'}
                      disabled={!!feedbackState?.submitted}
                    >
                      <ThumbsUp size={16} />
                    </button>
                    {/* ✅ Thumbs down button — disabled after any feedback submitted */}
                    <button
                      onClick={() => handleFeedback(message.id, 'thumbs_down')}
                      className={`p-1 cursor-pointer transition-colors ${
                        feedbackState?.type === 'thumbs_down'
                          ? 'text-red-500'
                          : feedbackState?.submitted
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-500 hover:text-red-500'
                      }`}
                      title={feedbackState?.submitted ? 'Feedback submitted' : 'Bad response'}
                      disabled={!!feedbackState?.submitted}
                    >
                      <ThumbsDown size={16} />
                    </button>
                  </div>
                  <button
                    onClick={() =>
                      handleCopy(
                        message.ai_response || message.content,
                        message.id
                      )
                    }
                    title='Copy to clipboard'
                    className='flex items-center cursor-pointer'
                  >
                    <FileText
                      size={16}
                      className='cursor-pointer hover:text-blue-500'
                    />
                    {copiedMessageId === message.id && (
                      <span className='text-xs text-gray-500 ml-1'>
                        Copied!
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div className='text-sm'>
                {message.id === pendingMessageId &&
                message.content === '...' ? (
                  <span className='animate-pulse text-gray-400'>
                    Thinking...
                  </span>
                ) : (
                  <div
                    className='
                          text-base leading-7 text-gray-800
                          [&>p]:my-2
                          [&>ul]:list-disc
                          [&>ol]:list-decimal
                          [&>ul]:list-outside
                          [&>ol]:list-outside
                          [&>ul]:pl-6
                          [&>ol]:pl-6
                          [&>ul]:my-2
                          [&>ol]:my-2
                          [&>ul]:space-y-1
                          [&>ol]:space-y-1
                          [&>li]:text-base
                          [&>li]:leading-6
                          [&>li]:text-gray-800
                          [&>strong]:font-semibold
                          [&>p.font-semibold]:mt-4
                          [&>p.font-semibold]:mb-2
                          [&>a]:text-blue-600
                          [&>a]:hover:underline
                          [&>sup.citation-ref]:text-blue-600
                          [&>sup.citation-ref]:font-bold
                          [&>sup.citation-ref]:ml-0.5
                          [&>sup.citation-ref]:cursor-pointer
                        '
                    dangerouslySetInnerHTML={{
                      __html: formatMessageContent(
                        message.ai_response,
                        citationsMap
                      ),
                    }}
                    onClick={(e) => handleInlineCitationClick(e, message.id)}
                  />
                )}
              </div>

              {referencedCitations.length > 0 && (
                <div className='mt-4'>
                  <h3 className='font-semibold text-sm mb-2'>Citations:</h3>
                  <div className='flex flex-col gap-2'>
                    {referencedCitations.map((citation) => {
                      const isExpanded =
                        expandedCitations[`${message.id}-${citation.id}`];
                      return (
                        <div
                          key={citation.id}
                          id={`citation-${message.id}-${citation.id}`}
                          className='bg-gray-100 p-2 rounded-md relative z-10'
                        >
                          <div className='flex items-start'>
                            <span className='mr-1 text-blue-600 font-medium text-sm'>
                              {citation.id}.
                            </span>
                            <button
                              onClick={() =>
                                handleCitationClick(citation.parent_id)
                              }
                              className='text-blue-600 hover:underline text-sm flex-grow text-left cursor-pointer'
                            >
                              {citation.title ||
                                getDocumentNameFromSource(citation.parent_id)}
                            </button>
                          </div>

                          {citation.chunk && (
                            <button
                              onClick={() =>
                                toggleCitation(message.id, citation.id)
                              }
                              className='absolute bottom-1 right-2 text-blue-500 hover:text-blue-700 transition-colors text-xs bg-white px-1 z-20 cursor-pointer'
                            >
                              {isExpanded ? 'Hide' : 'Show'}
                            </button>
                          )}

                          {isExpanded && citation.chunk && (
                            <div className='mt-2 text-xs text-gray-700 break-words'>
                              <p className='whitespace-pre-wrap'>
                                {citation.chunk}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Admin Metadata Section */}
              {isAdmin && message.admin_metadata && (
                <div className='mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-200'>
                  <div className='flex items-center justify-between mb-2'>
                    <h3 className='text-sm font-semibold text-yellow-800'>
                      🔧 Developer Info
                    </h3>
                    <button
                      onClick={() => toggleAdminMetadata(message.id)}
                      className='text-xs text-yellow-700 hover:text-yellow-900 cursor-pointer'
                    >
                      {expandedAdminMetadata[message.id] ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  
                  {expandedAdminMetadata[message.id] && (
                    <div className='text-xs text-gray-700 space-y-2'>
                      <div>
                        <span className='font-semibold'>Attempts:</span>{' '}
                        {message.admin_metadata.attempts}
                      </div>
                      <div>
                        <span className='font-semibold'>Documents Found:</span>{' '}
                        {message.admin_metadata.document_count}
                      </div>
                      <div>
                        <span className='font-semibold'>Session ID:</span>{' '}
                        <code className='bg-gray-100 px-1 rounded'>
                          {message.admin_metadata.obeka_session_id}
                        </code>
                      </div>
                      {message.admin_metadata.decisions?.length > 0 && (
                        <div>
                          <span className='font-semibold'>Decisions:</span>
                          <ul className='list-disc pl-4 mt-1'>
                            {message.admin_metadata.decisions.map((decision, idx) => (
                              <li key={idx}>{decision}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isAdmin && message.admin_metadata?.thought_process && (
  <ThoughtProcessJSON thoughtProcess={message.admin_metadata.thought_process} />
)}

              {/* ✅ ADD THIS - Agentic Flow Visualization (Admin Only) */}
{isAdmin && message.admin_metadata && (
  <AgenticFlowVisualization adminMetadata={message.admin_metadata} />
)}

              {showFollowUps && (
                <div className='mt-4 p-3 bg-gray-50 rounded-md border border-gray-200'>
                  <h3 className='text-sm font-semibold mb-2'>
                    Follow-up questions:
                  </h3>
                  <div className='flex flex-wrap gap-2'>
                    {followUps.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleFollowUpClick(question)}
                        className='text-xs bg-white hover:bg-gray-100 border border-gray-300 rounded-full px-3 py-1 transition-colors cursor-pointer'
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.li>
          );
        })}
        <div ref={bottomRef} />
      </ul>
    </div>
  );
};

export default ChatContent;
