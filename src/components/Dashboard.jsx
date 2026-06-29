/**
 * Dashboard.jsx
 * -------------
 * The main dashboard page that shows a business overview.
 * Features:
 *   - 4 summary cards (Total Sales Today, Bills Generated, Products in Stock, Top Seller)
 *   - Count-up animation on card values
 *   - Sales charts (bar chart + pie chart) via SalesChart component
 *   - Recent bills table showing last 5 transactions
 *   - All data fetched from Firestore in real-time
 */

import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { motion } from "framer-motion";
import { format } from "date-fns";

// Icons for the summary cards
import {
  MdCurrencyRupee,
  MdReceipt,
  MdInventory,
  MdTrendingUp,
} from "react-icons/md";

// Import the charts component
import SalesChart from "./SalesChart";

/**
 * useCountUp — a custom hook that animates a number counting up from 0.
 * This creates the smooth counting effect on dashboard cards.
 */
function useCountUp(targetValue, duration = 1000) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    // If target hasn't changed, skip animation
    if (targetValue === previousValue.current) return;

    const startValue = previousValue.current;
    const startTime = performance.now();

    // Animation function that runs every frame
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out curve for smooth deceleration
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      const currentValue = Math.round(
        startValue + (targetValue - startValue) * easedProgress
      );
      setDisplayValue(currentValue);

      // Keep animating until complete
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    previousValue.current = targetValue;
  }, [targetValue, duration]);

  return displayValue;
}

function Dashboard() {
  // State for dashboard data
  const [todaySales, setTodaySales] = useState(0);
  const [totalBills, setTotalBills] = useState(0);
  const [productsInStock, setProductsInStock] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [topProduct, setTopProduct] = useState("—");
  const [recentBills, setRecentBills] = useState([]);
  const [allBills, setAllBills] = useState([]);
  const [products, setProducts] = useState([]);

  // Animated values for count-up effect
  const animatedSales = useCountUp(todaySales);
  const animatedBills = useCountUp(totalBills);
  const animatedStock = useCountUp(productsInStock);

  /**
   * useEffect — fetch all bills from Firestore in real-time.
   * onSnapshot listens for changes and updates automatically.
   */
  useEffect(() => {
    const billsRef = collection(db, "bills");
    const billsQuery = query(billsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(billsQuery, (snapshot) => {
      const billsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setAllBills(billsData);
      setTotalBills(billsData.length);

      // Get today's date (start of day) to filter today's sales
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = Timestamp.fromDate(today);

      // Calculate total sales for today
      const todayBills = billsData.filter((bill) => {
        const billDate = bill.createdAt?.toDate
          ? bill.createdAt.toDate()
          : new Date(bill.createdAt);
        return billDate >= today;
      });

      const todayTotal = todayBills.reduce(
        (sum, bill) => sum + (bill.grandTotal || 0),
        0
      );
      setTodaySales(Math.round(todayTotal));

      // Get last 5 bills for the recent bills table
      setRecentBills(billsData.slice(0, 5));

      // Find top selling product this month
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const monthBills = billsData.filter((bill) => {
        const billDate = bill.createdAt?.toDate
          ? bill.createdAt.toDate()
          : new Date(bill.createdAt);
        return billDate >= thisMonth;
      });

      // Count quantity sold per product
      const productCounts = {};
      monthBills.forEach((bill) => {
        if (bill.items) {
          bill.items.forEach((item) => {
            const name = item.productName || "Unknown";
            productCounts[name] = (productCounts[name] || 0) + (item.quantity || 0);
          });
        }
      });

      // Find the product with the highest total quantity
      let maxProduct = "—";
      let maxCount = 0;
      Object.entries(productCounts).forEach(([name, count]) => {
        if (count > maxCount) {
          maxCount = count;
          maxProduct = name;
        }
      });
      setTopProduct(maxProduct);
    });

    return () => unsubscribe();
  }, []);

  /**
   * useEffect — fetch products from Firestore to count stock.
   */
  useEffect(() => {
    const productsRef = collection(db, "products");

    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const productsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setProducts(productsData);
      setProductsInStock(productsData.length);

      // Count products with low stock (less than 10 bags)
      const lowStock = productsData.filter((p) => p.stock < 10).length;
      setLowStockCount(lowStock);
    });

    return () => unsubscribe();
  }, []);

  // Format a Firestore timestamp to a readable date string
  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, "dd/MM/yyyy");
  };

  // Animation variants for staggered card entry
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (index) => ({
      opacity: 1,
      y: 0,
      transition: { delay: index * 0.1, duration: 0.4, ease: "easeOut" },
    }),
  };

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1>Sri Narayana Traders — Business Overview</h1>
      </div>

      {/* 4 Summary Cards */}
      <div className="summary-cards">
        {/* Card 1: Total Sales Today */}
        <motion.div
          className="summary-card"
          custom={0}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <div className="card-icon">
            <MdCurrencyRupee />
          </div>
          <p className="card-label">Total Sales Today</p>
          <p className="card-value">₹{animatedSales.toLocaleString("en-IN")}</p>
        </motion.div>

        {/* Card 2: Total Bills Generated */}
        <motion.div
          className="summary-card"
          custom={1}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <div className="card-icon">
            <MdReceipt />
          </div>
          <p className="card-label">Bills Generated</p>
          <p className="card-value">{animatedBills}</p>
        </motion.div>

        {/* Card 3: Products in Stock */}
        <motion.div
          className="summary-card"
          custom={2}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <div className="card-icon">
            <MdInventory />
          </div>
          <p className="card-label">Products in Stock</p>
          <p className={`card-value ${lowStockCount > 0 ? "low-stock" : ""}`}>
            {animatedStock}
            {lowStockCount > 0 && (
              <span style={{ fontSize: "0.75rem", marginLeft: "8px" }}>
                ({lowStockCount} low)
              </span>
            )}
          </p>
        </motion.div>

        {/* Card 4: Top Selling Product */}
        <motion.div
          className="summary-card"
          custom={3}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
        >
          <div className="card-icon">
            <MdTrendingUp />
          </div>
          <p className="card-label">Top Seller (This Month)</p>
          <p className="card-value" style={{ fontSize: "1.1rem" }}>
            {topProduct}
          </p>
        </motion.div>
      </div>

      {/* Charts Section — bar chart and pie chart */}
      <SalesChart allBills={allBills} products={products} />

      {/* Recent Bills Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <h3 style={{ marginBottom: "16px" }}>Recent Bills</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total (₹)</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentBills.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "24px" }}>
                    No bills yet. Create your first bill from the Billing page!
                  </td>
                </tr>
              ) : (
                recentBills.map((bill) => (
                  <tr key={bill.id}>
                    <td style={{ fontWeight: 600 }}>{bill.billNumber}</td>
                    <td>{bill.customerName}</td>
                    <td>{bill.items?.length || 0} items</td>
                    <td>₹{(bill.grandTotal || 0).toLocaleString("en-IN")}</td>
                    <td>{formatDate(bill.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

export default Dashboard;
