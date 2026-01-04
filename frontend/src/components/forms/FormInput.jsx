import React from 'react';

/**
 * Professional, accessible input component
 * Used within FormField component for consistent styling
 */
const FormInput = React.forwardRef(({
  type = 'text',
  placeholder,
  error,
  className = '',
  ...props
}, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      placeholder={placeholder}
      className={`w-full px-4 py-2.5 text-gray-900 placeholder-gray-400 bg-white border rounded-lg transition-colors
        ${error 
          ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
          : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
        }
        focus:outline-none
        ${className}`}
      {...props}
    />
  );
});

FormInput.displayName = 'FormInput';

export default FormInput;
