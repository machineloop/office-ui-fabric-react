import type * as React from 'react';

// Fluent's source JSX runtime is global; installed React 19 declares its real types under React.JSX.
declare global {
  namespace JSX {
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
    // eslint-disable-next-line @typescript-eslint/no-restricted-types -- Cypress-only bridge to actual React 19 intrinsics.
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}
