import type * as React from 'react';

// Installed React 19 scopes JSX under React; Fluent's source runtime uses the global namespace.
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
    // eslint-disable-next-line @typescript-eslint/no-restricted-types -- Cypress-only bridge for installed React 19 types.
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}
