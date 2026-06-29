/**
 * SalesChart.jsx
 * --------------
 * Displays visual charts on the Dashboard page:
 *   1. Bar Chart — total sales for the last 7 days
 *   2. Pie Chart — product-wise sales distribution
 * Uses the Recharts library for rendering charts.
 * Receives bills and products data as props from Dashboard.
 */

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { motion } from "framer-motion";

// Colors for the pie chart slices
const PIE_COLORS = [
  "#FF6B00", // saffron orange
  "#2C2C2C", // warm grey
  "#28A745", // green
  "#E8E0D0", // dusty beige
  "#DC3545", // red
  "#6C757D", // grey
  "#17A2B8", // teal
  "#FFC107", // yellow
];

/**
 * SalesChart — renders bar and pie charts for the dashboard.
 * Props:
 *   - allBills: array of all bill documents from Firestore
 *   - products: array of all product documents
 */
function SalesChart({ allBills, products }) {
  /**
   * useMemo calculates the bar chart data only when allBills changes.
   * It groups sales by day for the last 7 days.
   */
  const barChartData = useMemo(() => {
    const data = [];

    // Loop through the last 7 days (from 6 days ago to today)
    for (let i = 6; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const nextDay = startOfDay(subDays(new Date(), i - 1));

      // Filter bills that fall on this day
      const dayBills = allBills.filter((bill) => {
        const billDate = bill.createdAt?.toDate
          ? bill.createdAt.toDate()
          : new Date(bill.createdAt);
        return billDate >= day && billDate < nextDay;
      });

      // Sum up the grand totals for this day
      const dayTotal = dayBills.reduce(
        (sum, bill) => sum + (bill.grandTotal || 0),
        0
      );

      data.push({
        day: format(day, "dd MMM"), // e.g., "12 Jun"
        sales: Math.round(dayTotal),
      });
    }

    return data;
  }, [allBills]);

  /**
   * useMemo calculates the pie chart data only when allBills changes.
   * It groups total sales amount by product name.
   */
  const pieChartData = useMemo(() => {
    const productSales = {};

    // Go through all bills and their items
    allBills.forEach((bill) => {
      if (bill.items) {
        bill.items.forEach((item) => {
          const name = item.productName || "Unknown";
          const amount = item.subtotal || item.quantity * item.pricePerBag || 0;
          productSales[name] = (productSales[name] || 0) + amount;
        });
      }
    });

    // Convert the object to an array for Recharts
    return Object.entries(productSales).map(([name, value]) => ({
      name: name.length > 20 ? name.substring(0, 20) + "…" : name,
      value: Math.round(value),
    }));
  }, [allBills]);

  // Custom tooltip for bar chart — shows formatted rupee amount
  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: "#2C2C2C",
            color: "#F5F5F0",
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            fontFamily: "Poppins",
          }}
        >
          <p style={{ fontWeight: 600 }}>{label}</p>
          <p>₹{payload[0].value.toLocaleString("en-IN")}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="charts-grid">
      {/* Bar Chart — Sales for Last 7 Days */}
      <motion.div
        className="chart-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <h3>Sales — Last 7 Days</h3>
        {barChartData.every((d) => d.sales === 0) ? (
          <div className="empty-state">
            <p>No sales data yet. Start billing to see the chart!</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "#555" }}
                axisLine={{ stroke: "#D5CFC2" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#555" }}
                axisLine={{ stroke: "#D5CFC2" }}
                tickFormatter={(value) => `₹${value}`}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar
                dataKey="sales"
                fill="#FF6B00"
                radius={[6, 6, 0, 0]}
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Pie Chart — Product-wise Sales Distribution */}
      <motion.div
        className="chart-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <h3>Product-wise Sales</h3>
        {pieChartData.length === 0 ? (
          <div className="empty-state">
            <p>No product sales data yet.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
                labelLine={{ stroke: "#888", strokeWidth: 1 }}
              >
                {pieChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `₹${value.toLocaleString("en-IN")}`}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </div>
  );
}

export default SalesChart;
