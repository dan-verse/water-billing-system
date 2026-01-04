import React from 'react';

/**
 * Reusable form field component with clear label, input, and error display
 * Ensures labels are always visible and properly styled
 */
const FormField = ({
  label,
  required = false,
  error,
  children,
  hint,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-gray-900">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}

      {children}

      {hint && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}

      {error && (
        <p className="text-xs font-medium text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18.101 12.93l-.9-15A1 1 0 0016.337 1H3.663A1 1 0 002.8-2.07l-.9 15H0v2h20v-2h-1.899zM4 4h12v13H4V4zm9 9H9v-2h4v2z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;
