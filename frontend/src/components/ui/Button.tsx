import React from 'react';

/**
 * Button component - Generic reusable button
 */
export default function Button({ children, ...props }: any) {
  return <button {...props}>{children}</button>;
}
