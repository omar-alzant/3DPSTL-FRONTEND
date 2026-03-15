import React, { useState, useEffect } from "react";
import { Form, Button, Spinner, Container, Table } from "react-bootstrap";
import { useToast } from "../context/ToastProvider";

export default function AdminColors() {

  const token = sessionStorage.getItem("token");
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

      showToast("Failed loading colors", "danger");

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

      showToast("Failed loading metadata", "danger");

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

      showToast(editingId ? "Color updated" : "Color added");

      resetForm();
      fetchColors();

    } catch {

      showToast("Save failed", "danger");

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

    if (!window.confirm("Delete this color?")) return;

    try {

      await fetch(`${colorsURL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      setColors(colors.filter(c => c.id !== id));

      showToast("Deleted");

    } catch {

      showToast("Delete error", "danger");

    }

  };

  return (

    <Container className="admin-surface">

      <Form className="p-4 border rounded mb-5" onSubmit={handleSubmit}>

        <Form.Group className="mb-3">
          <Form.Label>Color Name</Form.Label>
          <Form.Control
            value={form.name}
            onChange={e => handleChange("name", e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Color</Form.Label>
          <Form.Control
            type="color"
            value={form.hex}
            onChange={e => handleChange("hex", e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Material</Form.Label>

          <Form.Select
            value={form.material_id}
            onChange={e => handleChange("material_id", e.target.value)}
          >

            <option value="">Select Material</option>

            {metadata.materials.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}

          </Form.Select>

        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Brand</Form.Label>

          <Form.Select
            value={form.brand_id}
            onChange={e => handleChange("brand_id", e.target.value)}
          >

            <option value="">Select Brand</option>

            {metadata.brands.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}

          </Form.Select>

        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Stock</Form.Label>
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
              ? "Save Changes"
              : "Add Color"}
        </Button>

        <Button
          variant="secondary"
          className="ms-2"
          onClick={resetForm}
        >
          Cancel
        </Button>

      </Form>

      {/* COLORS TABLE */}

      {loading ? (
        <Spinner />
      ) : (

        <Table striped bordered>

          <thead>
            <tr>
              <th>Preview</th>
              <th>Name</th>
              <th>Material</th>
              <th>Brand</th>
              <th>Stock</th>
              <th>Actions</th>
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
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="danger"
                    className="ms-2"
                    onClick={() => deleteColor(color.id)}
                  >
                    Delete
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