/**
 * Billing.jsx
 * -----------
 * The CORE feature — smart billing system with 4 steps:
 *   1. Customer info (name, phone, date, auto bill#)
 *   2. Add items from product dropdown
 *   3. Auto-calculate subtotal, GST (28%), grand total
 *   4. Generate bill → save to Firestore, deduct stock, show receipt
 */

import React, { useState, useEffect } from "react";
import {
  collection, addDoc, doc, updateDoc,
  onSnapshot, getDocs, Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";
import { MdAdd, MdDelete, MdPrint, MdClose } from "react-icons/md";

const GST_RATE = 0.28;

function Billing() {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [billDate, setBillDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [billItems, setBillItems] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [generatedBill, setGeneratedBill] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch products from Firestore for the dropdown
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      setProducts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const subtotal = billItems.reduce((sum, item) => sum + item.subtotal, 0);
  const gst = Math.round(subtotal * GST_RATE);
  const grandTotal = subtotal + gst;

  // Generate bill number like SNT-2026-001
  const generateBillNumber = async () => {
    const snapshot = await getDocs(collection(db, "bills"));
    const count = snapshot.size + 1;
    const year = new Date().getFullYear();
    return `SNT-${year}-${String(count).padStart(3, "0")}`;
  };

  // Add selected product to bill items list
  const handleAddItem = () => {
    if (!selectedProductId) { toast.error("Please select a product"); return; }
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) { toast.error("Enter a valid quantity"); return; }
    if (qty > selectedProduct.stock) {
      toast.error(`Only ${selectedProduct.stock} bags in stock`); return;
    }

    const existIdx = billItems.findIndex((i) => i.productId === selectedProductId);
    if (existIdx >= 0) {
      const updated = [...billItems];
      const newQty = updated[existIdx].quantity + qty;
      if (newQty > selectedProduct.stock) {
        toast.error(`Only ${selectedProduct.stock} bags in stock`); return;
      }
      updated[existIdx].quantity = newQty;
      updated[existIdx].subtotal = newQty * updated[existIdx].pricePerBag;
      setBillItems(updated);
    } else {
      setBillItems([...billItems, {
        productId: selectedProductId,
        productName: selectedProduct.name,
        pricePerBag: selectedProduct.pricePerBag,
        quantity: qty,
        subtotal: qty * selectedProduct.pricePerBag,
      }]);
    }
    setSelectedProductId("");
    setQuantity("");
    toast.success("Item added");
  };

  // Remove an item from the bill
  const handleRemoveItem = (index) => {
    setBillItems(billItems.filter((_, i) => i !== index));
    toast.success("Item removed");
  };

  // Validate 10-digit Indian phone number
  const validatePhone = (p) => /^[6-9]\d{9}$/.test(p);

  // Generate bill: validate, save to Firestore, deduct stock, show receipt
  const handleGenerateBill = async () => {
    if (!customerName.trim()) { toast.error("Enter customer name"); return; }
    if (!validatePhone(phone)) { toast.error("Enter valid 10-digit phone"); return; }
    if (billItems.length === 0) { toast.error("Add at least one item"); return; }

    setIsGenerating(true);
    try {
      const billNumber = await generateBillNumber();
      const billData = {
        billNumber, customerName: customerName.trim(), phone: phone.trim(),
        items: billItems, subtotal, gst, grandTotal,
        date: billDate, createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, "bills"), billData);

      // Deduct stock for each sold item
      for (const item of billItems) {
        const product = products.find((p) => p.id === item.productId);
        if (product) {
          await updateDoc(doc(db, "products", item.productId), {
            stock: Math.max(0, product.stock - item.quantity),
          });
        }
      }

      // Keep a deep copy of items so clearing state doesn't remove them
      setGeneratedBill({ ...billData, items: billItems.map((it) => ({ ...it })) });
      setShowReceipt(true);
      toast.success("Bill generated! 🎉");
      setCustomerName(""); setPhone(""); setBillItems([]);
      setBillDate(format(new Date(), "yyyy-MM-dd"));
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to generate bill");
    } finally {
      setIsGenerating(false);
    }
  };

  // Print the generated bill in a new window with print-friendly HTML
  const handlePrint = () => {
    if (!generatedBill) return;

    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      toast.error("Unable to open print window. Please allow popups.");
      return;
    }

    const styles = `
      <style>
        body{font-family: Poppins, sans-serif; padding:20px; color:#111}
        h2{text-align:center;margin:0 0 8px}
        p{margin:4px 0}
        .receipt-table{width:100%;border-collapse:collapse;margin-top:12px}
        .receipt-table th,.receipt-table td{border:1px solid #ddd;padding:8px;text-align:left}
        .receipt-totals{margin-top:12px}
        .receipt-totals p{margin:6px 0}
        .grand{font-weight:700}
      </style>
    `;

    const itemsRows = generatedBill.items.map((item, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.productName}</td>
        <td>${item.quantity}</td>
        <td>₹${item.pricePerBag.toLocaleString("en-IN")}</td>
        <td>₹${item.subtotal.toLocaleString("en-IN")}</td>
      </tr>
    `).join("");

    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Bill ${generatedBill.billNumber}</title>
          ${styles}
        </head>
        <body>
          <h2>Sri Narayana Traders</h2>
          <p style="text-align:center">Main Road, Karnataka - 560001<br/>GSTIN: 29XXXXX1234X1ZX</p>
          <hr />
          <div>
            <div>Bill No: <strong>${generatedBill.billNumber}</strong></div>
            <div>Date: <strong>${format(new Date(generatedBill.date), "dd/MM/yyyy")}</strong></div>
            <div>Customer: <strong>${generatedBill.customerName}</strong></div>
            <div>Phone: <strong>${generatedBill.phone}</strong></div>
          </div>
          <table class="receipt-table">
            <thead>
              <tr><th>#</th><th>Product</th><th>Qty</th><th>Rate (₹)</th><th>Amount (₹)</th></tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          <div class="receipt-totals">
            <p>Subtotal: ₹${generatedBill.subtotal.toLocaleString("en-IN")}</p>
            <p>GST (28%): ₹${generatedBill.gst.toLocaleString("en-IN")}</p>
            <p class="grand">Grand Total: ₹${generatedBill.grandTotal.toLocaleString("en-IN")}</p>
          </div>
          <p style="text-align:center;margin-top:40px">Thank you for choosing Sri Narayana Traders!</p>
        </body>
      </html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  // Download a PDF version of the generated bill using jsPDF
  const handleDownloadPdf = () => {
    if (!generatedBill) return;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const leftMargin = 40;
    let y = 50;

    doc.setFontSize(18);
    doc.text("Sri Narayana Traders", leftMargin, y);
    doc.setFontSize(11);
    y += 24;
    doc.text("Main Road, Karnataka - 560001", leftMargin, y);
    y += 14;
    doc.text("GSTIN: 29XXXXX1234X1ZX", leftMargin, y);
    y += 28;

    doc.setFontSize(12);
    doc.text(`Bill No: ${generatedBill.billNumber}`, leftMargin, y);
    y += 16;
    doc.text(`Date: ${format(new Date(generatedBill.date), "dd/MM/yyyy")}`, leftMargin, y);
    y += 16;
    doc.text(`Customer: ${generatedBill.customerName}`, leftMargin, y);
    y += 16;
    doc.text(`Phone: ${generatedBill.phone}`, leftMargin, y);
    y += 24;

    doc.setFontSize(11);
    doc.text("#", leftMargin, y);
    doc.text("Product", leftMargin + 30, y);
    doc.text("Qty", leftMargin + 260, y);
    doc.text("Rate", leftMargin + 330, y);
    doc.text("Amount", leftMargin + 410, y);
    y += 14;
    doc.line(leftMargin, y, 555, y);
    y += 12;

    generatedBill.items.forEach((item, index) => {
      if (y > 740) {
        doc.addPage();
        y = 50;
      }
      doc.text(`${index + 1}`, leftMargin, y);
      doc.text(item.productName, leftMargin + 30, y);
      doc.text(`${item.quantity}`, leftMargin + 260, y);
      doc.text(`₹${item.pricePerBag.toLocaleString("en-IN")}`, leftMargin + 330, y);
      doc.text(`₹${item.subtotal.toLocaleString("en-IN")}`, leftMargin + 410, y);
      y += 16;
    });

    y += 18;
    doc.line(leftMargin, y, 555, y);
    y += 18;
    doc.text(`Subtotal: ₹${generatedBill.subtotal.toLocaleString("en-IN")}`, leftMargin, y);
    y += 16;
    doc.text(`GST (28%): ₹${generatedBill.gst.toLocaleString("en-IN")}`, leftMargin, y);
    y += 16;
    doc.setFontSize(12);
    doc.text(`Grand Total: ₹${generatedBill.grandTotal.toLocaleString("en-IN")}`, leftMargin, y);
    doc.save(`${generatedBill.billNumber}.pdf`);
  };

  return (
    <div>
      <div className="page-header"><h1>Create New Bill</h1></div>

      <motion.div className="card" initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }} style={{ maxWidth: "900px" }}>

        {/* STEP 1: Customer Info */}
        <h3 style={{ marginBottom: "16px", color: "var(--saffron-orange)" }}>
          Step 1 — Customer Information
        </h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="customer-name">Customer Name</label>
            <input id="customer-name" type="text" className="form-input"
              placeholder="e.g., Rajesh Kumar" value={customerName}
              onChange={(e) => setCustomerName(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="customer-phone">Phone Number</label>
            <input id="customer-phone" type="tel" className="form-input"
              placeholder="e.g., 9876543210" maxLength={10} value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="bill-date">Date</label>
            <input id="bill-date" type="date" className="form-input"
              value={billDate} onChange={(e) => setBillDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Bill Number</label>
            <input type="text" className="form-input" disabled
              value="Auto-generated (SNT-YYYY-NNN)"
              style={{ backgroundColor: "#f0f0f0", fontStyle: "italic" }} />
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid var(--border-color)", margin: "24px 0" }} />

        {/* STEP 2: Add Items */}
        <h3 style={{ marginBottom: "16px", color: "var(--saffron-orange)" }}>
          Step 2 — Add Items
        </h3>
        <div className="add-item-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="select-product">Select Product</label>
            <select id="select-product" className="form-select"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}>
              <option value="">— Choose a product —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ₹{p.pricePerBag}/bag ({p.stock} stock)
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="item-qty">Qty (bags)</label>
            <input id="item-qty" type="number" className="form-input"
              placeholder="e.g., 10" min="1" value={quantity}
              onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Price/Bag</label>
            <input type="text" className="form-input" disabled
              value={selectedProduct ? `₹${selectedProduct.pricePerBag}` : "—"}
              style={{ backgroundColor: "#f0f0f0" }} />
          </div>
          <div style={{ paddingTop: "24px" }}>
            <button className="btn btn-primary" onClick={handleAddItem}>
              <MdAdd /> Add
            </button>
          </div>
        </div>

        {/* Bill Items Table */}
        {billItems.length > 0 && (
          <div className="billing-items">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>Product</th><th>Qty</th>
                    <th>Price/Bag (₹)</th><th>Subtotal (₹)</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {billItems.map((item, i) => (
                    <motion.tr key={item.productId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}>
                      <td>{i + 1}</td>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.pricePerBag.toLocaleString("en-IN")}</td>
                      <td style={{ fontWeight: 600 }}>
                        ₹{item.subtotal.toLocaleString("en-IN")}
                      </td>
                      <td>
                        <button className="remove-item-btn"
                          onClick={() => handleRemoveItem(i)}>
                          <MdDelete />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* STEP 3: Auto-Calculated Totals */}
            <div className="totals-box">
              <h3 style={{ marginBottom: "12px", color: "var(--concrete-white)" }}>
                Step 3 — Bill Summary
              </h3>
              <div className="totals-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="totals-row">
                <span>GST (28%)</span>
                <span>₹{gst.toLocaleString("en-IN")}</span>
              </div>
              <div className="totals-row grand-total">
                <span>Grand Total</span>
                <span>₹{grandTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* STEP 4: Generate Button */}
            <div style={{ marginTop: "24px", textAlign: "right" }}>
              <button className="btn btn-success" onClick={handleGenerateBill}
                disabled={isGenerating}
                style={{ padding: "14px 32px", fontSize: "1rem" }}>
                {isGenerating ? "Generating..." : "✅ Generate Bill"}
              </button>
            </div>
          </div>
        )}

        {billItems.length === 0 && (
          <div className="empty-state">
            <p>Select a product and add items to start billing.</p>
          </div>
        )}
      </motion.div>

      {/* RECEIPT MODAL */}
      <AnimatePresence>
        {showReceipt && generatedBill && (
          <motion.div className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content modal-wide"
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <button className="modal-close" onClick={() => setShowReceipt(false)}>
                <MdClose />
              </button>
              <div className="receipt">
                <div className="receipt-header">
                  <h2>Sri Narayana Traders</h2>
                  <p className="receipt-address">Main Road, Karnataka - 560001</p>
                  <p className="receipt-gstin">GSTIN: 29XXXXX1234X1ZX</p>
                </div>
                <div className="receipt-info">
                  <div><span>Bill No: </span><strong>{generatedBill.billNumber}</strong></div>
                  <div><span>Date: </span><strong>{format(new Date(generatedBill.date), "dd/MM/yyyy")}</strong></div>
                  <div><span>Customer: </span><strong>{generatedBill.customerName}</strong></div>
                  <div><span>Phone: </span><strong>{generatedBill.phone}</strong></div>
                </div>
                <table className="receipt-table">
                  <thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Rate (₹)</th><th>Amount (₹)</th></tr></thead>
                  <tbody>
                    {generatedBill.items.map((item, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td><td>{item.productName}</td>
                        <td>{item.quantity}</td>
                        <td>{item.pricePerBag.toLocaleString("en-IN")}</td>
                        <td>{item.subtotal.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="receipt-totals">
                  <p>Subtotal: ₹{generatedBill.subtotal.toLocaleString("en-IN")}</p>
                  <p>GST (28%): ₹{generatedBill.gst.toLocaleString("en-IN")}</p>
                  <p className="receipt-grand-total">
                    Grand Total: ₹{generatedBill.grandTotal.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="receipt-footer">
                  <p>Thank you for choosing Sri Narayana Traders!</p>
                </div>
              </div>
                <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "24px" }}>
                <button className="btn btn-primary" onClick={handlePrint}>
                  <MdPrint /> Print Bill
                </button>
                <button className="btn btn-secondary" onClick={handleDownloadPdf}>
                  <MdPrint /> Download PDF
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Billing;
