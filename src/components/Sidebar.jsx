/**
 * Sidebar.jsx
 * -----------
 * The left-side navigation panel that appears on every page (when logged in).
 * Contains:
 *   - Shop logo with cement bag icon and shop name
 *   - Navigation links to all pages (with icons)
 *   - Logout button at the bottom
 *   - Hamburger menu toggle for mobile devices
 */

import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import toast from "react-hot-toast";

// Import icons from React Icons library
import {
  MdDashboard,
  MdInventory,
  MdReceipt,
  MdHistory,
  MdLogout,
  MdMenu,
  MdClose,
} from "react-icons/md";
import { GiConcreteBag } from "react-icons/gi";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

function Sidebar() {
  // Controls whether sidebar is open on mobile
  const [isOpen, setIsOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);

  // useNavigate lets us redirect the user to another page
  const navigate = useNavigate();

  // Toggle sidebar open/closed on mobile
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // Close sidebar when a link is clicked (on mobile)
  const closeSidebar = () => {
    setIsOpen(false);
  };

  // Handle logout — sign out from Firebase and redirect to login
  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  // Navigation items — each has a label, path, and icon
  const navItems = [
    { label: "Dashboard", path: "/", icon: <MdDashboard /> },
    { label: "Products", path: "/products", icon: <MdInventory /> },
    { label: "Billing", path: "/billing", icon: <MdReceipt /> },
    { label: "Bill History", path: "/bill-history", icon: <MdHistory /> },
  ];

  // Listen for products and compute low-stock count for sidebar badge
  useEffect(() => {
    const productsRef = collection(db, "products");
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const low = data.filter((p) => (p.stock || 0) < 10).length;
      setLowStockCount(low);
    });
    return () => unsubscribe();
  }, []);

  return (
    <>
      {/* Hamburger button — only visible on mobile */}
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        {isOpen ? <MdClose /> : <MdMenu />}
      </button>

      {/* Sidebar panel */}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        {/* Logo section at the top */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <GiConcreteBag />
          </div>
          <h2>Sri Narayana Traders</h2>
          <p className="tagline">Your Trusted Cement Partner</p>
        </div>

        {/* Navigation links */}
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `sidebar-nav-link ${isActive ? "active" : ""}`
              }
              onClick={closeSidebar}
            >
              <span className="nav-icon">{item.icon}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {item.label}
                {item.label === "Products" && lowStockCount > 0 && (
                  <span style={{
                    background: "#e02424",
                    color: "white",
                    borderRadius: 12,
                    padding: "2px 8px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}>
                    {lowStockCount}
                  </span>
                )}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Logout button at the bottom */}
        <div className="sidebar-logout">
          <button onClick={handleLogout}>
            <MdLogout />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay — when sidebar is open on mobile, dim the background */}
      {isOpen && (
        <div
          onClick={closeSidebar}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 999,
          }}
        />
      )}
    </>
  );
}

export default Sidebar;
