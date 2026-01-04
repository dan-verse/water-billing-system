import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Professional, accessible select component
 */
const FormSelect = React.forwardRef(({
  placeholder,
  error,
  children,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={`w-full px-4 py-2.5 text-gray-900 placeholder-gray-400 bg-white border rounded-lg transition-colors appearance-none
          ${error 
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          }
          focus:outline-none
          ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
    </div>
  );
});

FormSelect.displayName = 'FormSelect';

export default FormSelect;
