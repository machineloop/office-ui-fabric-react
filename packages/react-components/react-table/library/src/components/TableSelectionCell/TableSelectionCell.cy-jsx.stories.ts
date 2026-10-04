import type * as React from 'react';

declare global {
  namespace JSX {
    type ElementType = React.JSX.ElementType;
    interface Element extends React.ReactElement {}
    interface ElementClass extends React.Component {}
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicAttributes extends React.Attributes {}
    interface IntrinsicClassAttributes<T> extends React.ClassAttributes<T> {}
    // eslint-disable-next-line @typescript-eslint/no-restricted-types -- Cypress-only bridge for installed React 19 types.
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
  }
}
