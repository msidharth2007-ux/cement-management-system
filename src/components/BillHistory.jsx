/**
 * BillHistory.jsx
 * ---------------
 * Displays all past bills in a searchable table.
 * Features:
 *   - Table with: Bill No, Customer, Phone, Items, Total, Date, View
 *   - Search bar to filter by customer name or bill number
 *   - Date range filter (start date → end date)
 *   - "View" button opens the full receipt in a modal
 *   - Real-time data from Firestore
 */

import React, { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { MdSearch, MdVisibility, MdClose, MdPrint } from "react-icons/md";

function BillHistory() {
  // All bills from Firestore
  const [bills, setBills] = useState([]);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Selected bill for viewing receipt
  const [selectedBill, setSelectedBill] = useState(null);

  // Fetch all bills from Firestore, ordered by newest first
  useEffect(() => {
    const billsQuery = query(
      collection(db, "bills"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(billsQuery, (snapshot) => {
      setBills(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Format a Firestore timestamp to DD/MM/YYYY
  const formatDate = (timestamp) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, "dd/MM/yyyy");
  };

  // Get a Date object from a Firestore timestamp
  const getDateObj = (timestamp) => {
    if (!timestamp) return null;
    return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  };

  // Filter bills based on search query and date range
  const filteredBills = bills.filter((bill) => {
    // Search filter: match customer name or bill number
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      bill.customerName?.toLowerCase().includes(query) ||
      bill.billNumber?.toLowerCase().includes(query);

    // Date range filter
    let matchesDate = true;
    const billDate = getDateObj(bill.createdAt);

    if (startDate && billDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      matchesDate = matchesDate && billDate >= start;
    }
    if (endDate && billDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = matchesDate && billDate <= end;
    }

    return matchesSearch && matchesDate;
  });

  return (
    <div>
      <div className="page-header">
        <h1>Bill History</h1>
      </div>

      {/* Search and Date Filters */}
      <div className="filter-bar">
        <div style={{ position: "relative", flex: "1", maxWidth: "320px" }}>
          <MdSearch style={{
            position: "absolute", left: "12px", top: "50%",
            transform: "translateY(-50%)", color: "#888", fontSize: "1.2rem",
          }} />
          <input
            type="text" className="form-input"
            placeholder="Search by name or bill no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "38px", maxWidth: "100%" }}
          />
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <label style={{ fontSize: "0.85rem", color: "#555" }}>From:</label>
          <input type="date" className="form-input" value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ maxWidth: "160px" }} />
          <label style={{ fontSize: "0.85rem", color: "#555" }}>To:</label>
          <input type="date" className="form-input" value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ maxWidth: "160px" }} />
        </div>
      </div>

      {/* Bills Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Items</th>
                <th>Total (₹)</th>
                <th>Date</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "32px" }}>
                    {bills.length === 0
                      ? "No bills yet. Create your first bill!"
                      : "No bills match your search."}
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr key={bill.id}>
                    <td style={{ fontWeight: 600 }}>{bill.billNumber}</td>
                    <td>{bill.customerName}</td>
                    <td>{bill.phone}</td>
                    <td>{bill.items?.length || 0} items</td>
                    <td>₹{(bill.grandTotal || 0).toLocaleString("en-IN")}</td>
                    <td>{formatDate(bill.createdAt)}</td>
                    <td>
                      <button className="btn btn-outline btn-sm"
                        onClick={() => setSelectedBill(bill)}>
                        <MdVisibility /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* View Receipt Modal */}
      <AnimatePresence>
        {selectedBill && (
          <motion.div className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content modal-wide"
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <button className="modal-close" onClick={() => setSelectedBill(null)}>
                <MdClose />
              </button>
              <div className="receipt">
                <div className="receipt-header">
                  <h2>Sri Narayana Traders</h2>
                  <p className="receipt-address">Main Road, Karnataka - 560001</p>
                  <p className="receipt-gstin">GSTIN: 29XXXXX1234X1ZX</p>
                </div>
                <div className="receipt-info">
                  <div><span>Bill No: </span><strong>{selectedBill.billNumber}</strong></div>
                  <div><span>Date: </span><strong>{selectedBill.date ? format(new Date(selectedBill.date), "dd/MM/yyyy") : formatDate(selectedBill.createdAt)}</strong></div>
                  <div><span>Customer: </span><strong>{selectedBill.customerName}</strong></div>
                  <div><span>Phone: </span><strong>{selectedBill.phone}</strong></div>
                </div>
                <table className="receipt-table">
                  <thead>
                    <tr><th>#</th><th>Product</th><th>Qty</th><th>Rate (₹)</th><th>Amount (₹)</th></tr>
                  </thead>
                  <tbody>
                    {selectedBill.items?.map((item, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{item.productName}</td>
                        <td>{item.quantity}</td>
                        <td>{item.pricePerBag?.toLocaleString("en-IN")}</td>
                        <td>{item.subtotal?.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="receipt-totals">
                  <p>Subtotal: ₹{(selectedBill.subtotal || 0).toLocaleString("en-IN")}</p>
                  <p>GST (28%): ₹{(selectedBill.gst || 0).toLocaleString("en-IN")}</p>
                  <p className="receipt-grand-total">
                    Grand Total: ₹{(selectedBill.grandTotal || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="receipt-footer">
                  <p>Thank you for choosing Sri Narayana Traders!</p>
                </div>
              </div>
              <div style={{ textAlign: "center", marginTop: "24px" }}>
                <button className="btn btn-primary" onClick={() => window.print()}>
                  <MdPrint /> Print Bill
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BillHistory;
