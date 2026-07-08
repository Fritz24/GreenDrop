'use client';
import { Leaf } from 'lucide-react';

export default function Loader({ message = 'Loading...' }) {
  return (
    <div className="page-loader-container">
      <div className="logo-spinner-container">
        <Leaf size={24} className="leaf-loader-icon" style={{ color: 'var(--primary)' }} />
        <div className="spinner-ring"></div>
      </div>
      <p className="loader-text">{message}</p>
    </div>
  );
}
