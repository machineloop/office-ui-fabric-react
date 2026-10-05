import type * as React from 'react';
import type {
  ColorPickerBaseProps,
  ColorPickerBaseState,
  ColorPickerOnChangeData,
  ColorPickerProps,
  ColorPickerSlots,
  ColorPickerState,
} from '../index';

type Assert<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export type ColorPickerApiContracts = [
  Assert<Equal<'defaultColor' extends keyof ColorPickerProps ? true : false, false>>,
  Assert<Equal<'shape' extends keyof ColorPickerBaseProps ? true : false, false>>,
  Assert<Equal<'shape' extends keyof ColorPickerBaseState ? true : false, false>>,
  Assert<Equal<keyof ColorPickerSlots, 'root'>>,
  Assert<Equal<ColorPickerProps['shape'], 'rounded' | 'square' | undefined>>,
  Assert<Equal<ColorPickerState['color'], ColorPickerProps['color']>>,
  Assert<Equal<ColorPickerOnChangeData['type'], 'change' | undefined>>,
  Assert<Equal<Extract<ColorPickerOnChangeData, { type: 'change' }>['event'], React.ChangeEvent<HTMLInputElement>>>,
  Assert<Equal<Parameters<NonNullable<ColorPickerProps['onColorChange']>>[0], React.SyntheticEvent | Event>>,
  Assert<Equal<keyof ColorPickerOnChangeData, 'type' | 'event' | 'color'>>,
];
