//src\app\features\auth\authSlice.js
import { createSlice } from "@reduxjs/toolkit";

const parseJSON = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return value;
  }
};

const initialState = {
  user: {
    name: parseJSON(localStorage.getItem("name")) || null,
    group: parseJSON(localStorage.getItem("group")) || null,
    job_title: parseJSON(localStorage.getItem("job_title")) || null,
  },
  //session_id: parseJSON(localStorage.getItem("session_id")) || null,
  token: parseJSON(localStorage.getItem("token")) || null,
  login_session_id: parseJSON(localStorage.getItem("login_session_id")) || null, // ✅ Add this
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
    },
    //storeSessionId: (state, action) => {
     // state.session_id = action.payload;
    //},
    setToken: (state, action) => {
      state.token = action.payload;
    },
    removeToken: (state) => {
      state.token = null;
    },
    setLoginSessionId: (state, action) => {
      state.login_session_id = action.payload;
    },
  },
});

export const {
  login,
  logout,
  setToken,
  removeToken,
  //storeSessionId,
  setLoginSessionId,
} = authSlice.actions;
export default authSlice.reducer;