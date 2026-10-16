import type * as React from 'react';

// Isolated programs need these aliases; keep them separate from the mergeable interfaces.
declare global {
  namespace JSX {
    type ElementType = React.JSX.ElementType;
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
  }
}
