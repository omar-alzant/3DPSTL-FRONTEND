import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Container, Row, Col, Form, Button, Accordion, InputGroup, Card, Placeholder } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import Select from 'react-select';
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import { IoSearch } from "react-icons/io5";
import { useToast } from "../context/ToastProvider";

// Skeleton Component
function ProductSkeleton() {
  return (
    <Card className="h-100 shadow-sm border-0">
      <Placeholder as="div" animation="glow">
        <Placeholder style={{ height: '200px', width: '100%', borderRadius: '8px 8px 0 0' }} />
      </Placeholder>
      <Card.Body>
        <Placeholder as={Card.Title} animation="glow">
          <Placeholder xs={8} />
        </Placeholder>
        <Placeholder as={Card.Text} animation="glow">
          <Placeholder xs={4} /> <Placeholder xs={6} />
        </Placeholder>
      </Card.Body>
    </Card>
  );
}



export default function Items() {
  const { cart, addToCart, removeFromCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [metadata, setMetadata] = useState({ types: [], models: [], brands: [] });
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const { showToast } = useToast();


  const pageSize = 8;
  const currentPage = parseInt(searchParams.get('page') || '1');

const updateFilters = (updates) => {
  setSearchParams(prev => {
    // Create a new copy of existing params
    const params = new URLSearchParams(prev);
    params.set('page', '1'); // Reset to page 1 on filter change

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
        params.delete(key);
      } else {
        // If it's an array (from Select), join it with commas
        const valToSet = Array.isArray(value) ? value.join(',') : String(value);
        params.set(key, valToSet);
      }
    });
    return params;
  });
};

