import type * as React from 'react';
import type { JSXIntrinsicElement, JSXIntrinsicElementKeys } from '@fluentui/react-utilities';

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
    type ElementType = React.JSX.ElementType;
    type IntrinsicElements = { [Tag in JSXIntrinsicElementKeys]: JSXIntrinsicElement<Tag> };
    type IntrinsicAttributes = React.JSX.IntrinsicAttributes;
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
  }
}
