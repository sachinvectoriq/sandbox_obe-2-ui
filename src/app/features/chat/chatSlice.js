import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import apiClient from '../../../services/apiClient';
import { toast } from 'react-toastify';

let getSessionId = () => {
  let id = sessionStorage.getItem('session_id');
  if (!id) {
    id = Date.now().toString();
    sessionStorage.setItem('session_id', id);
  }
  return id;
};

let getUserId = () => {
  let id = localStorage.getItem('user_id');
  if (!id) {
    id =
      'user_' +
      Date.now().toString() +
      Math.random().toString(36).substring(2, 8);
    localStorage.setItem('user_id', id);
  }
  return id;
};

let getFilters = () => {
  const storedFilters = localStorage.getItem('obeka_filters');
  if (storedFilters) {
    try {
      return JSON.parse(storedFilters);
    } catch (e) {
      console.error('Error parsing stored filters:', e);
    }
  }
  return {
    opco_values: [],
    persona_values: []
  };
};

const saveFilters = (filters) => {
  localStorage.setItem('obeka_filters', JSON.stringify(filters));
};

const cleanAiResponse = (text) => {
  if (!text) return text;
  return text
    .replace(/\s*JSON list of used source numbers:\s*(\[\])?\s*$/gm, '')
    .trim();
};

const mapOBEKACitationsToOCM = (obekaCitations) => {
  if (!Array.isArray(obekaCitations)) return [];
  
  return obekaCitations.map((citation, index) => ({
    id: citation.id || index + 1,
    chunk: citation.content || '',
    title: citation.document_title || '',
    parent_id: citation.blob_url || citation.document_id || '',
    _obeka_metadata: {
      document_id: citation.document_id,
      content_id: citation.content_id,
      page_number: citation.page_number,
      blob_url: citation.blob_url,
    }
  }));
};

const extractFollowUps = (obekaResponse) => {
  if (
    Array.isArray(obekaResponse?.follow_up_questions) &&
    obekaResponse.follow_up_questions.length > 0
  ) {
    return obekaResponse.follow_up_questions.map((q) => q.trim()).filter(Boolean);
  }
  return [];
};

const checkIsAdmin = (authState) => {
  return authState?.user?.group === 'admin';
};


const isUUID = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

const getValidSessionId = () => {
  const stored = sessionStorage.getItem('session_id');

  const sessionId = stored && isUUID(stored)
    ? stored
    : crypto.randomUUID();

  sessionStorage.setItem('session_id', sessionId);
  return sessionId;
};


export const submitFeedback = createAsyncThunk(
  'chat/submitFeedback',
  async ({ messageId, type, text, messages }, { getState, rejectWithValue }) => {
    const state = getState();
    const { sessionId, userId, filters } = state.chat;
    const authState = state.auth;

    const rawUserName = authState.user?.name;
    const userName = (Array.isArray(rawUserName) && rawUserName.length > 0)
      ? rawUserName[0]
      : rawUserName || 'Anonymous';

    const messageIndex = messages.findIndex((msg) => msg.id === messageId);
    const agentMessage = messages[messageIndex];

    let userQuery = '';
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userQuery = messages[i].content;
        break;
      }
    }

    const payload = {
      chat_session_id: sessionId,
      user_id: userId,
      user_name: userName,
      opco: filters?.opco_values?.[0] || '',
      persona: filters?.persona_values?.[0] || '',
      query: userQuery,
      ai_response: agentMessage?.ai_response || '',
      citations: (agentMessage?.citations || [])
        .map((c) => c.title)
        .filter(Boolean),
      feedback_type: type,
      feedback_text: text || '',
    };

    console.log('Submitting feedback payload:', payload);

    //try {
     // await apiClient.post('/api/feedback/submit', payload);
      //return { messageId, type };
    //} catch (error) {
      //console.error('Feedback submission failed:', error.response?.data || error.message);
      //return rejectWithValue(error.response?.data || error.message);
    //}
    return { messageId, type };
  }
  
);


