import React, { useState, useEffect, useCallback } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { useToast } from "../context/ToastProvider";

import AdminForm from "../components/AdminForm";
import PreviewAdminContent from "../components/PreviewAdminContent";

export default function AdminBrands() {
  /* ===================== AUTH ===================== */
  const token = sessionStorage.getItem("token");
  const { showToast } = useToast();

  /* ===================== STATE ===================== */
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    galleryurls: [],   // 👈 ALWAYS ARRAY
    isdisabled: false, // 👈 match backend name
  });

  const [validationErrors, setValidationErrors] = useState({});

  /* ===================== PAGINATION ===================== */
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalItems, setTotalItems] = useState(0);
  // البحث على الخادم (في كل العلامات) بعد توقّف الكتابة بقليل، مع العودة للصفحة 1
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const adminMarketURL = `${process.env.REACT_APP_API_URL}/api/admin/products/market`;

  /* ===================== FETCH ===================== */
  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${adminMarketURL}?page=${page}&pageSize=${pageSize}${query ? `&q=${encodeURIComponent(query)}` : ""}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const total = json.total || 0;
      // إن أصبحت الصفحة فارغة نرجع للصفحة الأخيرة المتاحة
      if (page > 1 && (page - 1) * pageSize >= total) {
        setPage(Math.max(1, Math.ceil(total / pageSize)));
        return;
      }
      setMaterials(json.items || []);
      setTotalItems(total);
    } catch (err) {
      showToast(`Failed to fetch brands: ${err}`, "danger");

    } finally {
      setLoading(false);
    }
  }, [token, page, pageSize, adminMarketURL, query]);

  useEffect(() => {
    if (token) fetchBrands();
  }, [token, fetchBrands]);

  /* ===================== FORM HELPERS ===================== */
  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      description: "",
      galleryurls: [],
      isdisabled: false,
    });
  };

  const handleInputChange = (name, value) => {
    setForm((prev) => {
      if (JSON.stringify(prev[name]) === JSON.stringify(value)) {
        return prev;
      }
      return { ...prev, [name]: value };
    });
      if (validationErrors[name] === false) {
      setValidationErrors((prev) => ({ ...prev, [name]: true }));
    }
  };

  const handleDescriptionChange = (html) => {
    setForm((prev) => ({ ...prev, description: html }));
  };

  /* ===================== EDIT ===================== */
  const startEditing = (material) => {
    setEditingId(material.id);

    setForm({
      name: material.name || "",
      description: material.description || "",
      isdisabled: material.isdisabled || false,
      galleryurls: Array.isArray(material.image) ? material.image : [],
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ===================== SUBMIT ===================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      name: form.name,
      description: form.description,
      image: form.galleryurls, // 👈 ARRAY REQUIRED
      isdisabled: form.isdisabled,
    };

    try {
      const res = await fetch(
        editingId ? `${adminMarketURL}/${editingId}` : adminMarketURL,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) showToast("Save failed", "danger");

      resetForm();
      fetchBrands();
    } catch (err) {
      showToast(`Save failed: ${err}`, "danger");

    } finally {
      setIsSaving(false);
      showToast("Adding Done.");

    }
  };

  /* ===================== DELETE ===================== */
  const deleteMaterial = async (id) => {
    if (!window.confirm("Delete this brand?")) return;

    try {
      await fetch(`${adminMarketURL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchBrands();
    } catch (err) {
      showToast(`Delete failed: ${err}`, "danger");
    }
    finally{
      showToast(`Deletion Done.`);

    }
  };

  /* ===================== FORM FIELDS ===================== */
  const adminMarketFields = [
    {
      controlId: "name",
      name: "name",
      label: "Name",
      type: "text",
      placeholder: "Brand name",
      row: 1,
      colWidth: 4,
      required: true,
    },
    {
      controlId: "imageUpload",
      name: "galleryurls",
      label: "📤 Insert Image",
      type: "multimage",
      maxImages: 5,
      row: 1,
      colWidth: 4,
    },
    {
      controlId: "isdisabled",
      name: "isdisabled",
      label: "Disable",
      type: "checkbox",
      row: 1,
      colWidth: 4,
    },
    {
      controlId: "description",
      name: "description",
      label: "Description",
      type: "Editor",
      placeholder: "Write description...",
      row: 2,
      colWidth: 6,
      required: true,
    },
  ];

  /* ===================== RENDER ===================== */
  return (
    <div className="material-container">
      <Form className="p-3 br-gray-l brr" onSubmit={handleSubmit}>
        <AdminForm
          fields={adminMarketFields}
          formData={form}
          onChange={handleInputChange}
          onCustomChange={handleDescriptionChange}
          validation={validationErrors}
        />

        <div className="mt-2">
        <div className="mt-3 d-flex gap-2">
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? <Spinner size="sm" /> : editingId ? "Save Changes" : "Add Brand"}
          </Button>
          <Button variant="secondary" onClick={resetForm}>Cancel</Button>
        </div>
        </div>
      </Form>

      <hr />

      {(
        <div className="br-gray-l p-2 brr">
          <PreviewAdminContent
            materials={loading ? [] : materials}
            loading={loading}
            search={search}
            onSearch={setSearch}
            editingId={editingId}
            startEditing={startEditing}
            deleteMaterial={deleteMaterial}
            canDelete={false}
          />

          <div className="d-flex justify-content-between  align-items-center mt-3">
            <small className="text-light">
              Page {page} of {Math.max(1, Math.ceil(totalItems / pageSize))} • {query ? "Results" : "Total brands"}: {totalItems}
            </small>

            <div className="d-flex gap-2">
              <Button
                size="sm"
                variant="outline-primary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>

              <Button
                size="sm"
                variant="outline-primary"
                disabled={page * pageSize >= totalItems || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
