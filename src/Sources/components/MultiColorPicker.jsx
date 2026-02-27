import React, { useState, useEffect } from "react";
import { InputGroup, Button } from "react-bootstrap";
import "../Style/MultiColorPicker.css";
const MultiColorPicker = ({ 
  value, 
  onChange, // Used for Admin/Edit mode (add/remove available colors)
  isReadOnly = false, 
  selectedValues = [], // 🔑 NEW: The colors currently selected by the client
  onSelect, // 🔑 NEW: Callback to notify the parent of client's color selection
}) => {
  // ... (rest of parseValue remains the same)
  const parseValue = (val) => {
    // ... (parseValue logic)
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.trim() !== '') {
      try {
        // return val
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return val.includes(',')
          ? val.split(',').map(s => s.trim()).filter(Boolean)
          : [];
      }
    }
    return [];
  };
  
  const [colors, setColors] = useState(() => parseValue(value));
  
  useEffect(() => {
    setColors(parseValue(value));
  }, [value]);

  const [currentColor, setCurrentColor] = useState("#000000");

  // Keep internal state synced when parent value changes
  useEffect(() => {
    setColors(parseValue(value));
  }, [value]);

  const updateParent = (newColors) => {
    onChange?.(newColors); // This remains for Admin/Edit Mode
  };

  const addColor = () => {
    if (!colors.includes(currentColor)) {
      const newColors = [...colors, currentColor];
      setColors(newColors);
      updateParent(newColors);
    }
  };

  const removeColor = (color) => {
    const newColors = colors.filter((c) => c !== color);
    setColors(newColors);
    updateParent(newColors);
  };
  const toggleSelection = (color) => {
    if (!onSelect) return; // Only run if the onSelect prop is provided
  
    const isSelected = selectedValues.includes(color);
    let newSelectedColors;
  
    if (isSelected) {
      // Deselect
      newSelectedColors = selectedValues.filter((c) => c !== color);
    } else {
      // Select
      newSelectedColors = [...selectedValues, color];
    }
    onSelect(newSelectedColors);
};


  return (
    <div className={`multi-color-picker ${isReadOnly ? "read-only" : ""}`}>
      {!isReadOnly && (
        <InputGroup>
          <input
            type="color"
            className="form-control form-control-color"
            value={currentColor}
            title="Choose color"
            onChange={(e) => setCurrentColor(e.target.value)}
          />
          <Button variant="light" onClick={addColor}>
            Add
          </Button>
        </InputGroup>
      )}

<div className="selected-colors">
        {Array.isArray(colors) && colors.map((color) => {
          const isSelectableMode = !!onSelect;
          const isClientSelected = isSelectableMode && selectedValues.includes(color);
          return (
          <div
            key={color}
            className={`color-tag ${isClientSelected ? "selected-client" : ""}`} // 🔑 NEW: Apply selected class
            style={{ 
              backgroundColor: color,
              cursor: isSelectableMode ? "pointer" : "default",            }}
            title={color}
            onClick={isSelectableMode ? () => toggleSelection(color) : undefined}>
            {!isReadOnly && !onSelect && (
              <span className="remove-btn" onClick={(e) => { e.stopPropagation(); removeColor(color) }}>
                ×
              </span>
            )}
          </div>
        );
       })}
      </div>
    </div>
  );
};

export default MultiColorPicker;
