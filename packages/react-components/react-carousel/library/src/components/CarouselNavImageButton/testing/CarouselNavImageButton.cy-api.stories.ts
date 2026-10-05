import type { CarouselNavImageButtonProps } from '../CarouselNavImageButton.types';

export const nativeImageAPI: CarouselNavImageButtonProps = {
  image: {
    src: 'thumbnail.png',
    alt: '',
    width: 40,
    height: 40,
    style: { objectFit: 'cover', borderRadius: '50%' },
  },
  disabledFocusable: true,
  'aria-label': 'Preview',
};
declare const props: CarouselNavImageButtonProps;
// @ts-expect-error Required native image slot is not optional.
export const missingImage: CarouselNavImageButtonProps = { 'aria-label': 'Preview' };
// @ts-expect-error ImageButton is not a Button size variant.
export type UnsupportedSize = typeof props.size;
// @ts-expect-error ImageButton is not a Button shape variant.
export type UnsupportedShape = typeof props.shape;
// @ts-expect-error Native img slot has no Fluent Image fit prop.
export type UnsupportedFit = typeof props.image.fit;
// @ts-expect-error NavButton appearance is not an ImageButton prop.
export type UnsupportedAppearance = typeof props.appearance;
