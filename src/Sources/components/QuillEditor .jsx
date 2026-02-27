import React, { forwardRef } from "react";
import ReactQuill from "react-quill";

const QuillEditor = forwardRef((props, ref) => {
  return <ReactQuill ref={ref} {...props} />;
});

QuillEditor.displayName = "QuillEditor";

export default QuillEditor;
