/**
 * App.jsx
 * -------
 * The main app component that handles:
 * 1. Checking if the user is logged in (Firebase Auth)
 * 2. Showing the Login page if not logged in
 * 3. Showing the Sidebar + page content if logged in
 * 4. Page routing (Dashboard, Products, Billing, Bill History)
 * 5. Smooth page transitions using Framer Motion
 */

import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/firebaseConfig";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "react-hot-toast";

// Import all page components
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Products from "./components/Products";
import Billing from "./components/Billing";
import BillHistory from "./components/BillHistory";

/**
 * PageWrapper — wraps each page with fade-in + slide-up animation.
 * Framer Motion's "motion.div" lets us animate components easily.
 */
function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/**
 * App — the root component of our application.
 */
function App() {
  // 'user' stores the currently logged-in user (null if not logged in)
  const [user, setUser] = useState(null);

  // 'loading' is true while we check if the user is logged in
  const [loading, setLoading] = useState(true);

  // useLocation gives us the current URL path (used for animations)
  const location = useLocation();

  /**
   * useEffect runs once when the app loads.
   * onAuthStateChanged listens for login/logout changes from Firebase.
   * When a user logs in or out, Firebase tells us and we update 'user'.
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // Cleanup: stop listening when component unmounts
    return () => unsubscribe();
  }, []);

  // Show a loading spinner while checking auth status
  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontFamily: "Poppins, sans-serif",
        fontSize: "1.1rem",
        color: "#555"
      }}>
        Loading...
      </div>
    );
  }

  // If user is NOT logged in, show only the Login page
  if (!user) {
    return (
      <>
        <Toaster position="top-right" />
        <Login />
      </>
    );
  }

  // If user IS logged in, show Sidebar + page content
  return (
    <>
      {/* Toast notifications (success/error messages) */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: "Poppins, sans-serif",
            borderRadius: "8px",
          },
        }}
      />

      {/* App layout: sidebar on left, content on right */}
      <div className="app-layout">
        <Sidebar />

        <main className="main-content">
          {/* AnimatePresence enables exit animations when switching pages */}
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              {/* Dashboard — the home page */}
              <Route
                path="/"
                element={
                  <PageWrapper>
                    <Dashboard />
                  </PageWrapper>
                }
              />

              {/* Products — manage cement products */}
              <Route
                path="/products"
                element={
                  <PageWrapper>
                    <Products />
                  </PageWrapper>
                }
              />

              {/* Billing — create new bills */}
              <Route
                path="/billing"
                element={
                  <PageWrapper>
                    <Billing />
                  </PageWrapper>
                }
              />

              {/* Bill History — view past bills */}
              <Route
                path="/bill-history"
                element={
                  <PageWrapper>
                    <BillHistory />
                  </PageWrapper>
                }
              />

              {/* Redirect any unknown route to Dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </>
  );
}

export default App;