const resetSearch = () => {
  // 1. Clear the URL parameters entirely
  setSearchParams({}, { replace: true });

  // 2. Clear the visual values of the uncontrolled HTML inputs
  // We find the parent container or look for inputs by their role
  const inputs = document.querySelectorAll('.accordion-body input');
  inputs.forEach(input => {
    if (input.type === 'checkbox' || input.type === 'radio') {
      input.checked = false;
    } else {
      input.value = "";
    }
  });
};
// IMPROVED React-Select Value Logic
// Helper to get selected values from URL to pass back to <Select />
const getSelectedOptions = (paramKey, metadataArray) => {
  const ids = searchParams.get(paramKey)?.split(',') || [];
  return metadataArray
    .filter(item => ids.includes(String(item.id)))
    .map(item => ({ value: String(item.id), label: item.name }));
};

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/products/item?${searchParams.toString()}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotalItems(data.total || 0);
    } catch (err) {
      showToast(`${err}`, "danger")

    } finally {
      setLoading(false);
    }
  }, [searchParams]);



  useEffect(() => { fetchItems();
    if (items) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }

   }, [fetchItems]);
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [typesRes, modelRes, marketsRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/api/admin/products/type`).then(r => r.json()),
          fetch(`${process.env.REACT_APP_API_URL}/api/admin/products/model`).then(r => r.json()),
          fetch(`${process.env.REACT_APP_API_URL}/api/admin/products/market`).then(r => r.json()),
        ]);
  
        // Setting the state for all three at once
        setMetadata({ 
          types: typesRes || [], 
          models: modelRes || [], 
          brands: marketsRes.items || [] 
        });
      } catch (err) {
        showToast(`Failed to fetch filter metadata: ${err}`, "danger")
      }
    };
    fetchMeta();
  }, []);
  // Derive Options for Select
  // const typeOptions = metadata?.types.map(t => ({ value: String(t.id), label: t.name }));
  // const brandOptions = metadata?.brands.map(b => ({ value: String(b.id), label: b.name }));
  const brands = useMemo(
    () => Array.isArray(metadata.brands) ? metadata.brands : [],
    [metadata.brands]
  );
  
  const models = useMemo(
    () => Array.isArray(metadata.models) ? metadata.models : [],
    [metadata.models]
  );
  
  const types = useMemo(
    () => Array.isArray(metadata.types) ? metadata.types : [],
    [metadata.types]
  );
  
  return (
    <Container className="py-4">
   {/* <Card className="mb-3 shadow-sm border-0 rounded-4">
        <Card.Body>
          <InputGroup size="lg">
            <InputGroup.Text className="bg-white border-end-0">
              <IoSearch />
            </InputGroup.Text>

            <Form.Control
              key={searchParams.get("q") || "empty"}
              placeholder="Search products, models, or descriptions..."
              defaultValue={searchParams.get("q") || ""}
              onChange={(e) => updateFilters({ q: e.target.value })}
              className="border-start-0"
            />

            <Button variant="outline-secondary" onClick={resetSearch}>
              Reset
            </Button>
          </InputGroup>
        </Card.Body>
      </Card> */}


      {/* ===================== */}
      {/* 🧩 Advanced Filters */}
      {/* ===================== */}
      <Accordion className="shadow-sm rounded-4 border-0 mb-3">
        <Accordion.Item eventKey="0">
          <Accordion.Header>Advanced Filters</Accordion.Header>
          <Accordion.Body>
            <Row className="g-3">
            <Col md={4} >
              <label className="small fw-semibold mb-1">Type</label>
              <Select
                isMulti
                options={types.map(t => ({ value: String(t.id), label: t.name }))}
                value={getSelectedOptions("type_id", types)}
                onChange={(val) =>
                  updateFilters({ type_id: val?.map(v => v.value) || [] })
                }
                placeholder="All Categories"
              />
            </Col>

            <Col md={4}>
              <label className="small fw-semibold mb-1">Model</label>
              <Select
                isMulti
                options={models.map(m => ({ value: String(m.id), label: m.name }))}
                value={getSelectedOptions("model_id", models)}
                onChange={(val) =>
                  updateFilters({ model_id: val?.map(v => v.value) || [] })
                }
                placeholder="All Models"
                className="z-9999"

              />
            </Col>

            <Col md={4}>
              <label className="small fw-semibold mb-1">Brand</label>
              <Select
                isMulti
                options={brands.map(b => ({ value: String(b.id), label: b.name }))}
                value={getSelectedOptions("brand_id", brands)}
                onChange={(val) =>
                  updateFilters({ brand_id: val?.map(v => v.value) || [] })
                }
                placeholder="All Brands"
                className="z-9999"

              />
            </Col>
              {/* Age */}
              <Col md={4}>
                <label className="small fw-semibold">Age Range</label>
                <InputGroup>
                  <Form.Control
                    placeholder="Min"
                    defaultValue={searchParams.get("minAge") || ""}
                    onBlur={(e) => updateFilters({ minAge: e.target.value })}
                  />
                  <Form.Control
                    placeholder="Max"
                    defaultValue={searchParams.get("maxAge") || ""}
                    onBlur={(e) => updateFilters({ maxAge: e.target.value })}
                  />
                </InputGroup>
              </Col>

              {/* Price */}
              <Col md={4}>
                <label className="small fw-semibold">Price Range</label>
                <InputGroup>
                  <Form.Control
                    placeholder="Min"
                    defaultValue={searchParams.get("minPrice") || ""}
                    onBlur={(e) => updateFilters({ minPrice: e.target.value })}
                  />
                  <Form.Control
                    placeholder="Max"
                    defaultValue={searchParams.get("maxPrice") || ""}
                    onBlur={(e) => updateFilters({ maxPrice: e.target.value })}
                  />
                </InputGroup>
              </Col>

              {/* Length */}
              <Col md={4}>
                <label className="small fw-semibold">Length</label>
                <InputGroup>
                  <Form.Control
                    placeholder="Min"
                    defaultValue={searchParams.get("minLen") || ""}
                    onBlur={(e) => updateFilters({ minLen: e.target.value })}
                  />
                  <Form.Control
                    placeholder="Max"
                    defaultValue={searchParams.get("maxLen") || ""}
                    onBlur={(e) => updateFilters({ maxLen: e.target.value })}
                  />
                </InputGroup>
              </Col>

              {/* Sale */}
              <Col md={3}>
                <Form.Check
                  type="switch"
                  label="On Sale Only"
                  className="mt-2"
                  checked={searchParams.get("onsale") === "true"}
                  onChange={(e) =>
                    updateFilters({ onsale: e.target.checked ? "true" : "" })
                  }
                />
              </Col>

            </Row>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>


      {/* Grid with Skeleton Logic */}
      <Row className="g-3">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Col key={i} xs={6} md={4} lg={3}><ProductSkeleton /></Col>
          ))
        ) : items.length > 0 ? (
          items.map(item => (
            <Col key={item.id} xs={6} md={4} lg={3}>
              <ProductCard product={item} cart={cart} onAddToCart={addToCart} onRemoveFromCart={removeFromCart} />
            </Col>
          ))
        ) : (
          <Col className="text-muted text-center py-5"><h5>No products found matching these filters.</h5></Col>
        )}
      </Row>

      {/* Pagination */}
      <div className="d-flex justify-content-between align-items-center mt-5">
        <small className="text-muted">Total: {totalItems} items</small>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" size="sm" disabled={currentPage <= 1}
            onClick={() => updateFilters({ page: currentPage - 1 })}>Previous</Button>
          <span className="btn btn-primary px-3 py-1 rounded">Page {currentPage}</span>
          <Button variant="outline-primary" size="sm" disabled={items.length < pageSize}
            onClick={() => updateFilters({ page: currentPage + 1 })}>Next</Button>
        </div>
      </div>
    </Container>
  );
}