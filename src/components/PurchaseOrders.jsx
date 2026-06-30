/**
 * PurchaseOrders.jsx
 * ------------------
 * Manage purchase orders from suppliers.
 * Features:
 *   - Create purchase orders with supplier, items, quantity, and status
 *   - View list of purchase orders
 *   - Accept / reject orders and update product stock
 *   - Real-time Firestore sync
 */

import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { MdAdd, MdEdit, MdCheckCircle, MdClose, MdCancel } from "react-icons/md";

function PurchaseOrders() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [orderItems, setOrderItems] = useState([]);
  const [quantity, setQuantity] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const suppliersUnsub = onSnapshot(collection(db, "suppliers"), (snapshot) => {
      setSuppliers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const productsUnsub = onSnapshot(collection(db, "products"), (snapshot) => {
      setProducts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const ordersUnsub = onSnapshot(collection(db, "purchaseOrders"), (snapshot) => {
      setOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      suppliersUnsub();
      productsUnsub();
      ordersUnsub();
    };
  }, []);

  const resetForm = () => {
    setSelectedSupplier("");
    setSelectedProduct("");
    setOrderItems([]);
    setQuantity("");
    setOrderNote("");
  };

  const handleAddItem = () => {
    if (!selectedProduct) { toast.error("Choose a product"); return; }
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) { toast.error("Enter valid quantity"); return; }

    const product = products.find((p) => p.id === selectedProduct);
    if (!product) { toast.error("Product not found"); return; }

    const existingIndex = orderItems.findIndex((item) => item.productId === selectedProduct);
    if (existingIndex !== -1) {
      const updated = [...orderItems];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].subtotal = updated[existingIndex].quantity * updated[existingIndex].pricePerBag;
      setOrderItems(updated);
    } else {
      setOrderItems([...orderItems, {
        productId: product.id,
        productName: product.name,
        pricePerBag: product.pricePerBag,
        quantity: qty,
        subtotal: qty * product.pricePerBag,
      }]);
    }

    setSelectedProduct("");
    setQuantity("");
  };

  const handleRemoveItem = (productId) => {
    setOrderItems(orderItems.filter((item) => item.productId !== productId));
  };

  const handleCreateOrder = async () => {
    if (!selectedSupplier) { toast.error("Choose a supplier"); return; }
    if (orderItems.length === 0) { toast.error("Add at least one item"); return; }

    setIsCreating(true);
    try {
      await addDoc(collection(db, "purchaseOrders"), {
        supplierId: selectedSupplier,
        supplierName: suppliers.find((s) => s.id === selectedSupplier)?.name || "Unknown",
        items: orderItems,
        note: orderNote.trim(),
        status: "Pending",
        createdAt: new Date(),
      });
      toast.success("Purchase order created");
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error("Failed to create order:", error);
      toast.error("Could not create purchase order");
    } finally {
      setIsCreating(false);
    }
  };

  const handleAcceptOrder = async (order) => {
    if (order.status !== "Pending") return;

    try {
      for (const item of order.items) {
        const productRef = doc(db, "products", item.productId);
        const productDoc = await getDocs(collection(db, "products"));
        const current = products.find((p) => p.id === item.productId);
        if (current) {
          await updateDoc(productRef, {
            stock: (current.stock || 0) + item.quantity,
          });
        }
      }
      await updateDoc(doc(db, "purchaseOrders", order.id), { status: "Received", receivedAt: new Date() });
      toast.success("Order received and stock updated");
    } catch (error) {
      console.error("Failed to accept order:", error);
      toast.error("Could not accept purchase order");
    }
  };

  const handleRejectOrder = async (order) => {
    if (order.status !== "Pending") return;
    try {
      await updateDoc(doc(db, "purchaseOrders", order.id), { status: "Cancelled", cancelledAt: new Date() });
      toast.success("Order cancelled");
    } catch (error) {
      console.error("Failed to cancel order:", error);
      toast.error("Could not cancel purchase order");
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Purchase Orders</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <MdAdd /> {showForm ? "Hide Form" : "Create Order"}
        </button>
      </div>

      {showForm && (
        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h3 style={{ marginBottom: "18px" }}>New Purchase Order</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Supplier</label>
              <select className="form-select" value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)}>
                <option value="">— Select supplier —</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Product</label>
              <select className="form-select" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                <option value="">— Select product —</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name} — ₹{product.pricePerBag}/bag</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Quantity</label>
              <input type="number" className="form-input" value={quantity} min="1" onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div style={{ display: "flex", alignItems: "end" }}>
              <button className="btn btn-success" onClick={handleAddItem}>
                Add Item
              </button>
            </div>
          </div>

          {orderItems.length > 0 && (
            <div className="table-container" style={{ marginTop: 16 }}>
              <table className="data-table">
                <thead>
                  <tr><th>Product</th><th>Qty</th><th>Rate</th><th>Subtotal</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => (
                    <tr key={item.productId}>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.pricePerBag.toLocaleString("en-IN")}</td>
                      <td>₹{item.subtotal.toLocaleString("en-IN")}</td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => handleRemoveItem(item.productId)}>
                          <MdClose /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="form-group" style={{ marginTop: 16 }}>
            <label>Order Note</label>
            <textarea className="form-input" rows="3" value={orderNote} onChange={(e) => setOrderNote(e.target.value)} placeholder="e.g. Request delivery in 2 days" />
          </div>

          <button className="btn btn-primary" onClick={handleCreateOrder} disabled={isCreating}>
            {isCreating ? "Creating..." : "Submit Purchase Order"}
          </button>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 24 }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Supplier</th>
                <th>Items</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "32px" }}>
                    No purchase orders yet.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 600 }}>{order.id.slice(0, 6).toUpperCase()}</td>
                    <td>{order.supplierName}</td>
                    <td>{order.items?.length || 0}</td>
                    <td style={{ fontWeight: 600 }}>{order.status}</td>
                    <td style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {order.status === "Pending" && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => handleAcceptOrder(order)}>
                            <MdCheckCircle /> Receive
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleRejectOrder(order)}>
                            <MdCancel /> Cancel
                          </button>
                        </>
                      )}
                      {order.status !== "Pending" && (
                        <span style={{ color: "#555", fontSize: "0.9rem" }}>No actions</span>
                      )}
                    </td>
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

export default PurchaseOrders;