// Async thunk for sending user question to OBEKA API
export const sendQuestionToAPI = createAsyncThunk(
  'chat/sendQuestionToAPI',
  async (question, { dispatch, getState }) => {
    const state = getState();
    const sessionId = state.chat.sessionId;
    const userId = state.chat.userId;
    const filters = state.chat.filters;
    const authState = state.auth;
    const isAdmin = checkIsAdmin(authState);

    const rawUserName = authState.user?.name;
    const userName = (Array.isArray(rawUserName) && rawUserName.length > 0)
      ? rawUserName[0]
      : rawUserName || 'Anonymous';

    console.log('Sending question to OBEKA API:', question);
    console.log('Session ID:', sessionId);
    console.log('User ID:', userId);
    console.log('Filters:', filters);
    console.log('User Name:', userName);
    console.log('Is Admin:', isAdmin);

    dispatch(setFollowUps([]));

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };
    dispatch(addMessage(userMessage));

    const placeholderId = Date.now() + 1;
    const placeholderMessage = {
      id: placeholderId,
      role: 'agent',
      content: '...',
      ai_response: '...',
      citations: [],
      timestamp: new Date().toISOString(),
    };
    dispatch(addMessage(placeholderMessage));
    dispatch(setPendingMessageId(placeholderId));

    // ══════════════════════════════════════════════════════════════════════════
    // 🚫 COMMENTED OUT: Helper to detect if response is a "no info found" failure.
    // Disabled for now — filters are sent as-is and the API response is displayed directly.
    // ══════════════════════════════════════════════════════════════════════════
    // const isNoInfoResponse = (data) => {
    //   const hasNoInfoMessage = data?.answer?.toLowerCase().includes("couldn't find relevant information");
    //   const hasNoCitations = !data?.citations || data.citations.length === 0;
    //   const hasNoDocuments = data?.document_count === 0;
    //   return hasNoInfoMessage || (hasNoCitations && hasNoDocuments);
    // };

    // ══════════════════════════════════════════════════════════════════════════
    // Core API call function — always called with filters as-is
    // ══════════════════════════════════════════════════════════════════════════
    const callOBEKA = async () => {
      const requestPayload = {
        query: question,
        user_id: userId,
        session_id: sessionId,
      };

      // Send actual filters as-is.
      // If OPCO is set but persona is intentionally empty,
      // omit persona_values from the payload entirely (don't send null / "").
      const opcoSet =
        filters?.opco_values?.length > 0 && filters.opco_values[0] !== '';
      const personaEmpty =
        !filters?.persona_values?.length || filters.persona_values[0] === '';

      if (opcoSet && personaEmpty) {
        requestPayload.filters = {
          opco_values: filters.opco_values,
          // persona_values intentionally omitted
        };
      } else {
        requestPayload.filters = filters;
      }

      console.log('OBEKA API Request Payload:', requestPayload);

      const response = await apiClient.post('/api/chat/query', requestPayload, {
        headers: { 'Content-Type': 'application/json' },
      });

      return response.data;
    };

    // ══════════════════════════════════════════════════════════════════════════
    // 🚫 COMMENTED OUT: Fallback retry logic (no-filter retry when no info found).
    // Re-enable this block when fallback behavior is needed again.
    // ══════════════════════════════════════════════════════════════════════════
    // const callOBEKA = async (withFilters = true) => {
    //   const requestPayload = {
    //     query: question,
    //     user_id: userId,
    //     session_id: sessionId,
    //   };
    //
    //   if (withFilters) {
    //     const opcoSet = filters?.opco_values?.length > 0 && filters.opco_values[0] !== '';
    //     const personaEmpty = !filters?.persona_values?.length || filters.persona_values[0] === '';
    //     if (opcoSet && personaEmpty) {
    //       requestPayload.filters = { opco_values: filters.opco_values };
    //     } else {
    //       requestPayload.filters = filters;
    //     }
    //   } else {
    //     requestPayload.filters = { opco_values: [""], persona_values: [""] };
    //   }
    //
    //   const response = await apiClient.post('/api/chat/query', requestPayload, {
    //     headers: { 'Content-Type': 'application/json' },
    //   });
    //   return response.data;
    // };

    try {
      dispatch(setIsResponding(true));

      // ════════════════════════════════════════════════════════════════════════
      // STEP 1: Call API once with filters as-is and display the result
      // ════════════════════════════════════════════════════════════════════════
      const data = await callOBEKA();

      // Update session ID if OBEKA returned a new one
      if (data.session_id) {
        sessionStorage.setItem('session_id', data.session_id);
        if (data.session_id !== sessionId) {
          dispatch(updateSessionId(data.session_id));
        }
        console.log('Session ID updated from OBEKA:', data.session_id);
      }

      // ════════════════════════════════════════════════════════════════════════
      // 🚫 COMMENTED OUT: Step 2 — Fallback retry if no info found with filters.
      // Re-enable when fallback behavior is needed again.
      // ════════════════════════════════════════════════════════════════════════
      // const hadFiltersApplied =
      //   (filters?.opco_values?.length > 0) || (filters?.persona_values?.length > 0);
      //
      // if (isNoInfoResponse(data) && hadFiltersApplied) {
      //   console.warn('⚠️ No info found with filters. Retrying WITHOUT filters (fallback)...');
      //   data = await callOBEKA(false);
      //
      //   if (data.session_id) {
      //     sessionStorage.setItem('session_id', data.session_id);
      //     if (data.session_id !== sessionId) {
      //       dispatch(updateSessionId(data.session_id));
      //     }
      //     console.log('Session ID updated from OBEKA (fallback):', data.session_id);
      //   }
      //   console.log('✅ Fallback completed. Displaying result.');
      // }

      // ════════════════════════════════════════════════════════════════════════
      // STEP 2: Process and display the response
      // ════════════════════════════════════════════════════════════════════════
      if (data?.answer) {
        const cleanedAiResponse = cleanAiResponse(data.answer);
        const mappedCitations = mapOBEKACitationsToOCM(data.citations || []);
        const followUps = extractFollowUps(data);

        const messageUpdate = {
          id: placeholderId,
          content: cleanedAiResponse,
          ai_response: cleanedAiResponse,
          citations: mappedCitations,
          query: question,
        };

        if (isAdmin) {
          messageUpdate.admin_metadata = {
            thought_process: data.thought_process || [],
            search_history: data.search_history || [],
            decisions: data.decisions || [],
            attempts: data.attempts || 0,
            document_count: data.document_count || 0,
            obeka_session_id: data.session_id || '',
            timestamp: data.timestamp || '',
          };
        }

        dispatch(updateMessageById(messageUpdate));
        dispatch(setFollowUps(followUps));

        // ════════════════════════════════════════════════════════════════════
        // Audit logging
        // ════════════════════════════════════════════════════════════════════
        /*try {
          const currentFilters = getState().chat.filters;

          const logPayload = {
            chat_session_id: sessionId,
            user_id: userId,
            user_name: userName,
            opco: currentFilters?.opco_values?.[0] || '',
            persona: currentFilters?.persona_values?.[0] || '',
            query: question,
            ai_response: cleanedAiResponse,
            citations: mappedCitations.map((c) => c.title).filter(Boolean),
          };

          console.log('Audit log payload:', logPayload);
          await apiClient.post('/api/audit/log', logPayload);
          console.log('Audit log success');
        } catch (logError) {
          console.error('Audit log failed:', logError.response?.data || logError.message);
        }*/

      } else {
        throw new Error('Invalid OBEKA API response structure: missing answer field.');
      }

    } catch (error) {
      console.error('OBEKA API error:', error);
      dispatch(
        updateMessageById({
          id: placeholderId,
          content: `Something went wrong: ${error.message}`,
          ai_response: `Something went wrong: ${error.message}`,
          citations: [],
          query: question,
        })
      );
      dispatch(setError(error.message));
    } finally {
      dispatch(clearInput());
      dispatch(setPendingMessageId(null));
      dispatch(setIsResponding(false));
    }
  }
);

