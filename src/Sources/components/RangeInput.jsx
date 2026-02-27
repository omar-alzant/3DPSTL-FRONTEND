import React, { useEffect, useState } from "react";
import { Form } from "react-bootstrap";

export default function RangeInput({ value, onChange, readOnly }) {
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  // --- 1. Parse incoming 'value' (Handles Array or Legacy String) ---
  useEffect(() => {
    if (Array.isArray(value) && value.length === 2) {
        // Preferred: Handles array format like ['1', '3']
        setMin(value[0]?.toString() || "");
        setMax(value[1]?.toString() || "");
    } else if (typeof value === "string" && value.includes("-")) {
      // Fallback: Handles legacy string format like '(1 - 3)'
      const parts = value.replace(/[()]/g, "").split("-");
      setMin(parts[0]?.trim() || "");
      setMax(parts[1]?.trim() || "");
    } else if (value === null || value === undefined || value.length === 0) {
        // Handle null/empty states by resetting to empty strings
        setMin("");
        setMax("");
    }
  }, [value]);

  // --- 2. Change Handler (Always returns an Array) ---
  const handleChange = (newMin, newMax) => {
    const newRange = [newMin, newMax];
    onChange(newRange); 
  };

  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
      <Form.Control
        type="number"
        min="0"
        value={min}
        readOnly={readOnly}
        style={{ width: "80px" }}
        onChange={(e) => {
          setMin(e.target.value);
          // Update the parent state with the new array
          handleChange(e.target.value, max);
        }}
      />
      <span>–</span>
      <Form.Control
        type="number"
        min="0"
        value={max}
        readOnly={readOnly}
        style={{ width: "80px" }}
        onChange={(e) => {
          setMax(e.target.value);
          // Update the parent state with the new array
          handleChange(min, e.target.value);
        }}
      />
    </div>
  );
}