import type * as React from 'react';

// Nonmergeable aliases belong only to the isolated owned TypeScript program.
declare global {
  namespace JSX {
    type ElementType = React.JSX.ElementType;
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
  }
}
