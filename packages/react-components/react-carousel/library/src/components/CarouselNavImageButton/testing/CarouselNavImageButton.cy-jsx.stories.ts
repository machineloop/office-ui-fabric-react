import type * as React from 'react';
import type { JSXIntrinsicElement, JSXIntrinsicElementKeys } from '@fluentui/react-components';

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
    type IntrinsicElements = { [Tag in JSXIntrinsicElementKeys]: JSXIntrinsicElement<Tag> };
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<C, P>;
  }
}
