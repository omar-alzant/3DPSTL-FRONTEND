import React, { useState, useEffect } from 'react';
// import '../Style/AdminMarkets.css';
import PreviewAdminContent from "../components/PreviewAdminContent";
import AdminForm from '../components/AdminForm';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import { useToast } from "../context/ToastProvider";

// Converts stored path → select value
export function pathToSelectValue(path) {
  if (!path) return '';

  if (path.includes('type_id=')) {
    return `type:${path.split('type_id=')[1]}`;
  }

  if (path.includes('model_id=')) {
    return `model:${path.split('model_id=')[1]}`;
  }

  if (path.includes('brand_id=')) {
    return `brand:${path.split('brand_id=')[1]}`;
  }

  return '';
}

export function selectValueToPath(value) {
  if (!value) return '';

  const [level, id] = value.split(':');

  if (level === 'type') return `/shop?type_id=${id}`;
  if (level === 'model') return `/shop?model_id=${id}`;
  if (level === 'brand') return `/shop?brand_id=${id}`;

  return '';
}

export default function AdminCarousel() {
  const [materials, setMaterials] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem('token');
  const [types, setTypes] = useState([]);
  const [models, setModels] = useState([]);
  const [brands, setBrands] = useState([]);
  
  const [linkedPath, setLinkedPath] = useState({
    level: '',
    id: '',
  });
  const { showToast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const adminCarouselURL = `${process.env.REACT_APP_API_URL}/api/admin/products/carousel` 
  const [form, setForm] = useState({
    name: '',
    description: '',
    image: [],
    linkedPath: '',   
  });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => { 
    const fetchMaterials = async () => {
      setLoading(true);
      try {
        const res = await fetch(adminCarouselURL, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await res.json();
        setMaterials(Array.isArray(data) ? data : []);
        localStorage.setItem("carousel", JSON.stringify(data));
      } catch (err) {
          showToast(`Error fetching materials: ${err}`, "danger");
      } finally {
        setLoading(false);
      }
    };
  
    if (token) fetchMaterials();
    // fetchMaterials();
  }, [token]); // ✅ include token
  
  useEffect(() => {
    const fetchLinkingData = async () => {
      const [t, m, b] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/api/admin/products/type`).then(r => r.json()),
        fetch(`${process.env.REACT_APP_API_URL}/api/admin/products/model`).then(r => r.json()),
        fetch(`${process.env.REACT_APP_API_URL}/api/admin/products/market`).then(r => r.json()),
      ]);
  
      setTypes(t || []);
      setModels(m || []);
      setBrands(b.items || []);
    };
  
    fetchLinkingData();
  }, []);

  // const isTypeDisabled  = linkedPath.level && linkedPath.level !== 'type';
  // const isModelDisabled = linkedPath.level && linkedPath.level !== 'model';
  // const isBrandDisabled = linkedPath.level && linkedPath.level !== 'brand';
  const linkedOptions = [
    {
      label: 'Types',
      options: types.map(t => ({
        value: `type:${t.id}`,
        label: t.name,
      })),
    },
    {
      label: 'Models',
      options: models.map(m => ({
        value: `model:${m.id}`,
        label: m.name,
      })),
    },
    {
      label: 'Brands',
      options: brands.map(b => ({
        value: `brand:${b.id}`,
        label: b.name,
      })),
    },
  ];

  const startEditing = (material) => {
    setEditingId(material.id);
  
    setForm({
      name: material.name,
      description: material.description,
      image: material.image,
      linkedPath: material.linkedPath || '',
    });
  
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const addMaterial = async (e) => {
    e.preventDefault();
  
    const { name, description, image, linkedPath } = form;
  
    setIsSaving(true);
    try {
      await fetch(adminCarouselURL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
          image,
          linkedPath: linkedPath || null, // ✅ correct
        }),
      });
  
      const res = await fetch(adminCarouselURL, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
  
      const data = await res.json();
      setMaterials(data);
  
      setForm({
        name: '',
        description: '',
        image: [],
        linkedPath: '',
      });
  
    } catch (err) {
      showToast(`Error adding material: ${err}`, "danger");
    } finally {
      setIsSaving(false);
      showToast("Adding Done.")
    }
  };
  
  const deleteMaterial = (id) => {    
    fetch(`${adminCarouselURL}/${id}`, 
      { method: 'DELETE', 
        headers: 
        {
          'Authorization': `Bearer ${token}`,
        } 
      })
      .then(() => setMaterials(materials.filter(m => m.id !== id)))
      .catch(err => showToast(`Error deleting material: ${err}`, "danger"))
      .finally(() => {showToast("Deletion Done.")})
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const { name, description, isDisabled, image, linkedPath } = form;
  
    if (!editingId) {
      return addMaterial(e);
    }
  
    setIsSaving(true);
    try {
      await fetch(`${adminCarouselURL}/${editingId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
          isDisabled,
          image,
          linkedPath: linkedPath || null, // ✅ correct
        }),
      });
  
      setEditingId(null);
      resetForm();
  
      const res = await fetch(adminCarouselURL, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
  
      const data = await res.json();
      setMaterials(data);
  
    } catch (err) {
      showToast(`Error updating material: ${err}`, "danger")
    } finally {
      setIsSaving(false);
      showToast("Adding Done.")
    }
  };

  
  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '',
      description: '',
      isDisabled: false,
      image: [],
      linkedPath: '',
    });
  };
  

  const adminMarketFields = [
    {
      controlId: 'name',
      name: 'name',
      label: 'Name',
      type: 'text',
      placeholder: 'Name',
      required: true,
      row:1,
      colWidth: 4,
      
      required: true,
      // Note: No component property for standard input
    },
    {
      controlId: 'linkedPath',
      name: 'linkedPath',
      label: 'Linked Path',
      type: 'select-grouped', // or 'select' if AdminForm supports optgroup
      options: linkedOptions,
      value: linkedPath,
      onChange: (val) => {
      setLinkedPath(val);
        setForm((prev) => ({ ...prev, linkedPath: val }));
      },
      row: 2,
      colWidth: 6,
    },
    {
      controlId: 'image',
      name: 'image',
      label: '📤 Insert Image',
      type: 'multimage',
      maxImages: 1,
      row: 3,
      colWidth: 4,
    },
    {
      controlId: 'description',
      name: 'description',
      label: 'Description',
      type: "Editor",
      placeholder: 'Write something...',
      row:3,
      colWidth: 6,
      required: true,

    },
  ];

  
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
    setForm(prev => ({ ...prev, description: html }));
  };

  return (
    <div className='material-container'>
    <Form className="br-gray-l p-3 brr" onSubmit={handleSubmit} >
      <AdminForm
        fields={adminMarketFields}
        formData={form}
        onChange={handleInputChange} 
        onCustomChange={handleDescriptionChange} 
        validation={validationErrors}
        />
      <div>
      <Button type="submit" className="m-2" disabled={isSaving} >
        {isSaving ? (
          <>
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
              className="me-2"
            />
            {editingId ? "Saving..." : "Uploading..."}
          </>
        ) : editingId ? (
          "💾 Save updates"
        ) : (
          " Add"
        )}
      </Button>

      {editingId && !isSaving && (
        <>
        <Button type="button" onClick={resetForm} >
          Cancel
        </Button>
        </>
      )}

      </div>
    </Form>
        <hr />

{/* *************************** All Existed materials list *************************** */}
    {loading 
    ?
    <p>⏳ Loading...</p>
    :
    (
      <div className="br-gray-l p-2 brr">
        <PreviewAdminContent
            materials={materials}
            editingId={editingId}
            startEditing={startEditing}
            deleteMaterial={deleteMaterial}
            canDelete={true}
          />
      </div>
    )}
  </div>
);
}
