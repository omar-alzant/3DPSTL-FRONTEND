import React, { useEffect, useState } from "react";
import { Container, Spinner, Badge } from "react-bootstrap";
import '../Style/FilamentColors.css'
import { useLang } from '../i18n/LanguageContext';

export default function FilamentColors() {
  const { tx } = useLang();

  const token = localStorage.getItem('token');

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

    <div className="d-flex justify-content-between align-items-center">

      <h4 className="mb-4">{tx('Filament Colors', 'ألوان الخيوط')} </h4>
        Total: {colors.length}
    </div>
      <p className="filament-note">
  {tx('Colors are for reference only and may slightly vary from the actual filament due to lighting and display differences.', 'الألوان للتوضيح بس، وممكن تختلف شوي عن لون الخيط الحقيقي حسب الإضاءة والشاشة.')}
</p>


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
                <Badge bg="success">{tx('In Stock', 'متوفّر')}</Badge>
              ) : (
                <Badge bg="secondary">{tx('Out of Stock', 'خلص')}</Badge>
              )}
            </div> */}

          </div>

        ))}

      </div>

    </Container>
  );
}