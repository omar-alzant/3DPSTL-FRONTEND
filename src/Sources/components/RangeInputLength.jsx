import React, { useEffect, useState } from "react";
import { Form } from "react-bootstrap";

export default function RangeInputLength({ value, onChange, readOnly }) {
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [unit, setUnit] = useState("CM");

  /* ---------- Parse incoming Array ---------- */
  useEffect(() => {
    // We treat 'value' strictly as an array: [min, max, unit]
    if (Array.isArray(value)) {
      setMin(value[0] ?? "");
      setMax(value[1] ?? "");
      setUnit(value[2] || "CM");
    }
  }, [value]);

  /* ---------- Emit Array [min, max, unit] ---------- */
  const emitChange = (newMin, newMax, newUnit = unit) => {
    // We send back the array so it matches your parent's state
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
        onChange={(e) => {
          const val = e.target.value;
          setMin(val);
          emitChange(val, max, unit);
        }}
      />

      <span>–</span>

      <Form.Control
        type="number"
        placeholder="Max"
        value={max}
        disabled={readOnly}
        style={{ width: 80 }}
        onChange={(e) => {
          const val = e.target.value;
          setMax(val);
          emitChange(min, val, unit);
        }}
      />

      <Form.Select
        value={unit}
        disabled={readOnly}
        style={{ width: 90 }}
        onChange={(e) => {
          const val = e.target.value;
          setUnit(val);
          emitChange(min, max, val);
        }}
      >
        <option value="CM">Cm</option>
        <option value="IN">Inch</option>
      </Form.Select>
    </div>
  );
}