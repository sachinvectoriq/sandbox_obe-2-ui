import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import apiClient from "../../../services/apiClient";
import { toast } from "react-toastify";

// ── Session ID (UUID) ────────────────────────────────────────────────────────
const isUUID = (id) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );

let getSessionId = () => {
  const stored = sessionStorage.getItem("session_id");
  const id = stored && isUUID(stored) ? stored : crypto.randomUUID();
  sessionStorage.setItem("session_id", id);
  return id;
};

// ── User ID ──────────────────────────────────────────────────────────────────
let getUserId = () => {
  let id = localStorage.getItem("user_id");
  if (!id) {
    id =
      "user_" +
      Date.now().toString() +
      Math.random().toString(36).substring(2, 8);
    localStorage.setItem("user_id", id);
  }
  return id;
};

// ── Filters (OPCO + Persona) — persisted to localStorage ────────────────────
let getFilters = () => {
  const stored = localStorage.getItem("obeka_filters");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }
  return { opco_values: [], persona_values: [] };
};

const saveFilters = (filters) => {
  localStorage.setItem("obeka_filters", JSON.stringify(filters));
};


const OPCO_MAP = {
  tektgsna: "TEK/TGS NA",
  acs: "ACS",

  // actalent: "Actalent",
  // actalentservices: "Actalent Services",
  // aerotek: "Aerotek",
  // aerotekservices: "Aerotek Services",
  // astoncarter: "Aston Carter",
  // teksystems: "TEKsystems",
  // teksystemsglobalservices: "TEKsystems Global Services",
  // allegiscorporateservices: "Allegis Corporate Services",
};

const PERSONA_MAP = {
  tektalentdeliverymspleadomem: "TEK Talent Delivery/MSP Lead/OM/EM",
  tgsrecruiter: "TGS Recruiter",
  tgsdelivery: "TGS Delivery",
  teksalesmspdirectors: "TEK Sales/MSP Directors",
  tgssales: "TGS Sales",
  accountingoperations: "Accounting Operations",
  backoffice: "Back Office",
  corporate: "Corporate",
  fieldsupportgroup: "Field Support Group",
  frontoffice: "Front Office",
  operationalriskcompliance: "Operational Risk & Compliance",
  externalusers: "External Users",
  employeeselfservice: "Employee Self-Service",
  supervisormanagerleaderselfservice:
    "Supervisor/Manager/Leader Self-Service",

  // fsg: "FSG",
  // cls: "CLS",
  // salesandrecruiting: "Sales and Recruiting",
  // deliveryandtaservices: "Delivery and TA Services",
  // corporateservices: "Corporate Services",
  // talent: "Talent",
};

// ── Language ─────────────────────────────────────────────────────────────────
let getSelectedLanguage = () => {
  let lang = localStorage.getItem("selected_language");
  if (!lang) {
    lang = "en";
    localStorage.setItem("selected_language", lang);
  }
  return lang;
};

// Map UI language code to API language string
const mapLanguageForAPI = (uiLanguage) => {
  const languageMap = { en: "en", fr: "fr" };
  return languageMap[uiLanguage] || "en";
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const cleanAiResponse = (text) => {
  if (!text) return text;
  return text
    .replace(/\s*JSON list of used source numbers:\s*(\[\])?\s*$/gm, "")
    .trim();
};

// Map new API citations format to internal format
const mapCitationsToInternal = (citations) => {
  if (!Array.isArray(citations)) return [];
  return citations.map((citation, index) => ({
    id: citation.id || index + 1,
    chunk: citation.content || "",
    title: citation.document_title || "",
    parent_id: citation.blob_url || citation.document_id || "",
    _metadata: {
      document_id: citation.document_id,
      content_id: citation.content_id,
      page_number: citation.page_number,
      blob_url: citation.blob_url,
    },
  }));
};

// Extract follow-up questions from response
const extractFollowUps = (data) => {
  if (
    Array.isArray(data?.follow_up_questions) &&
    data.follow_up_questions.length > 0
  ) {
    return data.follow_up_questions.map((q) => q.trim()).filter(Boolean);
  }
  // Fallback: old string format
  if (data?.follow_ups && typeof data.follow_ups === "string") {
    return data.follow_ups
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);
  }
  return [];
};

