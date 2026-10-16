import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { isConformant } from '../../testing/isConformant';
import { TagPickerGroup } from './TagPickerGroup';
import { TagPickerContextProvider, tagPickerContextDefaultValue } from '../../contexts/TagPickerContext';

const Wrapper: React.FC<{ children?: React.ReactNode }> = props => (
  <TagPickerContextProvider
    value={{
      ...tagPickerContextDefaultValue,
      selectedOptions: ['some option'],
    }}
  >
    {props.children}
  </TagPickerContextProvider>
);

describe('TagPickerGroup', () => {
  isConformant({
    Component: TagPickerGroup,
    renderOptions: { wrapper: Wrapper },
    displayName: 'TagPickerGroup',
  });

  // TODO add more tests here, and create visual regression tests in /apps/vr-tests

  it('renders a default state', () => {
    const result = render(<TagPickerGroup>Default TagPickerGroup</TagPickerGroup>);
    expect(result.container).toMatchSnapshot();
  });

  it('does not move focus to the trigger when the caller cancels ArrowRight', () => {
    const triggerRef = React.createRef<HTMLInputElement>();
    const result = render(
      <TagPickerContextProvider value={{ ...tagPickerContextDefaultValue, selectedOptions: ['Alpha'], triggerRef }}>
        <TagPickerGroup tabIndex={0} onKeyDown={event => event.preventDefault()}>
          Alpha
        </TagPickerGroup>
        <input ref={triggerRef} />
      </TagPickerContextProvider>,
    );
    const group = result.getByRole('listbox');
    group.focus();
    fireEvent.keyDown(group, { key: 'ArrowRight' });

    expect(document.activeElement).toBe(group);
  });
});
