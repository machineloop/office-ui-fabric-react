import type * as React from 'react';

// Private programs need aliases; the standard Cypress program already supplies them.
declare global {
  namespace JSX {
    type ElementType = React.JSX.ElementType;
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
  }
}
