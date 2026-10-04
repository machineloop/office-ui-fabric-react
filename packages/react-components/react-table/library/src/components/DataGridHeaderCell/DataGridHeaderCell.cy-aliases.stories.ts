import type * as React from 'react';

// Only isolated projects include these aliases; package Cypress already supplies them.
declare global {
  namespace JSX {
    type ElementType = React.JSX.ElementType;
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
  }
}
