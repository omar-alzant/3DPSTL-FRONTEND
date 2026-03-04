import React from 'react';
import { Card } from 'react-bootstrap';

const MapLocation = ({width = '100%', height= '100%'}) => {
  // Encoded address for Google Maps
  const address = "Cher3 Alrahibet, Tripoli, Lebanon";
  const mapUrl = `
https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d823.1504825862858!2d35.789065452774885!3d34.386043418133355!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1521f1003fb1b3fd%3A0x5516fa2e0bbb1dc0!2sPLP%20STORE!5e0!3m2!1sen!2slb!4v1772614418285!5m2!1sen!2slb`;

  return (
    <Card className="border-0 shadow-sm overflow-hidden mt-3">
      <div style={{ width: "100%", height: "300px" }}>
        <iframe
          title="3DSTL Location"
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
          <strong>Visit us:</strong>مدخل القلمون الرئيسي, Qalamoun 
        </small>
      </Card.Body>
    </Card>
  );
};

export default MapLocation;