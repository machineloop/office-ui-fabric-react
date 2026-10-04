import type * as React from 'react';

declare global {
  namespace JSX {
    type ElementType = React.JSX.ElementType;
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
  }
}
