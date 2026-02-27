import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, Button, Spinner, Container } from 'react-bootstrap';
import PreviewAdminContent from "../components/PreviewAdminContent";
import AdminForm from '../components/AdminForm';
import "../Style/AdminLayout.css";
import { useToast } from "../context/ToastProvider";

export default function AdminItems() {
  const token = sessionStorage.getItem('token');

  /* ---------------- STATE ---------------- */
  const [materials, setMaterials] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", bg: "success" });
  const [metadata, setMetadata] = useState({ models: [], brands: [] });
  const [validationErrors, setValidationErrors] = useState({});
  const { showToast } = useToast();

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalItems, setTotalItems] = useState(0);

  const adminItemURL = `${process.env.REACT_APP_API_URL}/api/admin/products/item`;
  const adminModelURL = `${process.env.REACT_APP_API_URL}/api/admin/products/model`;
  const adminBrandURL = `${process.env.REACT_APP_API_URL}/api/admin/products/market`;


  /* ---------------- FORM ---------------- */
  const [form, setForm] = useState({
    model_id: null,
    name: '',
    description: '',
    brandsF: [],
    isSimple: false,
    galleryurls: [],
    short_description: '',
    variants: [{
      size: null,
      color: '',
      gender: 'Male',
      stock: 0,
      price: 0,
      age: ["", "", ""],
      lengthcm: ["", "", ""],
      onSale: false,
      outofstock: false
    }],
  });

  /* ---------------- NORMALIZER ---------------- */
  const normalizeItem = useCallback((raw) => ({
    ...raw,
    galleryurls: raw.galleryurls || [],
    variants: Array.isArray(raw.variants) ? raw.variants : [],
    brandsF: Array.isArray(raw.brands_ids)
      ? raw.brands_ids
          .map(id => metadata.brands.find(b => b.id === id))
          .filter(Boolean)
          .map(b => ({ label: b.name, value: b.id }))
      : [],
    model_name: raw.model?.name || "",
    type_name: raw.model?.type?.name || "",
    category_name: raw.model?.type?.category?.name || "",
  }), [metadata.brands]);
  

  /* ---------------- FETCH ITEMS ---------------- */
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${adminItemURL}?page=${page}&pageSize=${pageSize}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      setMaterials((json.items || []).map(normalizeItem));
      setTotalItems(json.total || 0);
    } catch {
      showToast("Error loading items", "danger");
    } finally {
      setLoading(false);
    }
  }, [page, token, normalizeItem]);

  useEffect(() => { if (token) fetchItems(); }, [fetchItems, token]);

  /* ---------------- FETCH META ---------------- */
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [ modelRes, marketsRes] = await Promise.all([
          fetch(adminModelURL).then(r => r.json()),
          fetch(adminBrandURL).then(r => r.json()),
        ]);
  
        // Setting the state for all three at once
        setMetadata({ 
          models: modelRes || [], 
          brands: marketsRes.items || [] 
        });
      } catch (err) {
        showToast(`Failed to fetch filter metadata: ${err}`, "danger")
      }
    };
    fetchMeta();
  }, []);


  const brands = useMemo(() => {
    if (!Array.isArray(metadata?.brands)) return [];
  
    return metadata.brands.map(brand => ({
      label: brand.name,
      value: brand.id,
    }));
  }, [metadata?.brands]);
  
  const handleInputChange = (name, value) => {
    console.log({name, value});
    
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

  const models = useMemo(() => {
    if (!Array.isArray(metadata?.models)) return [];
  
    return metadata.models.map(model => ({
      label: model.name,
      value: model.id,
    }));
  }, [metadata?.models]);

  

    
  /* ---------------- SUBMIT ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      model_id: form.model_id,
      name: form.name,
      description: form.description,
      short_description: form.short_description,
      isSimple: form.isSimple,
      brands_ids: form.brandsF.map(b => b.value),
      galleryurls: form.galleryurls || [],
      variants: form.variants.map(v => ({
        ...v,
        age: v.age
        ? [v.age[0] ?? "", v.age[1] ?? "", v.age[2] ?? "Y"]
        : ["", "", ""],
        lengthcm: Array.isArray(v.lengthcm) ? [v.lengthcm[0] ?? "", v.lengthcm[1] ?? "", v.lengthcm[2] ?? "CM"] : ["", "", ""],
        size: form.isSimple ? "simple" : (v.size || "unspecified"),
        color: form.isSimple ? "simple" : (v.color || "unspecified")
      }))
    };

    try {
      const res = await fetch(
        editingId ? `${adminItemURL}/${editingId}` : adminItemURL,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      );

      if (!res.ok) showToast("Save failed", "danger");

      showToast(editingId ? "Updated successfully" : "Added successfully");
      resetForm();
      fetchItems();
    } catch (err) {
      showToast(err.message, "danger");
    } finally {
      setIsSaving(false);
    }
  };


  const startEditing = (material) => {
    setEditingId(material.id);
    console.log("Ïtem", material);
    
    const selectedBrands = Array.isArray(material.brands_ids)
      ? brands.filter(b =>
          material.brands_ids.some(mb => mb === b.value)
        )
      : [];
  
    setForm({
      model_id: material.model_id,
      name: material.name,
      description: material.description,
      short_description: material.short_description,
      brandsF: selectedBrands,
      isSimple: material.issimple,
      galleryurls: material.galleryurls || [],
      variants: material.variants.map(v => ({
        ...v,
        age: v.age
        ? [v.age[0] ?? "", v.age[1] ?? "", v.age[2] ?? "Y"]
        : ["", "", ""],
        lengthcm: Array.isArray(v.lengthcm) ? [v.lengthcm[0] ?? "", v.lengthcm[1] ?? "", v.lengthcm[2] ?? "CM"] : ["", "", ""],
       
      }))
    });
  
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  


const resetForm = () => {
    setEditingId(null)
    const initialVariants =
     [{ // Fallback for old/flat structure
        // Pull variant-specific fields from the flat material object
        size: null,
        color: '',
        gender: '',
        age: ["", "", ""],
        stock: 0,
        price: 0,
        lengthcm: ["", "", ""],
        oldprice: 0,
        outofstock: false,
        onSale: false,
        id: null, // For update purposes
      }];

    setForm({
      model_id: null,
      model_name: '',
      variants: initialVariants,
      name: '',
      description: '',
      short_description: '',
      brandsF: null,
      isSimple: false,
      galleryurls: null,
      });
  };

const handleDescriptionChange = (html) => {
    setForm((prev) => ({ ...prev, description: html }));
  };

  const copyMaterial = (material) => {
    setEditingId(null);
  
    const selectedBrands = Array.isArray(material.brands_ids)
      ? brands.filter(b =>
          material.brands_ids.some(mb => mb === b.value )
        )
      : [];
  
    setForm({
      model_id: material.model_id,
      model_name: material.model_name,
      name: material.name,
      description: material.description,
      short_description: material.short_description,
      brandsF: selectedBrands,
      isSimple: material.issimple,
      galleryurls: material.galleryurls || [],
      variants: Array.isArray(material.variants)
        ? material.variants
        : []
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // console.log({form})
  };
  

  const deleteMaterial = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await fetch(`${adminItemURL}/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setMaterials(materials.filter(m => m.id !== id));
      showToast("Deleted");
    } catch (err) { showToast("Error deleting", "danger"); }
  };

  // --- 4. Field Configuration ---
  const adminItemsFields = [
    { controlId: 'model_id', name: 'model_id', label: 'Model', type: 'select', options: models, row: 1, colWidth: 4, required: true },
    { controlId: 'brandsF', name: 'brandsF', label: 'Brands', type: 'multiselect', options: brands, row: 1, colWidth: 4 },
    { controlId: 'name', name: 'name', label: 'Item Name', type: 'text', row: 1, colWidth: 4, required: true },
    { controlId: 'description', name: 'description', label: 'Description', type: "Editor", colWidth: 12 },
    { controlId: 'short_description', name: 'short_description', label: 'Short Description', type: "textarea", colWidth: 12 },
    { controlId: 'isSimple', name: 'isSimple', label: 'Simple Product (No Sizes/Colors)', type: 'checkbox', colWidth: 12 },
    { 
      controlId: 'variants-matrix', 
      name: 'variants', 
      type: 'size-attribute-matrix', 
      isSimple: form.isSimple,
      colWidth: 12,
      options: {
        allSizes: [{label: 'Unspecified', value: 'unspecified'}, {label: 'XXS', value: 'xxs'}, {label: 'XS', value: 'xs'}, {label: 'S', value: 's'}, {label: 'M', value: 'm'}, {label: 'L', value: 'l'}, {label: 'XL', value: 'xl'}, {label: 'XXL', value: 'xxl'}
          , {label: 'XXXL', value: 'xxxl'}, {label: 'XXXXL', value: 'xxxxl'}, {label: '17', value: '17'}, {label: '18', value: '18'}, {label: '19', value: '19'}, {label: '20', value: '20'}, {label: '21', value: '21'} , {label: '22', value: '22'}, {label: '23', value: '23'}
         ], // Add your full sizes array here
        genderOptions: [{label: 'Male', value: 'Male'}, {label: 'Female', value: 'Female'}, {label: 'No Gender', value: ''}]
      }
    },
    { controlId: 'galleryurls', name: 'galleryurls', label: 'Gallery Images', type: 'multimage', colWidth: 6 }
  ];

  return (
    <Container className="admin-surface">
      
      <Form className="p-4 border rounded mb-5" onSubmit={handleSubmit}>
        <AdminForm 
          fields={adminItemsFields} 
          formData={form} 
          onChange={handleInputChange}
          onCustomChange={handleDescriptionChange}
        />
        <div className="mt-3 d-flex gap-2">
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? <Spinner size="sm" /> : editingId ? "Save Changes" : "Add Item"}
          </Button>
          <Button variant="secondary" onClick={resetForm}>Cancel</Button>
        </div>
      </Form>

      <hr />

      {loading ? (
  <div className="text-center">
    <Spinner animation="border" />
  </div>
) : (
  <>
    <PreviewAdminContent
      materials={materials}
      withVariants
      startEditing={startEditing}
      deleteMaterial={deleteMaterial}
      canDelete
      copyMaterial={copyMaterial}
      editingId={editingId}
    />

    {/* ✅ PAGINATION HERE */}
    <div className="d-flex justify-content-between align-items-center mt-4">
      <small className="text-muted">
        Page {page} • Total items: {totalItems}
      </small>

      <div className="d-flex gap-2">
        <Button
          variant="outline-primary"
          size="sm"
          disabled={page <= 1 || loading}
          onClick={() => setPage(p => Math.max(1, p - 1))}
        >
          Previous
        </Button>

        <Button
          variant="outline-primary"
          size="sm"
          disabled={page * pageSize >= totalItems || loading}
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  </>
)}

    </Container>
  );
}