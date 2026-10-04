import type * as React from 'react';

// The package Cypress program already supplies these nonmergeable aliases.
declare global {
  namespace JSX {
    type ElementType = React.JSX.ElementType;
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
  }
}
