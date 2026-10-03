import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { isConformant } from '../../testing/isConformant';
import { TagPickerControl } from './TagPickerControl';
import { TagPickerContextProvider, tagPickerContextDefaultValue } from '../../contexts/TagPickerContext';
import { tagPickerControlAsideWidthToken } from './useTagPickerControlStyles.styles';

describe('TagPickerControl', () => {
  isConformant({
    Component: TagPickerControl,
    displayName: 'TagPickerControl',
    requiredProps: {
      secondaryAction: 'secondary action',
    },
  });

  it('renders a default state', () => {
    const result = render(<TagPickerControl>Default PickerControl</TagPickerControl>);
    expect(result.container).toMatchSnapshot();
  });

  it('preserves the consumer mousedown handler before requesting an open change', () => {
    const setOpen = jest.fn();
    const consumer = jest.fn();
    const { getByTestId } = render(
      <TagPickerContextProvider value={{ ...tagPickerContextDefaultValue, setOpen }}>
        <TagPickerControl data-testid="control" onMouseDown={consumer} />
      </TagPickerContextProvider>,
    );
    fireEvent.mouseDown(getByTestId('control'));
    expect(consumer).toHaveBeenCalledTimes(1);
    expect(setOpen).toHaveBeenCalledTimes(1);
    expect(consumer.mock.invocationCallOrder[0]).toBeLessThan(setOpen.mock.invocationCallOrder[0]);
  });

  it('allows the consumer mousedown handler to cancel internal opening', () => {
    const setOpen = jest.fn();
    const consumer = jest.fn((event: React.MouseEvent<HTMLDivElement>) => event.preventDefault());
    const { getByTestId } = render(
      <TagPickerContextProvider value={{ ...tagPickerContextDefaultValue, setOpen }}>
        <TagPickerControl data-testid="control" onMouseDown={consumer} />
      </TagPickerContextProvider>,
    );
    fireEvent.mouseDown(getByTestId('control'));
    expect(consumer).toHaveBeenCalledTimes(1);
    expect(setOpen).not.toHaveBeenCalled();
  });

  it('clears measured aside width when both adornment slots are removed', () => {
    const { getByTestId, rerender } = render(<TagPickerControl data-testid="control" secondaryAction="More" />);
    const control = getByTestId('control');
    control.style.setProperty(tagPickerControlAsideWidthToken, '64px');
    rerender(<TagPickerControl data-testid="control" expandIcon={null} secondaryAction={null} />);
    expect(control.style.getPropertyValue(tagPickerControlAsideWidthToken)).toBe('');
  });

  it('preserves explicitly supplied aside width when no adornments exist', () => {
    const { getByTestId } = render(
      <TagPickerControl
        data-testid="control"
        expandIcon={null}
        secondaryAction={null}
        style={{ [tagPickerControlAsideWidthToken]: '48px' }}
      />,
    );
    expect(getByTestId('control').style.getPropertyValue(tagPickerControlAsideWidthToken)).toBe('48px');
  });
});
