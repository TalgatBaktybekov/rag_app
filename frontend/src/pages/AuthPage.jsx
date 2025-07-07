// components/pages/AuthPage.jsx
import { useState } from "react";
import { loginUser, signupUser } from "../services/api";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const passwordRules = [
    "At least 8 characters",
    "At least one uppercase letter",
    "At least one lowercase letter",
    "At least one digit",
    "At least one special character (!@#$%^&*)"
  ];

  const toggleMode = () => setIsLogin((prev) => !prev);
  const handleOAuth = () => {
    window.location.href = "http://localhost:8000/auth/google";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = isLogin
        ? await loginUser({ email, password })
        : await signupUser({ name, email, password });
      localStorage.setItem("token", data.access_token);
      window.location.replace("/chat");
    } catch (err) {
      // Try to extract a user-friendly error message
      let msg = "Authentication failed. Please try again.";
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          // Pydantic validation error array
          msg = err.response.data.detail.map(e => e.msg).join(" ");
        } else if (typeof err.response.data.detail === 'string') {
          msg = err.response.data.detail;
        }
      }
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-gray-900 to-gray-800 text-white">
      <div className="bg-white/10 backdrop-blur-md p-10 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="flex flex-col items-center mb-6">
          <img src="/public/vite.svg" alt="Logo" className="w-16 h-16 mb-2" />
          <h1 className="text-3xl font-extrabold tracking-tight mb-1 text-blue-200 drop-shadow">
            RAG Chatbot
          </h1>
          <p className="text-gray-300 text-sm">
            AI-powered documentation assistant
          </p>
        </div>
        <h2 className="text-xl font-bold mb-4 text-center text-blue-100">
          {isLogin ? "Sign in to your account" : "Create a new account"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block mb-1 text-sm font-medium text-blue-100">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-900/80 text-white border border-gray-700 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Your name"
              />
            </div>
          )}
          <div>
            <label className="block mb-1 text-sm font-medium text-blue-100">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-900/80 text-white border border-gray-700 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-blue-100">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-900/80 text-white border border-gray-700 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Password"
            />
            {/* Password rules info */}
            {!isLogin && (
              <ul className="mt-2 text-xs text-blue-200 bg-blue-900/20 rounded p-2 list-disc list-inside">
                {passwordRules.map((rule, idx) => (
                  <li key={idx}>{rule}</li>
                ))}
              </ul>
            )}
          </div>
          {/* Error message */}
          {error && (
            <div className="bg-red-900/20 text-red-300 border border-red-400/30 rounded p-2 text-sm mt-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-400 text-white py-2 rounded-lg font-semibold shadow hover:brightness-110 transition-all"
          >
            {isLogin ? "Log in" : "Sign up"}
          </button>
        </form>
        <div className="mt-6 text-center">
          <button
            onClick={handleOAuth}
            className="w-full border border-blue-300 py-2 rounded-lg bg-white/20 text-blue-100 hover:bg-blue-100 hover:text-blue-900 transition"
          >
            Continue with Google
          </button>
        </div>
        <div className="mt-4 text-sm text-center text-blue-200">
          {isLogin ? "Don't have an account?" : "Already have an account?"} {" "}
          <button
            onClick={toggleMode}
            className="text-blue-300 hover:underline"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
