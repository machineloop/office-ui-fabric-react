import type * as React from 'react';
import type {} from './CardFooter.cy-jsx.stories';

// The unchanged package Cypress program does not import CardHeader's story bridge.
// This single type-only registration serves both the package and isolated programs.
declare global {
  namespace JSX {
    type ElementType = React.JSX.ElementType;
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
  }
}
