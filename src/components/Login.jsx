/**
 * Login.jsx
 * ---------
 * The login page for the shop owner.
 * Features:
 *   - Centered card with shop logo and cement bag icon
 *   - Email + Password fields
 *   - Firebase Authentication (email/password sign-in)
 *   - Error message display on wrong credentials
 *   - No registration — owner account is created manually in Firebase Console
 */

import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { GiConcreteBag } from "react-icons/gi";

function Login() {
  // Form fields — store email and password the user types
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Error message to show if login fails
  const [error, setError] = useState("");

  // Loading state to disable button while logging in
  const [isLoading, setIsLoading] = useState(false);

  /**
   * handleLogin — called when the user clicks "Login".
   * Uses Firebase's signInWithEmailAndPassword to verify credentials.
   * If successful, App.jsx will automatically detect the login and show Dashboard.
   */
  const handleLogin = async (e) => {
    // Prevent the form from refreshing the page
    e.preventDefault();

    // Clear any previous error
    setError("");
    setIsLoading(true);

    try {
      // Try to sign in with Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Welcome back! 🎉");
    } catch (err) {
      // Show a user-friendly error message
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Incorrect email or password. Please try again.");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError("Login failed. Please check your credentials.");
      }
      toast.error("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated login card with slide-up + fade-in effect */}
      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Shop icon */}
        <div className="login-icon">
          <GiConcreteBag />
        </div>

        {/* Shop name */}
        <h1>Sri Narayana Traders</h1>

        {/* Subtitle */}
        <p className="login-subtitle">Owner Management Portal</p>

        {/* Error message (shown only when there's an error) */}
        {error && <div className="login-error">{error}</div>}

        {/* Login form */}
        <form onSubmit={handleLogin}>
          {/* Email field */}
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="owner@srinarayana.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password field */}
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Login button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default Login;
