import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
// Bootstrap CSS is loaded from public/vendor/bootstrap by index.html (LTR or RTL, switched by the language)
import './index.css';
import './Sources/Style/theme.css'; // logo colours — keep this last
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { ToastProvider } from './Sources/context/ToastProvider';
import { installErrorReporting } from './Sources/lib/reportError';

installErrorReporting();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
