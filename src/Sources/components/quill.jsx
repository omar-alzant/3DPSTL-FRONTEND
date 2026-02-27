import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import "react-quill/dist/quill.snow.css";
import QuillEditor from "./QuillEditor ";

const Editor = ({ 
  initialValue, 
  onChange, 
  readOnly, 
  placeholder, 
  previewMode, 
  previewStyle, 
  maxWidth = "", 
  isImage = false, 
  isVideo = false, 
  isValid = true,
  readMoreLimit = 150 // New Prop: character limit before showing Read More
}) => {
  const [editorHtml, setEditorHtml] = useState(initialValue || "");
  const [isExpanded, setIsExpanded] = useState(false); // State for Read More
  const quillRef = useRef(null);
  
  // Basic HTML tag stripper to count actual text length
  const plainText = editorHtml.replace(/<[^>]*>/g, "");
  const isLongContent = plainText.length > readMoreLimit;

  let toolbar = [
    [{ header: "1" }, { header: "2" }, { font: [] }],
    [{ size: [] }],
    ["bold", "italic", "underline", "strike", "blockquote"],
    [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
    ["link", isImage ? "image" : null, isVideo ? "video" : null],
    ["clean"],
  ].map(row => row.filter(item => item !== null));

  const modules = {
    toolbar,
    clipboard: { matchVisual: false },
  };

  useEffect(() => {
    setEditorHtml(initialValue || "");
  }, [initialValue]);

  const handleChange = (html) => {
    setEditorHtml(html);
    if (onChange) onChange(html);
  };

  return (
    <div className={`app brr ${!isValid ? 'br-danger' : ''}`} style={{ maxWidth: maxWidth, margin: "auto" }}>
      {!previewMode ? (
      <QuillEditor
      ref={quillRef}
      theme="snow"
      value={editorHtml}
      onChange={handleChange}
      modules={modules}
      formats={Editor.formats}
      placeholder={placeholder}
      readOnly={readOnly}
    />
    
      ) : (
        <div style={{ position: 'relative' }}>
          <div
            className={!isExpanded && isLongContent ? "quill-read-more-truncated" : ""}
            style={{ 
              ...previewStyle, 
              overflow: 'hidden',
              // Use line-clamp to safely truncate HTML visually
              display: !isExpanded && isLongContent ? '-webkit-box' : 'block',
              WebkitLineClamp: !isExpanded && isLongContent ? 3 : 'unset',
              WebkitBoxOrient: 'vertical'
            }}
            dangerouslySetInnerHTML={{ __html: editorHtml }}
          />
          
          {isLongContent && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                background: 'none',
                border: 'none',
                color: '#007bff',
                padding: '5px 0',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem'
              }}
            >
              {isExpanded ? "Show Less" : "Read More..."}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ... formats and propTypes remain the same
Editor.formats = [
  "header", "font", "size", "bold", "italic", "underline", "strike", 
  "blockquote", "list", "bullet", "indent", "link", "image", "video",
];

Editor.propTypes = {
  readOnly: PropTypes.bool,
  placeholder: PropTypes.string,
  initialValue: PropTypes.string,
  onChange: PropTypes.func,
  previewMode: PropTypes.bool,
  previewStyle: PropTypes.object,
  readMoreLimit: PropTypes.number
};

export default Editor;