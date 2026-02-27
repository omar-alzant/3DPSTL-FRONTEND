// ReusableForm.jsx (Updated)
import React, { useEffect, useRef } from 'react';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Editor from "../components/quill"
import MultiColorPicker from './MultiColorPicker';
import RangeInput from './RangeInput';
import MultiImageInput from './MultiImageInput';
import SizeAttributeMatrix from './SizeAttributeMatrix';
import Select from 'react-select';
import { Ratio } from 'react-bootstrap';
import { pathToSelectValue, selectValueToPath } from '../pages/AdminCarousel';

function FormField({ fieldData, value, onChange, isValid, formData }) {
  // useEffect(() => {
  //   if ((value == null || value === '') && options?.length) {
  //     onChange(options[0].value);
  //   }
  // }, [options, value, onChange]);
  const { controlId, label, name, type,isSimple,  placeholder, options, colWidth, required, accept, readOnly, previewKey = 'imgPreview', imageValueKey = 'image', inputValue = {} ,maxImages = 5} = fieldData;

  const isSelect = type === 'select';
  const isTextarea = type === 'textarea';
  const isSimpleBtn = label === 'Simple';
  const isMultiSelect = type === 'multiselect';
  const isSelectGroup = type === 'select-grouped';
  const isMultiImage = type === 'multimage';
  const isCheckbox = type === 'checkbox';
  const isEditor = type === 'Editor';
  const colorPicker = type === 'colorpicker';
  const rangeInput = type === 'rangeinput';
  const isImage = type === 'file' || (typeof accept === 'string' && accept.includes('image'));
  const Wrapper = colWidth ? Col : 'div';
  const isSizeMatrix = type === 'size-attribute-matrix';
  const wrapperProps = {
    controlId: controlId,
    className: colWidth ? undefined : "mb-3",
  };
  const quillRef = useRef(null);
  
  if (isSizeMatrix) {
    return (
        <Form.Group as={Wrapper} {...wrapperProps} md={colWidth}>
            <Form.Label>{label}</Form.Label>
            <SizeAttributeMatrix
                value={value}
                isSimple={isSimple}
                onChange={onChange} // This onChange updates the 'variants' array in AdminItems
                options={options}
                readOnly={readOnly}
            />
        </Form.Group>
    );
}
if (isTextarea) {
  return (
    !readOnly && (
      <Form.Group as={Wrapper} {...wrapperProps} md={colWidth}>
        <Form.Label>{label}</Form.Label>
        <Form.Control
          as="textarea"
          placeholder={placeholder}
          value={value || ''}
          required={required}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
        />
      </Form.Group>
    )
  );
}

if (isSelectGroup) {
  const selectValue = pathToSelectValue(value);

  return (
    <Form.Group as={Wrapper} {...wrapperProps} md={colWidth}>
      <Form.Label>{label}</Form.Label>

      <Form.Select
        className="c-black cursor"
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          onChange(selectValueToPath(v));
        }}
      >
        <option value="">— Select link —</option>

        {options?.map(group => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
      </Form.Select>

      {value && (
        <Form.Text className="c-white small">
          Generated path: <code>{value}</code>
        </Form.Text>
      )}
    </Form.Group>
  );
}



  if (isCheckbox) {
      return (
          <Form.Group as={Wrapper} {...wrapperProps} md={colWidth} >
              <Form.Check 
                  type="checkbox" 
                  label={label}
                  disabled={readOnly}
                  className='cursor'
                  checked={value || false}
                  onChange={(e) => onChange(e.target.checked)}
              />
              {isSimpleBtn && readOnly && (
                <Form.Text className="text-warning">
                  Remove extra variants to enable Simple item mode.
                </Form.Text>
              )}

          </Form.Group>
      );
  }
  if (isMultiImage) {
    return (
      <Form.Group as={Wrapper} {...wrapperProps} md={colWidth}>
        <MultiImageInput
          label={label}
          name={name}
          controlId={controlId}
          formData={formData}
          readOnly={readOnly}
          maxImages={maxImages}
          onChange={(updated) => onChange(updated)}
        />
      </Form.Group>
    );
  }
  
  
  if (isImage) {
    return (
      <Form.Group as={Wrapper} {...wrapperProps} md={colWidth}>
        <Form.Label className='cursor'>{label}</Form.Label>
        <div className="image-Container">
          <Form.Control
            controlId={controlId}
            type="file"
            hidden={true}
            accept={accept || 'image/*'}
            onChange={(e) => {
              const file = e.target.files && e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onloadend = () => {
                const dataUrl = reader.result;
                const base64Only = typeof dataUrl === 'string' ? dataUrl.split(',')[1] : '';
                onChange({ [imageValueKey]: base64Only, [previewKey]: dataUrl });
              };
              reader.readAsDataURL(file);
            }}
          />
          {formData && formData[previewKey] && (
          <Ratio aspectRatio="1x1">
            <img
              src={formData[previewKey]}
              alt="preview"
              width="200px"
              height="200px"
              style={{ display: 'block', marginTop: '8px' }}
            />
            </Ratio>
          )}
        </div>
      </Form.Group>
    );
  }

  if (isEditor) {

      return (
          <Form.Group as={Wrapper} {...wrapperProps} md={colWidth}>
            <Form.Label>{label}</Form.Label>
            <Editor
                ref={quillRef}
                placeholder={placeholder}
                initialValue={value}
                onChange={onChange} // Assuming the Editor component calls onChange with the new value (not event)
                previewMode={false}
                readOnly={false}
            />
          </Form.Group>
      );
  }

if (colorPicker) {
  return (
    <Form.Group as={Wrapper} {...wrapperProps} md={colWidth}>
      <Form.Label>{label}</Form.Label>
      <MultiColorPicker
        value={value}
        onChange={onChange}
        readOnly={readOnly}
      />
    </Form.Group>
  );
}

if (rangeInput) {
  return (
    <Form.Group as={Wrapper} {...wrapperProps} md={colWidth}>
      <Form.Label>{label}</Form.Label>
      <RangeInput
        value={value}
        onChange={onChange}
        readOnly={readOnly}
      />
    </Form.Group>
  );
}
if (isMultiSelect) {
  return (
    !readOnly && (
      <Form.Group as={Wrapper} {...wrapperProps} md={colWidth}>
        <Form.Label>{label}</Form.Label>
        <Select
          isMulti
          className="react-select-container c-black cursor"
          classNamePrefix="react-select"
          value={
            options.filter(opt =>
              value?.map(v => v.value).includes(opt.value)
            )
          }
          onChange={(selected) => {
            // const selectedValues = selected.map((opt) => opt.value);
            onChange(selected);
          }}
          options={options.map((o) => ({
            value: o.value,
            label: o.label,
            isDisabled: o.isDisabled === true
          }))}
          isDisabled={readOnly}
        />

      </Form.Group>
    )
  );
}



  return (
      (               
        !readOnly && 
        <Form.Group as={Wrapper} {...wrapperProps} md={colWidth}>
        <Form.Label>{label} </Form.Label>
        {isSelect ? (
          <Form.Select
          className='c-black cursor'
          aria-label="Default select example"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value.replace(/\s+/g, ' ').trim())}
        >
    <option value="" disabled>Select...</option>
    {options?.map(o => (
      <option disabled={o.isDisabled === true} key={String(o.value)} value={String(o.value)}>
        {o.label}
      </option>
    ))}
  </Form.Select>
          ) : (
          <Form.Control 
            type={type || 'text'} 
            placeholder={placeholder} 
            value={value || ''}
            required={required}
            readOnly={readOnly}
            onChange={(e) => {
                onChange(e.target.value)}}
          />
        
        )}
      </Form.Group>
      )
  );
}