const checkIsAdmin = (authState) => authState?.user?.group === "admin";

// ── sendQuestionToAPI ─────────────────────────────────────────────────────────
export const sendQuestionToAPI = createAsyncThunk(
  "chat/sendQuestionToAPI",
  async (question, { dispatch, getState }) => {
    dispatch(resetError());

    const state = getState();
    const sessionId = state.chat.sessionId;
    const userId = state.chat.userId;
    const filters = state.chat.filters;
    const selectedLanguage = state.chat.selectedLanguage;
    const authState = state.auth;
    const isAdmin = checkIsAdmin(authState);

    const rawUserName = authState.user?.name;
    const userName =
      Array.isArray(rawUserName) && rawUserName.length > 0
        ? rawUserName[0]
        : rawUserName || "Anonymous";

    const rawJobTitle = authState.user?.job_title;

const jobTitle =
  Array.isArray(rawJobTitle) && rawJobTitle.length > 0
    ? String(rawJobTitle[0] ?? "")
    : String(rawJobTitle ?? "");

    const loginSessionId = authState.login_session_id || "";

    console.log("Sending question to API:", question);
    console.log("Session ID:", sessionId);
    console.log("User ID:", userId);
    console.log("User Name:", userName);
    console.log("Job Title:", jobTitle);
    console.log("Filters:", filters);
    console.log("Language:", selectedLanguage);
    console.log("Is Admin:", isAdmin);

    dispatch(setFollowUps([]));

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: question,
      timestamp: new Date().toISOString(),
    };
    dispatch(addMessage(userMessage));

    const placeholderId = Date.now() + 1;
    dispatch(
      addMessage({
        id: placeholderId,
        role: "agent",
        content: "...",
        ai_response: "...",
        citations: [],
        timestamp: new Date().toISOString(),
      }),
    );
    dispatch(setPendingMessageId(placeholderId));

    try {
      dispatch(setIsResponding(true));

      // ── Build request payload ──────────────────────────────────────────────
      const requestPayload = {
        query: question,
        user_id: userId,
        session_id: sessionId,
        language: mapLanguageForAPI(selectedLanguage), // EN/FR language param
      };

     // French — filters hidden in UI, send null for both fields explicitly
// English — apply stored OPCO/Persona values as normal
if (selectedLanguage === "fr") {
  requestPayload.filters = { opco_values: ["test"], persona_values: ["test"] };
} else {
  const opcoSet =
    filters?.opco_values?.length > 0 && filters.opco_values[0] !== "";
  const personaEmpty =
    !filters?.persona_values?.length || filters.persona_values[0] === "";

  if (opcoSet && personaEmpty) {
    requestPayload.filters = { opco_values: filters.opco_values };
  } else if (opcoSet) {
    requestPayload.filters = filters;
  }
}

      console.log("API Request Payload:", requestPayload);

      // ── Call API ───────────────────────────────────────────────────────────
      const response = await apiClient.post("/api/chat/query", requestPayload, {
        headers: { "Content-Type": "application/json" },
      });

      const data = response.data;
      console.log("API response:", data);

      // Update session ID if API returned a new one
      if (data.session_id && data.session_id !== sessionId) {
        sessionStorage.setItem("session_id", data.session_id);
        dispatch(updateSessionId(data.session_id));
        console.log("Session ID updated from API:", data.session_id);
      }

      // ── Process response ───────────────────────────────────────────────────
      if (data?.answer) {
        const cleanedAiResponse = cleanAiResponse(data.answer);
        const mappedCitations = mapCitationsToInternal(data.citations || []);
        const followUps = extractFollowUps(data);

        const messageUpdate = {
          id: placeholderId,
          content: cleanedAiResponse,
          ai_response: cleanedAiResponse,
          citations: mappedCitations,
          query: question,
        };

        // Admin metadata — only attach for admin users
        if (isAdmin) {
          messageUpdate.admin_metadata = {
            thought_process: data.thought_process || [],
            search_history: data.search_history || [],
            decisions: data.decisions || [],
            attempts: data.attempts || 0,
            document_count: data.document_count || 0,
            obeka_session_id: data.session_id || "",
            timestamp: data.timestamp || "",
          };
        }

        dispatch(updateMessageById(messageUpdate));
        dispatch(setFollowUps(followUps));

        // ── Audit log ──────────────────────────────────────────────────────
        try {
          const currentFilters = getState().chat.filters;
          const citationTitles = mappedCitations
            .map((c) => c.title)
            .filter(Boolean);

          const logPayload = {
            chat_session_id: sessionId,
            user_id: userId,
            user_name: userName,
            job_title: String(jobTitle ?? ""),
            opco:
  selectedLanguage === "fr"
    ? null
    : OPCO_MAP[currentFilters?.opco_values?.[0]] || "",
            persona:
  selectedLanguage === "fr"
    ? null
    : PERSONA_MAP[currentFilters?.persona_values?.[0]] || "",
            query: question,
            ai_response: cleanedAiResponse,
            citations: citationTitles,
            query_language: mapLanguageForAPI(selectedLanguage),
          };

          console.log("Audit log payload:", logPayload);
          await apiClient.post("/api/audit/log", logPayload);
          console.log("Audit log success");
        } catch (logError) {
          console.error(
            "Audit log failed:",
            logError.response?.data || logError.message,
          );
          // Non-blocking — don't prevent UI from showing response
        }
      } else {
        throw new Error(
          "Invalid API response structure: missing answer field.",
        );
      }
    } catch (error) {
      console.error("API error:", error);
      dispatch(
        updateMessageById({
          id: placeholderId,
          content: `Something went wrong: ${error.message}`,
          ai_response: `Something went wrong: ${error.message}`,
          citations: [],
          query: question,
        }),
      );
      dispatch(setError(error.message));
    } finally {
      dispatch(clearInput());
      dispatch(setPendingMessageId(null));
      dispatch(setIsResponding(false));
    }
  },
);

