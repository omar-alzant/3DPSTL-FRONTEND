import React, { useEffect, useState } from "react";
import { Container, Spinner, Badge } from "react-bootstrap";
import '../Style/FilamentColors.css'

export default function FilamentColors() {

  const token = sessionStorage.getItem("token");

  const colorsURL =
    `${process.env.REACT_APP_API_URL}/api/admin/filament/colors`;

  const [colors, setColors] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchColors = async () => {

    try {

      const res = await fetch(colorsURL, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();

      setColors(data || []);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {
    fetchColors();
  }, []);

  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner />
      </Container>
    );
  }

  return (
    <Container className="mt-4">

      <h4 className="mb-4">Filament Colors</h4>

      <div className="filament-grid">

        {Array.isArray(colors) && colors.map(color => (

          <div key={color.id} className="filament-card">

            <div
              className="filament-circle"
              style={{ background: color.hex }}
            />

            <h6 className="mt-3">{color.name}</h6>
            {color?.hex && (
              <div className="small text-secondary">
                {color?.hex}
              </div>
            )}
            <div className="text-muted small">
              {color.filament_materials?.name}
            </div>

        
            {/* {color.filament_brands?.name && (
              <div className="small text-secondary">
                {color.filament_brands.name}
              </div>
            )} */}

            {/* <div className="mt-2">
              {color.stock > 0 ? (
                <Badge bg="success">In Stock</Badge>
              ) : (
                <Badge bg="secondary">Out of Stock</Badge>
              )}
            </div> */}

          </div>

        ))}

      </div>

    </Container>
  );
}