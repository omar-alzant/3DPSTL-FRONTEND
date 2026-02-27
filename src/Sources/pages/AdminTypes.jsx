import React, { useState, useEffect, useCallback } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { useToast } from "../context/ToastProvider";

import AdminForm from "../components/AdminForm";
import PreviewAdminContent from "../components/PreviewAdminContent";

export default function AdminTypes() {
  const token = sessionStorage.getItem("token");

  /* ===================== STATE ===================== */
  const [materials, setMaterials] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    category_id: null,
    name: "",
    description: "",
    image: [],        // 👈 ALWAYS ARRAY
    isdisabled: false,
  });
  const { showToast } = useToast();

  const [validationErrors, setValidationErrors] = useState({});

  const adminTypesURL = `${process.env.REACT_APP_API_URL}/api/admin/products/type`;
  const adminCategoryURL = `${process.env.REACT_APP_API_URL}/api/category`;

  /* ===================== FETCH ===================== */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [typesRes, categoriesRes] = await Promise.all([
        fetch(adminTypesURL, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(adminCategoryURL, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const typesData = await typesRes.json();
      const categoriesData = await categoriesRes.json();

      setMaterials(Array.isArray(typesData) ? typesData : []);
      setCategories(
        Array.isArray(categoriesData)
          ? categoriesData.map((c) => ({
              label: c.name,
              value: c.id,
            }))
          : []
      );
    } catch (err) {
      showToast(`Fetch error: ${err}`, "danger")
    } finally {
      setLoading(false);
    }
  }, [token, adminTypesURL, adminCategoryURL]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, fetchData]);

  /* ===================== FORM HELPERS ===================== */
  const resetForm = () => {
    setEditingId(null);
    setForm({
      category_id: null,
      name: "",
      description: "",
      image: [],
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
      category_id: material.category_id,
      name: material.name || "",
      description: material.description || "",
      image: Array.isArray(material.image) ? material.image : [],
      isdisabled: material.isdisabled || false,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ===================== SUBMIT ===================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      category_id: form.category_id,
      name: form.name,
      description: form.description,
      image: form.image,        // 👈 ARRAY
      isdisabled: form.isdisabled,
    };

    try {
      const res = await fetch(
        editingId ? `${adminTypesURL}/${editingId}` : adminTypesURL,
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
      fetchData();
    } catch (err) {
      showToast(`Save error: ${err}`, "danger")
    } finally {
      setIsSaving(false);
      showToast("Adding Done.")
    }
  };

  /* ===================== FORM FIELDS ===================== */
  const adminTypesFields = [
    {
      controlId: "category_id",
      name: "category_id",
      label: "Category",
      type: "select",
      required: true,
      row: 1,
      colWidth: 4,
      options: categories,
    },
    {
      controlId: "name",
      name: "name",
      label: "Name",
      type: "text",
      required: true,
      row: 1,
      colWidth: 4,
    },
    {
      controlId: "imageUpload",
      name: "image",
      label: "📤 Insert Image",
      type: "multimage",
      maxImages: 5,
      row: 2,
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
      required: true,
      row: 3,
      colWidth: 6,
    },
  ];

  /* ===================== RENDER ===================== */
  return (
    <div className="material-container">
      <Form className="p-3 br-gray-l brr" onSubmit={handleSubmit}>
        <AdminForm
          fields={adminTypesFields}
          formData={form}
          onChange={handleInputChange}
          onCustomChange={handleDescriptionChange}
          validation={validationErrors}
        />

        <div className="mt-2">
        <div className="mt-3 d-flex gap-2">
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? <Spinner size="sm" /> : editingId ? "Save Changes" : "Add Type"}
          </Button>
          <Button variant="secondary" onClick={resetForm}>Cancel</Button>
        </div>
        </div>
      </Form>

      <hr />

      {loading ? (
        <p>⏳ Loading...</p>
      ) : (
        <div className="br-gray-l p-2 brr">
          <PreviewAdminContent
            materials={materials}
            editingId={editingId}
            startEditing={startEditing}
            deleteMaterial={() => {}}
            canDelete={false}
          />
        </div>
      )}
    </div>
  );
}