// --------------------------------------------------------------------------
// Main Reusable Form Component (AdminForm)
// --------------------------------------------------------------------------
export default function AdminForm({ fields, formData, onChange, validation = {} }) {
  const isImageField = (field) => field.type === 'file' || (typeof field.accept === 'string' && field.accept.includes('image'));
  // console.log(fields);
  // 🔑 KEY CHANGE 3: Grouping logic is the same but crucial for Row rendering
  const groupedFields = fields.reduce((acc, field) => {
    // Use the 'row' property from the field object for grouping
    const rowKey = field.row || field.controlId; 
    if (!acc[rowKey]) {
      acc[rowKey] = [];
    }
    acc[rowKey].push(field);
    return acc;
  }, {});


  return (
    <div>
      {Object.values(groupedFields).map((fieldGroup, index) => {
        
        // Check if all fields in the group have a colWidth property
        const isGridRow = fieldGroup.every(field => field.colWidth);

        // Render a Row only if the fields are meant to be grouped horizontally (via colWidth)
        // Otherwise, just render the field block (it will have its own mb-3)
        return (
          // 🔑 KEY CHANGE 4: Conditionally apply <Row> wrapper
          <React.Fragment key={index}>
            {isGridRow ? (
              <Row className="mb-3">
                {fieldGroup.map((field) => (
                  <FormField 
                    key={field.controlId}
                    fieldData={field}
                    value={formData[field.name]}
                    onChange={(newValue) => {
                      if (isImageField(field)) {
                        // when image field, newValue is an object with keys
                        Object.entries(newValue).forEach(([k, v]) => onChange(k, v));
                      } else {
                        onChange(field.name, newValue)
                      }
                    }}
                    isValid={validation[field.name] !== false}
                    formData={formData}
                  />
                ))}
              </Row>
            ) : (
              // Render fields directly if they are not meant for grid layout
              fieldGroup.map((field) => (
                <FormField 
                  key={field.controlId}
                  fieldData={field}
                  value={formData[field.name]}
                  onChange={(newValue) => {
                    if (isImageField(field)) {
                      Object.entries(newValue).forEach(([k, v]) => onChange(k, v));
                    } else {
                      onChange(field.name, newValue)
                    }
                  }}
                  formData={formData}
                />
              ))
            )}
          </React.Fragment>
        )
      })}
    </div>
  );
}