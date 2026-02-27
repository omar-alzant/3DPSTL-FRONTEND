import React from 'react';
import { Card } from 'react-bootstrap';

const MapLocation = ({width = '100%', height= '100%'}) => {
  // Encoded address for Google Maps
  const address = "Cher3 Alrahibet, Tripoli, Lebanon";
  const mapUrl = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3290.5918955929264!2d35.8430289!3d34.43712!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1521f72728db2017%3A0xe5cec9dc70f54715!2sLiban%20BeBe!5e0!3m2!1sen!2suk!4v1766299501415!5m2!1sen!2suk`;

  return (
    <Card className="border-0 shadow-sm overflow-hidden mt-3">
      <div style={{ width: "100%", height: "300px" }}>
        <iframe
          title="Liban Bebe Location"
            src={mapUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
      <Card.Body className="bg-light">
        <small className="text-muted">
          <strong>Visit us:</strong> Cher3 Alrahibet, Tripoli, Lebanon (1300)
        </small>
      </Card.Body>
    </Card>
  );
};

export default MapLocation;