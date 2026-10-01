import * as React from 'react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { render, fireEvent, screen } from '@testing-library/react';
import { SearchBox } from './SearchBox';
import { isConformant } from '../../testing/isConformant';
import { resetIdsForTests } from '@fluentui/react-utilities';
import { searchBoxClassNames } from './useSearchBoxStyles.styles';

function getSearchBox(): HTMLInputElement {
  return screen.getByRole('searchbox') as HTMLInputElement;
}

describe('SearchBox', () => {
  beforeEach(() => {
    resetIdsForTests();
  });

  let renderedComponent: RenderResult | undefined;

  afterEach(() => {
    if (renderedComponent) {
      renderedComponent.unmount();
      renderedComponent = undefined;
    }
  });

  isConformant({
    Component: SearchBox,
    displayName: 'SearchBox',
    primarySlot: 'input',
    testOptions: {
      'has-static-classnames': [
        {
          props: {
            contentBefore: 'Test ContentBefore',
            contentAfter: 'Test ContentAfter',
            dismiss: 'Test Dismiss',
          },
          expectedClassNames: {
            root: searchBoxClassNames.root,
            contentAfter: searchBoxClassNames.contentAfter,
            dismiss: searchBoxClassNames.dismiss,
          },
        },
      ],
      'consistent-callback-args': {
        legacyCallbacks: ['onChange'],
      },
    },
  });

  it('renders a default state', () => {
    const result = render(<SearchBox />);
    expect(result.container).toMatchSnapshot();
  });

  // Tests from Input, added here since they were reimplemented for SearchBox
  it('respects value', () => {
    renderedComponent = render(<SearchBox value="hello" />);
    expect(getSearchBox().value).toEqual('hello');
  });

  it('respects updates to value', () => {
    renderedComponent = render(<SearchBox value="hello" />);
    expect(getSearchBox().value).toEqual('hello');

    renderedComponent.rerender(<SearchBox value="world" />);
    expect(getSearchBox().value).toEqual('world');
  });

  it('respects defaultValue', () => {
    renderedComponent = render(<SearchBox defaultValue="hello" />);
    expect(getSearchBox().value).toEqual('hello');
  });

  it('ignores updates to defaultValue', () => {
    renderedComponent = render(<SearchBox defaultValue="hello" />);
    expect(getSearchBox().value).toEqual('hello');

    renderedComponent.rerender(<SearchBox defaultValue="world" />);
    expect(getSearchBox().value).toEqual('hello');
  });

  it('prefers value over defaultValue', () => {
    renderedComponent = render(<SearchBox value="hello" defaultValue="world" />);
    expect(getSearchBox().value).toEqual('hello');
  });

  it('with value, calls onChange but does not update on text entry', () => {
    const onChange = jest.fn();
    renderedComponent = render(<SearchBox value="hello" onChange={onChange} />);
    const searchBox = getSearchBox();
    fireEvent.change(searchBox, { target: { value: 'world' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][1]).toEqual({ value: 'world' });
    expect(searchBox.value).toBe('hello');
  });

  it('with defaultValue, calls onChange and updates value on text entry', () => {
    const onChange = jest.fn();
    renderedComponent = render(<SearchBox defaultValue="hello" onChange={onChange} />);
    const searchBox = getSearchBox();
    fireEvent.change(searchBox, { target: { value: 'world' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][1]).toEqual({ value: 'world' });
    expect(searchBox.value).toBe('world');
  });

  it('does not call onChange when value prop updates', () => {
    const onChange = jest.fn();
    renderedComponent = render(<SearchBox value="hello" onChange={onChange} />);
    renderedComponent.rerender(<SearchBox value="world" onChange={onChange} />);
    expect(onChange).toHaveBeenCalledTimes(0);
  });

  it('clears value when dismiss is clicked', () => {
    const onClick = jest.fn();
    renderedComponent = render(<SearchBox defaultValue="hello" dismiss={{ onClick }} />);

    userEvent.click(renderedComponent.getByRole('button'));
    expect(getSearchBox().value).toBe('');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('invokes `onChange` when the dismiss button is clicked', () => {
    const onChange = jest.fn();
    renderedComponent = render(<SearchBox defaultValue="hello" onChange={onChange} />);

    userEvent.click(renderedComponent.getByRole('button'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ value: '' }));
  });

  it.each(['Enter', ' '])('clears with dismiss keyboard activation for %s', key => {
    const onChange = jest.fn();
    renderedComponent = render(<SearchBox defaultValue="hello" onChange={onChange} dismiss={{ tabIndex: 0 }} />);
    const dismiss = renderedComponent.getByRole('button');
    fireEvent.keyDown(dismiss, { key });
    if (key === ' ') {
      expect(getSearchBox().value).toBe('hello');
      fireEvent.keyUp(dismiss, { key });
    }
    expect(getSearchBox().value).toBe('');
    expect(document.activeElement).toBe(getSearchBox());
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('does not clear a disabled search through dismiss activation', () => {
    const onChange = jest.fn();
    renderedComponent = render(<SearchBox disabled defaultValue="hello" onChange={onChange} />);
    const dismiss = renderedComponent.getByRole('button');
    fireEvent.click(dismiss);
    fireEvent.keyDown(dismiss, { key: 'Enter' });
    fireEvent.keyDown(dismiss, { key: ' ' });
    fireEvent.keyUp(dismiss, { key: ' ' });
    expect(getSearchBox().value).toBe('hello');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('respects consumer prevention of Space keydown without a keyup handler', () => {
    const onChange = jest.fn();
    renderedComponent = render(
      <SearchBox defaultValue="hello" onChange={onChange} dismiss={{ onKeyDown: ev => ev.preventDefault() }} />,
    );
    const dismiss = renderedComponent.getByRole('button');
    fireEvent.keyDown(dismiss, { key: ' ' });
    fireEvent.keyUp(dismiss, { key: ' ' });
    expect(getSearchBox().value).toBe('hello');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('cancels pending Space activation when dismiss loses focus', () => {
    const onChange = jest.fn();
    renderedComponent = render(<SearchBox defaultValue="hello" onChange={onChange} />);
    const dismiss = renderedComponent.getByRole('button');
    fireEvent.keyDown(dismiss, { key: ' ' });
    fireEvent.blur(dismiss);
    fireEvent.keyUp(dismiss, { key: ' ' });
    expect(getSearchBox().value).toBe('hello');
    expect(onChange).not.toHaveBeenCalled();
  });
});
