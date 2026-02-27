import React, { useState, useEffect } from 'react';
// import '../Style/AdminMarkets.css';
import PreviewAdminContent from "../components/PreviewAdminContent";
import ImageSlide from "../components/ImageSlide";
import AdminForm from '../components/AdminForm';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import { useToast } from "../context/ToastProvider";


export default function AdminModels() {
  const [materials, setMaterials] = useState([]);
  const [types, settypes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem('token');
  const [isSaving, setIsSaving] = useState(false);
  const adminTypesURL = `${process.env.REACT_APP_API_URL}/api/admin/products/type` 
  const adminModelsURL = `${process.env.REACT_APP_API_URL}/api/admin/products/model` 
  const [form, setForm] = useState({
    type_id: null,
    type_name: '',
    name: '',
    description: '',
    isdisabled: false,
  });
  const [validationErrors, setValidationErrors] = useState({});
  // const [savedText, setSavedText] = React.useState("<p>Welcome back!</p>");
  const { showToast } = useToast();


  useEffect(() => { 
    const fetchMaterials = async () => {
      setLoading(true);
      try {
        const res = await fetch(adminModelsURL, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const typesReq = await fetch(adminTypesURL, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const typesData = await typesReq.json();
        const data = await res.json();

        setMaterials(Array.isArray(data) ? data : []);
        settypes(Array.isArray(typesData) ? typesData.map(t => {return {label: t.name, value: t.id}}) : []);
        // localStorage.setItem("materials", JSON.stringify(data));
      } catch (err) {
        showToast(`Error fetching Types: ${err}`, "danger")
      } finally {
        setLoading(false);
      }
    };
  
    if (token) fetchMaterials();
    // fetchMaterials();
  }, [token]); // ✅ include token
  
  const startEditing = (material) => {
    setEditingId(material.id);
    setForm({
      type_id: material.type_id,
      type_name: material.type_name,
      name: material.name,
      description: material.description,
      isdisabled: material.isdisabled,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });

  };
  
  const addMaterial = async (e) => {
    e.preventDefault(); // stops page refresh

    const { type_id, name, description, isdisabled } = form;

    setIsSaving(true);
    try {
      await fetch(adminModelsURL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ type_id, name, description, isdisabled}),
      })
        .then(res => res.json())
        .then(() => {
          // Refresh the materials list
          return fetch(adminModelsURL, {
            headers: {
              'Authorization': `Bearer ${token}`,
            }
          });
        })
        .then(res => res.json())
        .then(data => {
          setMaterials(data);
          setForm({ type_id: null, type_name: '', name: '', description: '', isdisabled: false});
        });
    } catch (err) {
      showToast(`Error adding material: ${err}`, "danger")
    } finally {
      setIsSaving(false);
      showToast("Adding Done.")
    }
  };

  const deleteMaterial = (id) => {    
    return;
  };

  

  
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const { type_id, name, description, isdisabled } = form;

    if (editingId) {
      setIsSaving(true); // يبدأ عرض "جاري الحفظ..."
      try{
       await fetch(`${adminModelsURL}/${editingId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ type_id, name, description, isdisabled}),
      })
        .then(res => res.json())
        .then(() => {
          setEditingId(null);
          resetForm();
          return fetch(adminModelsURL);
        })
        .then(res => res.json())
        .then(data => setMaterials(data));
      }
      catch (err) {
        showToast(`Error updating Model: ${err}`, "danger")
      } finally{
        setIsSaving(false);
        showToast("Adding Done.")
      }
    } else {
      // ADD
      addMaterial(e);
    }
  };

  const resetForm = () => {
    setEditingId(null)
    setForm({ type_id: null, market_name: '', name: '', description: '', isdisabled: false});
  };

  const adminModelsFields = [
    {
      controlId: 'type_id',
      name: 'type_id',
      label: 'Type name',
      type: 'select',
      placeholder: '',
      required: true,
      row:1,
      value: types[0],
      colWidth: 4,
      options: types
      // Note: No component property for standard input
    },
    {
      controlId: 'name',
      name: 'name',
      label: 'Name',
      type: 'text',
      placeholder: 'Name',
      required: true,
      row:2,
      colWidth: 4,
      // Note: No component property for standard input
    },
    {
      controlId: 'isdisabled',
      name: 'isdisabled',
      label: 'Disable',
      type: 'checkbox',
      row:2,
      colWidth: 4
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
    <Form className="p-3 br-gray-l brr" onSubmit={handleSubmit} >
      <AdminForm
        fields={adminModelsFields}
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
        <Button type="button" onClick={resetForm} >
          Cancel
        </Button>
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
            canDelete={false}
          />
      </div>
    )}
  </div>
);
}