const initialState = {
  messages: [],
  input: '',
  isResponding: false,
  error: null,
  pendingMessageId: null,
  followUps: [],
  feedbackStatus: {},
  samplePrompts: [
    'What is bullhorn',
    "Got any creative ideas for a 10-year-old's birthday?",
    'How do I make an HTTP request in JavaScript?',
    "What's the difference between React and Vue?",
  ],
  sessionId: getValidSessionId(),
  userId: getUserId(),
  filters: getFilters(),
  previewDocURL: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setInput: (state, action) => {
      state.input = action.payload;
    },
    setPreviewDocURL: (state, action) => {
      state.previewDocURL = action.payload.url;
    },
    removePreviewDocURL: (state) => {
      state.previewDocURL = null;
    },
    addMessage: (state, action) => {
      if (action.payload.role === 'agent' && !action.payload.ai_response) {
        action.payload.ai_response = action.payload.content;
      }
      if (action.payload.role === 'agent' && !action.payload.citations) {
        action.payload.citations = [];
      }
      if (action.payload.role === 'agent' && !action.payload.query) {
        action.payload.query = '';
      }
      state.messages.push(action.payload);
    },
    addPrompt: (state, action) => {
      state.messages = [
        {
          id: Date.now(),
          role: 'user',
          content: action.payload.text,
          timestamp: new Date().toISOString(),
        },
      ];
    },
    setPendingMessageId: (state, action) => {
      state.pendingMessageId = action.payload;
    },
    updateMessageById: (state, action) => {
      const { id, content, ai_response, citations, query, admin_metadata } = action.payload;
      const index = state.messages.findIndex((msg) => msg.id === id);
      if (index !== -1) {
        state.messages[index] = {
          ...state.messages[index],
          content,
          ai_response:
            ai_response !== undefined
              ? ai_response
              : state.messages[index].ai_response,
          citations,
          query: query !== undefined ? query : state.messages[index].query,
          ...(admin_metadata && { admin_metadata }),
        };
      }
    },
    updateSessionId: (state, action) => {
      state.sessionId = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = action.payload;
      saveFilters(action.payload);
      console.log('Filters updated:', action.payload);
    },
    updateFilter: (state, action) => {
      const { filterType, values } = action.payload;
      if (filterType === 'opco') {
        state.filters.opco_values = values;
      } else if (filterType === 'persona') {
        state.filters.persona_values = values;
      }
      saveFilters(state.filters);
      console.log(`Filter ${filterType} updated:`, values);
    },
    resetFilters: (state) => {
      const defaultFilters = {
        opco_values: [],
        persona_values: []
      };
      state.filters = defaultFilters;
      saveFilters(defaultFilters);
      console.log('Filters reset to defaults');
    },
    setFollowUps: (state, action) => {
      state.followUps = action.payload;
    },
    setFeedbackStatus: (state, action) => {
      const { messageId, status } = action.payload;
      state.feedbackStatus[messageId] = status;
    },
    setIsResponding: (state, action) => {
      state.isResponding = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearChat: (state) => {
      state.messages = [];
      state.followUps = [];
      state.feedbackStatus = {};
      state.input = '';
      state.error = null;
      state.pendingMessageId = null;
      state.isResponding = false;
    },
    clearInput: (state) => {
      state.input = '';
    },
    resetToWelcome: (state) => {
      state.messages = [];
      state.feedbackStatus = {};
      state.isResponding = false;
    },
    clearIfInputEmpty: (state) => {
      if (!state.input.trim()) {
        state.messages = [];
        state.followUps = [];
        state.feedbackStatus = {};
        state.isResponding = false;
      }
    },
    resetSessionId: (state) => {
      const newId = crypto.randomUUID();
      sessionStorage.setItem('session_id', newId);
      state.sessionId = newId;
      console.log('Session ID reset to:', newId);
      state.isResponding = false;
    },
    resetUserId: (state) => {
      const newId =
        'user_' +
        Date.now().toString() +
        Math.random().toString(36).substring(2, 8);
      localStorage.setItem('user_id', newId);
      state.userId = newId;
      console.log('User ID reset to:', newId);
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(submitFeedback.fulfilled, (state, action) => {
        const { messageId, type } = action.payload;
        state.feedbackStatus[messageId] = { submitted: true, type };
        console.log('Feedback submitted successfully for message:', messageId);
      })
      .addCase(submitFeedback.rejected, (state, action) => {
        console.error('Feedback submission failed in reducer:', action.payload);
      });
  },
});

export const {
  setInput,
  setPreviewDocURL,
  removePreviewDocURL,
  addMessage,
  addPrompt,
  setPendingMessageId,
  updateMessageById,
  updateSessionId,
  setFilters,
  updateFilter,
  resetFilters,
  setFollowUps,
  setFeedbackStatus,
  setIsResponding,
  setError,
  clearChat,
  clearInput,
  resetToWelcome,
  clearIfInputEmpty,
  resetSessionId,
  resetUserId,
} = chatSlice.actions;

export default chatSlice.reducer;
