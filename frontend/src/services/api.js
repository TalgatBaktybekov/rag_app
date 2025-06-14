import axios from "axios";

const BASE_URL = "http://localhost:8000";

export const askQuestion = async (question) => {
  const res = await axios.post(`${BASE_URL}/ask`, {
    question,
    user_id: 1,
    conversation_id: 1,
  });
  return res.data;
};

