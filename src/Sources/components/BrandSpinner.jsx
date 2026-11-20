// 3DSTL spinner: the logo hexagon with a violet stroke running around it and a pulsing cube.
// <BrandSpinner size={48} />  ·  <BrandSpinner size={16} inline />  ·  <PageLoader text="Loading…" />
import React from 'react';
import '../Style/GlobalLoader.css';

export default function BrandSpinner({ size = 48, inline = false, className = '' }) {
  return (
    <svg
      className={`brand-spinner ${inline ? 'brand-spinner-inline' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="status"
      aria-label="Loading"
    >
      {/* track */}
      <polygon className="bs-track" points="50,6 88,28 88,72 50,94 12,72 12,28" />
      {/* running stroke */}
      <polygon className="bs-run" points="50,6 88,28 88,72 50,94 12,72 12,28" />
      {/* cube */}
      <g className="bs-cube">
        <polygon points="50,30 67,40 50,50 33,40" fill="#6e5fff" />
        <polygon points="33,40 50,50 50,70 33,60" fill="#5143dd" />
        <polygon points="67,40 50,50 50,70 67,60" fill="#6a4dff" />
      </g>
    </svg>
  );
}

export function PageLoader({ text = 'Loading…', size = 56 }) {
  return (
    <div className="page-loader">
      <BrandSpinner size={size} />
      {text && <div className="page-loader-text">{text}</div>}
    </div>
  );
}
