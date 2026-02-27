import React, { useEffect, useState } from "react";
import { Form } from "react-bootstrap";

export default function RangeInputAge({ value, onChange, readOnly }) {
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [unit, setUnit] = useState("Y");

  // Sync internal state when the "value" prop (the array) changes
  useEffect(() => {
    if (Array.isArray(value)) {
      setMin(value[0] || "");
      setMax(value[1] || "");
      setUnit(value[2] || "Y");
    }
  }, [value]);

  // Emit a simple array [min, max, unit] back to the parent
  const emitChange = (newMin, newMax, newUnit) => {
    onChange([newMin, newMax, newUnit]);
  };

  return (
    <div className="d-flex align-items-center gap-2">
      <Form.Control
        type="number"
        placeholder="Min"
        value={min}
        disabled={readOnly}
        style={{ width: 80 }}
        onChange={(e) => emitChange(e.target.value, max, unit)}
      />

      <span>–</span>

      <Form.Control
        type="number"
        placeholder="Max"
        value={max}
        disabled={readOnly}
        style={{ width: 80 }}
        onChange={(e) => emitChange(min, e.target.value, unit)}
      />

      <Form.Select
        value={unit}
        disabled={readOnly}
        style={{ width: 100 }}
        onChange={(e) => emitChange(min, max, e.target.value)}
      >
        <option value="M">Months</option>
        <option value="Y">Years</option>
      </Form.Select>
    </div>
  );
}