import type * as React from 'react';
import type { JSXIntrinsicElement, JSXIntrinsicElementKeys } from '@fluentui/react-utilities';
type NativeElements = { [Tag in JSXIntrinsicElementKeys]: JSXIntrinsicElement<Tag> };
declare global {
  namespace JSX {
    interface IntrinsicElements extends NativeElements {}
    interface IntrinsicAttributes extends React.JSX.IntrinsicAttributes {}
    interface ElementChildrenAttribute {
      children: {};
    }
  }
}
