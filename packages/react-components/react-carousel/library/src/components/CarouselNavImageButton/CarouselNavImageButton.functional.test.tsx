import * as React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { CarouselNavImageButton } from './CarouselNavImageButton';
import { CarouselProvider, carouselContextDefaultValue } from '../CarouselContext';
import { CarouselNavIndexContextProvider } from '../CarouselNav/CarouselNavIndexContext';
import type { CarouselUpdateData } from '../Carousel/Carousel.types';

describe('CarouselNavImageButton functional ONLY131', () => {
  const props = { 'aria-label': 'Sea preview', image: { src: 'sea.png' } };
  it('renders the required image with decorative defaults and a named tab root', () => {
    const { getByRole, container } = render(<CarouselNavImageButton {...props} />);
    expect(getByRole('tab').getAttribute('aria-label')).toBe('Sea preview');
    expect(getByRole('tab').getAttribute('aria-selected')).toBe('true');
    expect(getByRole('tab').getAttribute('type')).toBe('button');
    const image = container.querySelector('img')!;
    expect(image.getAttribute('src')).toBe('sea.png');
    expect(image.getAttribute('alt')).toBe('');
    expect(image.getAttribute('aria-hidden')).toBe('true');
    expect(image.getAttribute('role')).toBe('presentation');
  });
  it('routes image and root attributes independently', () => {
    const { getByRole, container } = render(
      <CarouselNavImageButton
        {...props}
        title="Root"
        name="preview"
        image={{ src: 'sea.png', alt: 'Sea', title: 'Thumbnail', width: 100 }}
      />,
    );
    expect(getByRole('tab').getAttribute('title')).toBe('Root');
    expect(getByRole('tab').getAttribute('name')).toBe('preview');
    expect(container.querySelector('img')!.getAttribute('title')).toBe('Thumbnail');
    expect(container.querySelector('img')!.getAttribute('alt')).toBe('Sea');
    expect(container.querySelector('img')!.getAttribute('width')).toBe('100');
  });
  it('forwards root and image refs and clears both on unmount', () => {
    const rootRef = React.createRef<HTMLButtonElement>();
    const imageRef = React.createRef<HTMLImageElement>();
    const { getByRole, container, unmount } = render(
      <CarouselNavImageButton {...props} ref={rootRef} image={{ src: 'sea.png', ref: imageRef }} />,
    );
    expect(rootRef.current).toBe(getByRole('tab'));
    expect(imageRef.current).toBe(container.querySelector('img'));
    unmount();
    expect(rootRef.current).toBe(null);
    expect(imageRef.current).toBe(null);
  });
  it('calls consumer click before selection and does not inherit NavButton autoplay reset', () => {
    const calls: string[] = [];
    const { getByRole } = render(
      <CarouselProvider
        value={{
          ...carouselContextDefaultValue,
          selectPageByIndex: (_, index) => calls.push(`select:${index}`),
          resetAutoplay: () => calls.push('reset'),
        }}
      >
        <CarouselNavIndexContextProvider value={3}>
          <CarouselNavImageButton {...props} onClick={() => calls.push('consumer')} />
        </CarouselNavIndexContextProvider>
      </CarouselProvider>,
    );
    fireEvent.click(getByRole('tab'));
    expect(calls).toEqual(['consumer', 'select:3']);
  });
  it('consumer click prevention vetoes selection', () => {
    const select = jest.fn();
    const { getByRole } = render(
      <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select }}>
        <CarouselNavImageButton {...props} onClick={event => event.preventDefault()} />
      </CarouselProvider>,
    );
    fireEvent.click(getByRole('tab'));
    expect(select).not.toHaveBeenCalled();
  });
  it('image preventDefault vetoes the root selection while preserving root notification', () => {
    const select = jest.fn();
    const rootClick = jest.fn();
    const { container } = render(
      <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select }}>
        <CarouselNavImageButton
          {...props}
          onClick={rootClick}
          image={{ src: 'sea.png', onClick: event => event.preventDefault() }}
        />
      </CarouselProvider>,
    );
    fireEvent.click(container.querySelector('img')!);
    expect(rootClick).toHaveBeenCalledTimes(1);
    expect(select).not.toHaveBeenCalled();
  });
  it('selects the provider index rather than native value or data-index', () => {
    const select = jest.fn();
    const { getByRole } = render(
      <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select }}>
        <CarouselNavIndexContextProvider value={2}>
          <CarouselNavImageButton {...props} value="99" data-index="99" />
        </CarouselNavIndexContextProvider>
      </CarouselProvider>,
    );
    fireEvent.click(getByRole('tab'));
    expect(select).toHaveBeenCalledTimes(1);
    expect(select.mock.calls[0][1]).toBe(2);
  });
  it('nonmatching context index is not selected', () => {
    const { getByRole } = render(
      <CarouselProvider value={{ ...carouselContextDefaultValue, activeIndex: 1 }}>
        <CarouselNavIndexContextProvider value={2}>
          <CarouselNavImageButton {...props} />
        </CarouselNavIndexContextProvider>
      </CarouselProvider>,
    );
    expect(getByRole('tab').getAttribute('aria-selected')).toBe('false');
  });
  it('caller aria-selected overrides the root default', () => {
    const { getByRole } = render(<CarouselNavImageButton {...props} aria-selected={false} />);
    expect(getByRole('tab').getAttribute('aria-selected')).toBe('false');
  });
  it('native disabled omits click callbacks while disabledFocusable characterizes the overwritten click guard', () => {
    const select = jest.fn();
    const consumer = jest.fn();
    const { getByRole, rerender } = render(
      <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select }}>
        <CarouselNavImageButton {...props} disabled onClick={consumer} />
      </CarouselProvider>,
    );
    fireEvent.click(getByRole('tab'));
    expect(consumer).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
    rerender(
      <CarouselProvider value={{ ...carouselContextDefaultValue, selectPageByIndex: select }}>
        <CarouselNavImageButton {...props} disabledFocusable onClick={consumer} />
      </CarouselProvider>,
    );
    fireEvent.click(getByRole('tab'));
    expect(consumer).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledTimes(1);
  });
  it('publishes ordered grouped panel IDs and clears absent groups', () => {
    let listener: ((data: CarouselUpdateData) => void) | undefined;
    const { getByRole } = render(
      <CarouselProvider
        value={{
          ...carouselContextDefaultValue,
          subscribeForValues: callback => {
            listener = callback;
            return jest.fn();
          },
        }}
      >
        <CarouselNavImageButton {...props} />
      </CarouselProvider>,
    );
    const panels = ['panel-a', 'panel-b'].map(id => {
      const panel = getByRole('tab').ownerDocument.createElement('div');
      panel.id = id;
      return panel;
    });
    act(() => listener!({ activeIndex: 0, navItemsCount: 1, groupIndexList: [[1, 0]], slideNodes: panels }));
    expect(getByRole('tab').getAttribute('aria-controls')).toBe('panel-b panel-a');
    act(() => listener!({ activeIndex: 0, navItemsCount: 0, groupIndexList: [], slideNodes: panels }));
    expect(getByRole('tab').getAttribute('aria-controls')).toBe('');
  });
  it('unmount disposes the exact registered subscription', () => {
    const dispose = jest.fn();
    const subscribe = jest.fn(() => dispose);
    const { unmount } = render(
      <CarouselProvider value={{ ...carouselContextDefaultValue, subscribeForValues: subscribe }}>
        <CarouselNavImageButton {...props} />
      </CarouselProvider>,
    );
    expect(subscribe).toHaveBeenCalledTimes(1);
    unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
  it('current consumer callback replaces the initial closure without remount', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { getByRole, rerender } = render(<CarouselNavImageButton {...props} onClick={first} />);
    const root = getByRole('tab');
    fireEvent.click(root);
    rerender(<CarouselNavImageButton {...props} onClick={second} />);
    expect(getByRole('tab')).toBe(root);
    fireEvent.click(root);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });
  it('renderer replaces native children with the image slot', () => {
    const { getByRole } = render(<CarouselNavImageButton {...props}>Not the thumbnail</CarouselNavImageButton>);
    expect(getByRole('tab').textContent).toBe('');
    expect(getByRole('tab').querySelectorAll('img')).toHaveLength(1);
  });
});
