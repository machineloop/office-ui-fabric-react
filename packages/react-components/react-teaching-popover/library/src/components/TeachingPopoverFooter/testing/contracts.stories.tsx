import * as React from 'react';
import { TeachingPopoverFooter } from '../../../TeachingPopoverFooter';
import type {
  TeachingPopoverFooterProps,
  TeachingPopoverFooterBaseProps,
  TeachingPopoverFooterSlots,
} from '../../../TeachingPopoverFooter';

export const props: TeachingPopoverFooterProps = {
  primary: { children: 'Localized primary', type: 'submit', disabledFocusable: true },
  secondary: null,
  footerLayout: 'vertical',
};
export const base: TeachingPopoverFooterBaseProps = { children: 'Headless children', footerLayout: 'horizontal' };
export const nativeRef = React.createRef<HTMLDivElement>();
export const accepted = <TeachingPopoverFooter {...props} ref={nativeRef} />;
// @ts-expect-error Footer has no primary-action API; callbacks belong on Button slots.
export const noPrimaryAction: TeachingPopoverFooterProps = { primary: 'OK', onPrimaryAction: () => undefined };
// @ts-expect-error Footer has no secondary-action API.
export const noSecondaryAction: TeachingPopoverFooterProps = { primary: 'OK', onSecondaryAction: () => undefined };
// @ts-expect-error Primary is mandatory and non-nullable.
export const noNullPrimary: TeachingPopoverFooterProps = { primary: null };
// @ts-expect-error Footer has no appearance prop; it reads Popover context.
export const noAppearance: TeachingPopoverFooterProps = { primary: 'OK', appearance: 'brand' };
// @ts-expect-error Footer has no size prop; Button slots do.
export const noSize: TeachingPopoverFooterProps = { primary: 'OK', size: 'large' };
// @ts-expect-error Layout is not arbitrary.
export const noLayout: TeachingPopoverFooterProps = { primary: 'OK', footerLayout: 'diagonal' };
// @ts-expect-error Root is a non-nullable div slot.
export const noNullRoot: TeachingPopoverFooterSlots['root'] = null;
// @ts-expect-error Footer root has no arbitrary section polymorphism.
export const noSection: TeachingPopoverFooterProps = { primary: 'OK', as: 'section' };
// @ts-expect-error Button's public as API does not include span; source-only replacement uses a render function.
export const noSpanButton: TeachingPopoverFooterProps = { primary: { as: 'span', children: 'OK' } };
// @ts-expect-error Root ref is HTMLDivElement, not an SVG element.
export const noSVGRef = <TeachingPopoverFooter primary="OK" ref={React.createRef<SVGSVGElement>()} />;
