import axios from "axios";

const BASE_URL = "http://localhost:8000";

function getAuthHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleRefreshToken(res) {
  // Axios normalizes all header names to lowercase
  const newToken = res.headers["x-refresh-token"];
  if (newToken) {
    localStorage.setItem("token", newToken);
  }
}

export const loginUser = async ({ email, password }) => {
  const res = await axios.post(`${BASE_URL}/auth/login`, { email, password });
  handleRefreshToken(res);
  return res.data;
};

export const signupUser = async ({ name, email, password }) => {
  const res = await axios.post(`${BASE_URL}/auth/signup`, {
    name, 
    email,
    password,
  });
  handleRefreshToken(res);
  return res.data;
};

export const fetchConversations = async () => {
  try {
    const res = await axios.get(`${BASE_URL}/chat/conversations`, {
      headers: getAuthHeader(),
    });
    handleRefreshToken(res);
    return res.data || [];
  } catch {
    return [];
  }
};

export const createConversation = async (title = "New conversation") => {
  const res = await axios.post(
    `${BASE_URL}/chat/conversations`,
    { title },
    { headers: getAuthHeader() }
  );
  handleRefreshToken(res);
  return res.data;
};

export const deleteConversation = async (convId) => {
  const res = await axios.delete(`${BASE_URL}/chat/conversations/${convId}`, {
    headers: getAuthHeader(),
  });
  handleRefreshToken(res);
};

export const askQuestion = async ({ question, convId }) => {
  const res = await axios.post(
    `${BASE_URL}/chat/ask`,
    { question, conv_id: convId },
    { headers: getAuthHeader() }
  );
  handleRefreshToken(res);
  return res.data;
};


export const fetchMessages = async (convId) => {
  const res = await axios.get(
    `${BASE_URL}/chat/history/${convId}`,
    { headers: getAuthHeader() }
  );
  handleRefreshToken(res);
  return res.data;
};

// Document management functions
export const uploadDocuments = async (formData) => {
  const res = await axios.post(`${BASE_URL}/documents/upload`, formData, {
    headers: {
      ...getAuthHeader(),
      'Content-Type': 'multipart/form-data',
    },
  });
  handleRefreshToken(res);
  return res.data;
};

export const ingestDocument = async (documentId) => {
  const res = await axios.post(`${BASE_URL}/documents/ingest/${documentId}`, {}, {
    headers: getAuthHeader(),
  });
  handleRefreshToken(res);
  return res.data;
};

export const triggerIngestion = async () => {
  const res = await axios.post(`${BASE_URL}/documents/ingest`, {}, {
    headers: getAuthHeader(),
  });
  handleRefreshToken(res);
  return res.data;
};

export const getVectorStoreStatus = async () => {
  const res = await axios.get(`${BASE_URL}/documents/vector-store-status`, {
    headers: getAuthHeader(),
  });
  handleRefreshToken(res);
  return res.data;
};

export const listDocuments = async () => {
  const res = await axios.get(`${BASE_URL}/documents/list`, {
    headers: getAuthHeader()
  });
  handleRefreshToken(res);
  return res.data;
};

export const deleteDocument = async (documentId) => {
  const res = await axios.delete(`${BASE_URL}/documents/${documentId}`, {
    headers: getAuthHeader(),
  });
  handleRefreshToken(res);
  return res.data;
};



export const selectDocumentsForConversation = async (convId, documentIds) => {
  try {
      const res = await axios.post(`${BASE_URL}/documents/conversation/${convId}/select`, 
      { document_ids: documentIds },
      { headers: getAuthHeader() }
    );
    handleRefreshToken(res);
    return res.data;
  } catch (error) {
    throw error;
  }
};

export const getSelectedDocuments = async (convId) => {
  try {
    const res = await axios.get(`${BASE_URL}/documents/conversation/${convId}/selected`, {
      headers: getAuthHeader(),
    });
    handleRefreshToken(res);
    return res.data;
  } catch (error) {
    throw error;
  }
};

// Global Axios response interceptor for 401 Unauthorized
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/auth";
    }
    return Promise.reject(error);
  }
);

// Function to get a single document status
export const getDocumentStatus = async (documentId) => {
  const res = await axios.get(`${BASE_URL}/documents/status/${documentId}`, {
    headers: getAuthHeader(),
  });
  handleRefreshToken(res);
  return res.data;
};

// PDF Viewing helper function
export const getPdfUrlForDocument = (filename) => {
  if (!filename || typeof filename !== 'string') {
    console.warn('getPdfUrlForDocument: Invalid filename:', filename);
    return null;
  }
  
  try {
    // Clean up the filename - remove any path traversal attempts and make sure it's trimmed
    const cleanFilename = filename.trim().split(/[\/\\]/).pop();
    if (!cleanFilename) {
      console.warn('getPdfUrlForDocument: Empty filename after cleaning:', filename);
      return null;
    }
    
    // Use /api prefix to leverage the Vite proxy to the backend
    const encodedFilename = encodeURIComponent(cleanFilename);
    const url = `/api/documents/serve-pdf/${encodedFilename}`;
    
    console.log('getPdfUrlForDocument:', {
      originalFilename: filename,
      cleanFilename: cleanFilename,
      encodedFilename: encodedFilename,
      finalUrl: url
    });
    
    // Return just the relative URL path, not a full URL
    return url;
  } catch (error) {
    console.error('getPdfUrlForDocument error:', error);
    return null;
  }
};

// Logout function to clear token and redirect
export const logoutUser = () => {
  localStorage.removeItem("token");
  // Optionally clear other user data
  localStorage.removeItem("user");
  // Redirect to login page
  window.location.href = "/";
};