// ── submitFeedback ─────────────────────────────────────────────────────────────
export const submitFeedback = createAsyncThunk(
  "chat/submitFeedback",
  async (
    { messageId, type, text, messages },
    { getState, rejectWithValue },
  ) => {
    const state = getState();
    const { sessionId, userId, filters, selectedLanguage } = state.chat;
    const authState = state.auth;

    const rawUserName = authState.user?.name;
    const userName =
      Array.isArray(rawUserName) && rawUserName.length > 0
        ? rawUserName[0]
        : rawUserName || "Anonymous";

    const rawJobTitle = authState.user?.job_title;

const jobTitle =
  Array.isArray(rawJobTitle) && rawJobTitle.length > 0
    ? String(rawJobTitle[0] ?? "")
    : String(rawJobTitle ?? "");

    const messageIndex = messages.findIndex((msg) => msg.id === messageId);
    const agentMessage = messages[messageIndex];

    // Find the user query that preceded this agent message
    let userQuery = "";
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        userQuery = messages[i].content;
        break;
      }
    }

    const payload = {
    chat_session_id: sessionId,
    user_id: userId,
    user_name: userName,
    job_title: String(jobTitle ?? ""),
    opco:
  selectedLanguage === "fr"
    ? null
    : OPCO_MAP[filters?.opco_values?.[0]] || "",

persona:
  selectedLanguage === "fr"
    ? null
    : PERSONA_MAP[filters?.persona_values?.[0]] || "",
    query: userQuery,
    ai_response: agentMessage?.ai_response || "",
    citations: (agentMessage?.citations || [])
        .map((c) => c.title)
        .filter(Boolean),
    feedback_type: type,
    feedback_text: text || "",
    query_language: selectedLanguage === "fr" ? "fr" : "en", // ← ADD
};

    console.log("Submitting feedback payload:", payload);

    try {
      await apiClient.post("/api/feedback/submit", payload);
      return { messageId, type };
    } catch (error) {
      console.error(
        "Feedback submission failed:",
        error.response?.data || error.message,
      );
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

// ── Initial State ──────────────────────────────────────────────────────────────
const initialState = {
  messages: [],
  input: "",
  isResponding: false,
  error: null,
  pendingMessageId: null,
  followUps: [],
  feedbackStatus: {},
  samplePrompts: [
    "What is bullhorn",
    "Got any creative ideas for a 10-year-old's birthday?",
    "How do I make an HTTP request in JavaScript?",
    "What's the difference between React and Vue?",
  ],
  sessionId: getSessionId(),
  userId: getUserId(),
  filters: getFilters(), // ← OPCO + Persona filters
  previewDocURL: null,
  selectedLanguage: getSelectedLanguage(), // ← EN/FR
};

// ── Slice ──────────────────────────────────────────────────────────────────────
const chatSlice = createSlice({
  name: "chat",
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
      if (action.payload.role === "agent" && !action.payload.ai_response)
        action.payload.ai_response = action.payload.content;
      if (action.payload.role === "agent" && !action.payload.citations)
        action.payload.citations = [];
      if (action.payload.role === "agent" && !action.payload.query)
        action.payload.query = "";
      state.messages.push(action.payload);
    },

    addPrompt: (state, action) => {
      state.messages = [
        {
          id: Date.now(),
          role: "user",
          content: action.payload.text,
          timestamp: new Date().toISOString(),
        },
      ];
    },

    setPendingMessageId: (state, action) => {
      state.pendingMessageId = action.payload;
    },

    updateMessageById: (state, action) => {
      const { id, content, ai_response, citations, query, admin_metadata } =
        action.payload;
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

    // ── Session ID ─────────────────────────────────────────────────────────
    updateSessionId: (state, action) => {
      state.sessionId = action.payload;
    },

    // ── Filters ────────────────────────────────────────────────────────────
    setFilters: (state, action) => {
      state.filters = action.payload;
      saveFilters(action.payload);
      console.log("Filters updated:", action.payload);
    },
    updateFilter: (state, action) => {
      const { filterType, values } = action.payload;
      if (filterType === "opco") state.filters.opco_values = values;
      else if (filterType === "persona") state.filters.persona_values = values;
      saveFilters(state.filters);
      console.log(`Filter ${filterType} updated:`, values);
    },
    resetFilters: (state) => {
      const defaultFilters = { opco_values: [], persona_values: [] };
      state.filters = defaultFilters;
      saveFilters(defaultFilters);
    },

    // ── Language ───────────────────────────────────────────────────────────
    setSelectedLanguage: (state, action) => {
      state.selectedLanguage = action.payload;
      localStorage.setItem("selected_language", action.payload);
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
    resetError: (state) => {
      state.error = null;
    },

    clearChat: (state) => {
      state.messages = [];
      state.followUps = [];
      state.feedbackStatus = {};
      state.input = "";
      state.error = null;
      state.pendingMessageId = null;
      state.isResponding = false;
    },
    clearInput: (state) => {
      state.input = "";
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
      const newId = crypto.randomUUID(); // UUID format
      sessionStorage.setItem("session_id", newId);
      state.sessionId = newId;
      state.isResponding = false;
    },
    resetUserId: (state) => {
      const newId =
        "user_" +
        Date.now().toString() +
        Math.random().toString(36).substring(2, 8);
      localStorage.setItem("user_id", newId);
      state.userId = newId;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(sendQuestionToAPI.rejected, (state, action) => {
        state.error =
          action.payload ||
          action.error.message ||
          "An unexpected error occurred.";
        state.isResponding = false;
      })
      .addCase(submitFeedback.fulfilled, (state, action) => {
        const { messageId, type } = action.payload;
        state.feedbackStatus[messageId] = { submitted: true, type };
        toast.success("Feedback submitted!", {
          position: "bottom-right",
          autoClose: 2000,
          hideProgressBar: true,
          closeOnClick: true,
          style: {
            background: "#ffffff",
            color: "#174a7e",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          },
          icon: "✓",
        });
      })
      .addCase(submitFeedback.rejected, (state, action) => {
        toast.error("Failed to submit feedback.", {
          position: "bottom-right",
          autoClose: 2000,
          hideProgressBar: true,
          style: {
            background: "#ffffff",
            color: "#174a7e",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "14px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          },
          icon: "✕",
        });
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
  resetError,
  clearChat,
  clearInput,
  resetToWelcome,
  clearIfInputEmpty,
  resetSessionId,
  resetUserId,
  setSelectedLanguage,
} = chatSlice.actions;

export default chatSlice.reducer;