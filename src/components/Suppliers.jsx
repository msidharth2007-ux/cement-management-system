/**
 * Suppliers.jsx
 * -------------
 * Manage supplier/vendor data.
 * Features:
 *   - List suppliers with name, phone, email, location
 *   - Add / edit / delete supplier
 *   - Real-time Firestore sync
 */

import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { MdAdd, MdEdit, MdDelete, MdClose } from "react-icons/md";

function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "suppliers"), (snapshot) => {
      setSuppliers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const openAddModal = () => {
    setEditingSupplier(null);
    setName("");
    setPhone("");
    setEmail("");
    setLocation("");
    setShowModal(true);
  };

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setName(supplier.name || "");
    setPhone(supplier.phone || "");
    setEmail(supplier.email || "");
    setLocation(supplier.location || "");
    setShowModal(true);
  };

  const validatePhone = (value) => /^[6-9]\d{9}$/.test(value);
  const validateEmail = (value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Enter supplier name");
      return;
    }
    if (!validatePhone(phone)) {
      toast.error("Enter valid 10-digit phone");
      return;
    }
    if (email && !validateEmail(email)) {
      toast.error("Enter valid email");
      return;
    }
    if (!location.trim()) {
      toast.error("Enter supplier location");
      return;
    }

    setIsSaving(true);
    const supplierData = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      location: location.trim(),
      updatedAt: new Date(),
    };

    try {
      if (editingSupplier) {
        await updateDoc(doc(db, "suppliers", editingSupplier.id), supplierData);
        toast.success("Supplier updated");
      } else {
        supplierData.createdAt = new Date();
        await addDoc(collection(db, "suppliers"), supplierData);
        toast.success("Supplier added");
      }
      setShowModal(false);
    } catch (error) {
      console.error("Failed to save supplier:", error);
      toast.error("Could not save supplier");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (supplier) => {
    const confirmed = window.confirm(`Delete supplier ${supplier.name}?`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "suppliers", supplier.id));
      toast.success("Supplier deleted");
    } catch (error) {
      console.error("Failed to delete supplier:", error);
      toast.error("Could not delete supplier");
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Supplier Management</h1>
        <button className="btn btn-primary" onClick={openAddModal}>
          <MdAdd /> Add Supplier
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "32px" }}>
                    No suppliers yet. Add one to start tracking purchase orders.
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td style={{ fontWeight: 500 }}>{supplier.name}</td>
                    <td>{supplier.phone}</td>
                    <td>{supplier.email || "—"}</td>
                    <td>{supplier.location}</td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEditModal(supplier)}>
                          <MdEdit /> Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(supplier)}>
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

      <AnimatePresence>
        {showModal && (
          <motion.div className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div className="modal-header">
                <h2>{editingSupplier ? "Edit Supplier" : "Add Supplier"}</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>
                  <MdClose />
                </button>
              </div>

              <div className="form-group">
                <label htmlFor="supplier-name">Supplier Name</label>
                <input id="supplier-name" type="text" className="form-input" value={name}
                  onChange={(e) => setName(e.target.value)} placeholder="e.g. ABC Cement Traders" />
              </div>
              <div className="form-group">
                <label htmlFor="supplier-phone">Phone Number</label>
                <input id="supplier-phone" type="tel" className="form-input" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 9876543210" maxLength={10} />
              </div>
              <div className="form-group">
                <label htmlFor="supplier-email">Email (optional)</label>
                <input id="supplier-email" type="email" className="form-input" value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="e.g. abc@example.com" />
              </div>
              <div className="form-group">
                <label htmlFor="supplier-location">Location</label>
                <input id="supplier-location" type="text" className="form-input" value={location}
                  onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bengaluru" />
              </div>

              <button className="btn btn-primary" onClick={handleSave} disabled={isSaving} style={{ width: "100%", marginTop: 16 }}>
                {isSaving ? "Saving..." : editingSupplier ? "Update Supplier" : "Add Supplier"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Suppliers;
