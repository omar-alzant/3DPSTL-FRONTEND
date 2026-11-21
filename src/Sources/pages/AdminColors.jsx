import React, { useState, useEffect } from "react";
import { Form, Button, Spinner, Container, Table } from "react-bootstrap";
import { useToast } from "../context/ToastProvider";
import { useLang } from '../i18n/LanguageContext';

export default function AdminColors() {
  const { tx } = useLang();

  const token = localStorage.getItem('token');
  const { showToast } = useToast();

  const colorsURL =
    `${process.env.REACT_APP_API_URL}/api/admin/filament/colors`;

  const metaURL =
    `${process.env.REACT_APP_API_URL}/api/admin/filament/colors/meta`;

  const [colors, setColors] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [metadata, setMetadata] = useState({
    materials: [],
    brands: []
  });

  const [form, setForm] = useState({
    name: "",
    hex: "#ffffff",
    material_id: "",
    brand_id: "",
    stock: 0,
    active: true
  });

  /* ---------------- FETCH COLORS ---------------- */

  const fetchColors = async () => {

    setLoading(true);

    try {

      const res = await fetch(colorsURL, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      setColors(data || []);

    } catch {

      showToast(tx('Failed loading colors', 'فشل تحميل الألوان'), "danger");

    } finally {

      setLoading(false);

    }

  };

  /* ---------------- FETCH METADATA ---------------- */

  const fetchMeta = async () => {

    try {

      const res = await fetch(metaURL, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      setMetadata({
        materials: data.materials || [],
        brands: data.brands || []
      });

    } catch {

      showToast(tx('Failed loading metadata', 'فشل تحميل البيانات'), "danger");

    }

  };

  useEffect(() => {

    if (token) {
      fetchColors();
      fetchMeta();
    }

  }, [token]);

  /* ---------------- FORM ---------------- */

  const handleChange = (name, value) => {

    setForm(prev => ({
      ...prev,
      [name]: value
    }));

  };

  const resetForm = () => {

    setEditingId(null);

    setForm({
      name: "",
      hex: "#ffffff",
      material_id: "",
      brand_id: "",
      stock: 0,
      active: true
    });

  };

  /* ---------------- SAVE ---------------- */

  const handleSubmit = async (e) => {

    e.preventDefault();

    setIsSaving(true);

    try {

      const res = await fetch(
        editingId ? `${colorsURL}/${editingId}` : colorsURL,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(form)
        }
      );

      if (!res.ok) throw new Error();

      showToast(editingId ? tx('Color updated', 'تم تحديث اللون') : tx('Color added', 'تمت إضافة اللون'));

      resetForm();
      fetchColors();

    } catch {

      showToast(tx('Save failed', 'فشل الحفظ'), "danger");

    } finally {

      setIsSaving(false);

    }

  };

  /* ---------------- EDIT ---------------- */

  const startEditing = (color) => {

    setEditingId(color.id);

    setForm({
      name: color.name,
      hex: color.hex,
      material_id: color.material_id || "",
      brand_id: color.brand_id || "",
      stock: color.stock || 0,
      active: color.active
    });

    window.scrollTo({ top: 0, behavior: "smooth" });

  };

  /* ---------------- DELETE ---------------- */

  const deleteColor = async (id) => {

    if (!window.confirm(tx('Delete this color?', 'حذف هذا اللون؟'))) return;

    try {

      await fetch(`${colorsURL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      setColors(colors.filter(c => c.id !== id));

      showToast(tx('Deleted', 'تم الحذف'));

    } catch {

      showToast(tx('Delete error', 'خطأ في الحذف'), "danger");

    }

  };

  return (

    <Container className="admin-surface">

      <Form className="p-4 border rounded mb-5" onSubmit={handleSubmit}>

        <Form.Group className="mb-3">
          <Form.Label>{tx('Color Name', 'اسم اللون')}</Form.Label>
          <Form.Control
            value={form.name}
            onChange={e => handleChange("name", e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>{tx('Color', 'اللون')}</Form.Label>
          <Form.Control
            type="color"
            value={form.hex}
            onChange={e => handleChange("hex", e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>{tx('Material', 'المادة')}</Form.Label>

          <Form.Select
            value={form.material_id}
            onChange={e => handleChange("material_id", e.target.value)}
          >

            <option value="">{tx('Select Material', 'اختر المادة')}</option>

            {metadata.materials.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}

          </Form.Select>

        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>{tx('Brand', 'الماركة')}</Form.Label>

          <Form.Select
            value={form.brand_id}
            onChange={e => handleChange("brand_id", e.target.value)}
          >

            <option value="">{tx('Select Brand', 'اختر الماركة')}</option>

            {metadata.brands.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}

          </Form.Select>

        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>{tx('Stock', 'المخزون')}</Form.Label>
          <Form.Control
            type="number"
            value={form.stock}
            onChange={e => handleChange("stock", e.target.value)}
          />
        </Form.Group>

        <Button type="submit" disabled={isSaving}>
          {isSaving
            ? <Spinner size="sm" />
            : editingId
              ? tx('Save Changes', 'حفظ التعديلات')
              : tx('Add Color', 'إضافة لون')}
        </Button>

        <Button
          variant="secondary"
          className="ms-2"
          onClick={resetForm}
        >
          {tx('Cancel', 'إلغاء')}
        </Button>

      </Form>

      {/* COLORS TABLE */}

      {loading ? (
        <Spinner />
      ) : (

        <Table striped bordered>

          <thead>
            <tr>
              <th>{tx('Preview', 'معاينة')}</th>
              <th>{tx('Name', 'الاسم')}</th>
              <th>{tx('Material', 'المادة')}</th>
              <th>{tx('Brand', 'الماركة')}</th>
              <th>{tx('Stock', 'المخزون')}</th>
              <th>{tx('Actions', 'إجراءات')}</th>
            </tr>
          </thead>

          <tbody>

            {Array.isArray(colors) && colors.map(color => (

              <tr key={color.id}>

                <td>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      background: color.hex,
                      borderRadius: 4,
                      border: "1px solid #ccc"
                    }}
                  />
                </td>

                <td>{color.name}</td>

                <td>{color.filament_materials?.name}</td>

                <td>{color.filament_brands?.name}</td>

                <td>{color.stock}</td>

                <td>

                  <Button
                    size="sm"
                    variant="warning"
                    onClick={() => startEditing(color)}
                  >
                    {tx('Edit', 'تعديل')}
                  </Button>

                  <Button
                    size="sm"
                    variant="danger"
                    className="ms-2"
                    onClick={() => deleteColor(color.id)}
                  >
                    {tx('Delete', 'حذف')}
                  </Button>

                </td>

              </tr>

            ))}

          </tbody>

        </Table>

      )}

    </Container>

  );

}