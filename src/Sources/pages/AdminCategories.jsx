import React, { useEffect, useState, useCallback } from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";

import AdminForm from "../components/AdminForm";
import PreviewAdminContent from "../components/PreviewAdminContent";
import { useToast } from "../context/ToastProvider";
import { PageLoader } from '../components/BrandSpinner';
import { useLang } from '../i18n/LanguageContext';

export default function AdminCategories() {
  const { tx } = useLang();
  /* ===================== STATE ===================== */
  const token = localStorage.getItem('token');

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: "",
    galleryurls: null,
    sort_order: 0,
    isdisabled: false,
    description: "",
  });
  

  const [validationErrors, setValidationErrors] = useState({});

  const adminCatalogURL = `${process.env.REACT_APP_API_URL}/api/category`;

  /* ===================== FETCH ===================== */
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(adminCatalogURL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(`${tx('Fetch categories failed', 'فشل تحميل الفئات')}: ${err}`, "danger")
    } finally {
      setLoading(false);
    }
  }, [adminCatalogURL, token]);

  useEffect(() => {
    if (token) fetchCategories();
  }, [token, fetchCategories]);

  /* ===================== FORM HELPERS ===================== */
  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      galleryurls: null,
      sort_order: categories.length + 1,
      isdisabled: false,
      description: "",
    });
    setValidationErrors({});
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
  const startEditing = (category) => {
    setEditingId(category.id);
    setForm({
      name: category.name || "",
      galleryurls: category.galleryurls || [],
      sort_order: category.sort_order ?? 0,
      isdisabled: category.isdisabled ?? false,
      description: category.description || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ===================== SUBMIT ===================== */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      name: form.name,
      galleryurls: form.galleryurls,
      sort_order: form.sort_order,
      isdisabled: form.isdisabled,
      description: form.description,
    };

    try {
      if (editingId) {
        await fetch(`${adminCatalogURL}/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(adminCatalogURL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      resetForm();
      fetchCategories();
    } catch (err) {
      showToast(`${tx('Save category failed', 'فشل حفظ الفئة')}: ${err}`, "danger")
    } finally {
      setIsSaving(false);
      showToast(tx('adding Done.', 'تمت الإضافة.'))
    }
  };

  /* ===================== DELETE ===================== */
  const deleteCategory = async (id) => {
    if (!window.confirm(tx('Delete this category?', 'حذف هذه الفئة؟'))) return;

    try {
      await fetch(`${adminCatalogURL}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchCategories();
    } catch (err) {
      showToast(`${tx('Delete category failed', 'فشل حذف الفئة')}: ${err}`, "danger")
    }
    finally{
      showToast(tx('Deleting Done.', 'تم الحذف.'))
    }
  };

  /* ===================== FORM FIELDS ===================== */
  const adminCatalogFields = [
    {
      controlId: "name",
      name: "name",
      label: tx('Name', 'الاسم'),
      type: "text",
      required: true,
      row: 1,
      colWidth: 4,
    },
    {
      controlId: "sort_order",
      name: "sort_order",
      label: tx('Sort Order', 'الترتيب'),
      type: "number",
      row: 1,
      colWidth: 4,
      readOnly: true,
    },
    {
      controlId: "galleryurls",
      name: "galleryurls",
      label: tx('📤 Banner Images', '📤 صور البانر'),
      type: "multimage",
      row: 2,
      colWidth: 8,
    },
    {
      controlId: "isdisabled",
      name: "isdisabled",
      label: tx('Disable', 'تعطيل'),
      type: "checkbox",
      row: 3,
      colWidth: 4,
    },
    {
      controlId: "description",
      name: "description",
      label: tx('Description', 'الوصف'),
      type: "Editor",
      row: 4,
      colWidth: 12,
    },
  ];

  /* ===================== RENDER ===================== */
  return (
    <div className="material-container">
      <Form className="p-3 br-gray-l brr" onSubmit={handleSubmit}>
        <AdminForm
          fields={adminCatalogFields}
          formData={form}
          onChange={handleInputChange}
          onCustomChange={handleDescriptionChange}
          validation={validationErrors}
        />

        <div className="mt-2">
        <div className="mt-3 d-flex gap-2">
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? <Spinner size="sm" /> : editingId ? tx('Save Changes', 'حفظ التعديلات') : tx('Add Category', 'إضافة فئة')}
          </Button>
          <Button variant="secondary" onClick={resetForm}>{tx('Cancel', 'إلغاء')}</Button>
        </div>
        </div>
      </Form>

      <hr />

      {loading ? (
        <PageLoader />
      ) : (
        <div className="br-gray-l p-2 brr">
          <PreviewAdminContent
            materials={categories}
            editingId={editingId}
            startEditing={startEditing}
            deleteMaterial={deleteCategory}
            canDelete={true}
          />
        </div>
      )}
    </div>
  );
}
