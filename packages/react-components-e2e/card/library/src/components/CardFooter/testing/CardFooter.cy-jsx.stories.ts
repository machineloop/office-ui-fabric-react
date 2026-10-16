import type * as React from 'react';

// Match the isolated DrawerFooter runner's React 19/global Fluent JSX compatibility bridge.
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
    // eslint-disable-next-line @typescript-eslint/no-restricted-types -- Mergeable Cypress-only React 19 bridge.
    interface IntrinsicElements extends React.JSX.IntrinsicElements {}
  }
}
