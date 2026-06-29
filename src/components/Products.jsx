/**
 * Products.jsx
 * ------------
 * Manages the cement products inventory.
 * Features:
 *   - Table listing all products (name, brand, price, stock)
 *   - "Add Product" button opens a slide-in modal form
 *   - Edit and Delete buttons per row
 *   - Low stock rows highlighted in red
 *   - Real-time data from Firestore (onSnapshot)
 */

import React, { useState, useEffect } from "react";
import {
  collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { MdAdd, MdEdit, MdDelete, MdClose } from "react-icons/md";

// List of popular cement brands in India
const BRANDS = ["Ultratech", "ACC", "Ambuja", "Ramco", "Dalmia", "Birla", "Shree", "Other"];

function Products() {
  // Products list from Firestore
  const [products, setProducts] = useState([]);

  // Modal visibility and mode (add or edit)
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form fields for the product modal
  const [formName, setFormName] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formStock, setFormStock] = useState("");

  // Loading state while saving
  const [isSaving, setIsSaving] = useState(false);

  // Fetch products from Firestore in real-time
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts(data);
    });
    return () => unsubscribe();
  }, []);

  // Open modal for adding a new product
  const openAddModal = () => {
    setEditingProduct(null);
    setFormName(""); setFormBrand(""); setFormPrice(""); setFormStock("");
    setShowModal(true);
  };

  // Open modal for editing an existing product
  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormBrand(product.brand);
    setFormPrice(String(product.pricePerBag));
    setFormStock(String(product.stock));
    setShowModal(true);
  };

  // Save product (add new or update existing)
  const handleSave = async () => {
    if (!formName.trim()) { toast.error("Enter product name"); return; }
    if (!formBrand) { toast.error("Select a brand"); return; }
    if (!formPrice || Number(formPrice) <= 0) { toast.error("Enter valid price"); return; }
    if (!formStock || Number(formStock) < 0) { toast.error("Enter valid stock"); return; }

    setIsSaving(true);
    try {
      const productData = {
        name: formName.trim(),
        brand: formBrand,
        pricePerBag: Number(formPrice),
        stock: Number(formStock),
      };

      if (editingProduct) {
        // Update existing product
        await updateDoc(doc(db, "products", editingProduct.id), productData);
        toast.success("Product updated!");
      } else {
        // Add new product
        productData.createdAt = Timestamp.now();
        await addDoc(collection(db, "products"), productData);
        toast.success("Product added!");
      }
      setShowModal(false);
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete a product after confirmation
  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `Delete "${product.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "products", product.id));
      toast.success("Product deleted");
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  return (
    <div>
      {/* Page Header with Add button */}
      <div className="page-header">
        <h1>Products Inventory</h1>
        <button className="btn btn-primary" onClick={openAddModal}>
          <MdAdd /> Add Product
        </button>
      </div>

      {/* Products Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Brand</th>
                <th>Price/Bag (₹)</th>
                <th>Stock (bags)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "32px" }}>
                    No products yet. Click "Add Product" to get started!
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id}>
                    <td style={{ fontWeight: 500 }}>{product.name}</td>
                    <td>{product.brand}</td>
                    <td>₹{product.pricePerBag?.toLocaleString("en-IN")}</td>
                    <td>
                      <span className={product.stock < 10 ? "low-stock" : ""}
                        style={{ fontWeight: product.stock < 10 ? 700 : 400 }}>
                        {product.stock}
                        {product.stock < 10 && " ⚠️ Low"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button className="btn btn-outline btn-sm"
                          onClick={() => openEditModal(product)}>
                          <MdEdit /> Edit
                        </button>
                        <button className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(product)}>
                          <MdDelete />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add/Edit Product Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}>
              <div className="modal-header">
                <h2>{editingProduct ? "Edit Product" : "Add New Product"}</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>
                  <MdClose />
                </button>
              </div>

              {/* Product Name */}
              <div className="form-group">
                <label htmlFor="prod-name">Product Name</label>
                <input id="prod-name" type="text" className="form-input"
                  placeholder="e.g., Ultratech PPC 50kg" value={formName}
                  onChange={(e) => setFormName(e.target.value)} />
              </div>

              {/* Brand Dropdown */}
              <div className="form-group">
                <label htmlFor="prod-brand">Brand</label>
                <select id="prod-brand" className="form-select" value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}>
                  <option value="">— Select Brand —</option>
                  {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* Price per bag */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="prod-price">Price per 50kg Bag (₹)</label>
                  <input id="prod-price" type="number" className="form-input"
                    placeholder="e.g., 380" min="1" value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="prod-stock">Stock Quantity (bags)</label>
                  <input id="prod-stock" type="number" className="form-input"
                    placeholder="e.g., 150" min="0" value={formStock}
                    onChange={(e) => setFormStock(e.target.value)} />
                </div>
              </div>

              {/* Save Button */}
              <div style={{ marginTop: "8px" }}>
                <button className="btn btn-primary" onClick={handleSave}
                  disabled={isSaving} style={{ width: "100%", padding: "12px" }}>
                  {isSaving ? "Saving..." : editingProduct ? "Update Product" : "Add Product"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Products;
