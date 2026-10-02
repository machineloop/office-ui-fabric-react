/** @jest-environment node */
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  createDOMRenderer,
  RendererProvider,
  makeStyles,
  renderToStyleElements,
  useRenderer_unstable,
} from '@griffel/react';

const useStyles = makeStyles({ root: { color: '#274563', padding: '9px' } });

describe('RendererProvider server integration', () => {
  it('provides the exact renderer without a document or an additional markup wrapper', () => {
    expect(typeof document).toBe('undefined');
    const renderer = createDOMRenderer();
    let observed: ReturnType<typeof createDOMRenderer> | undefined;
    const Probe = () => {
      observed = useRenderer_unstable();
      return <span>Content</span>;
    };
    expect(
      renderToStaticMarkup(
        <RendererProvider renderer={renderer}>
          <Probe />
        </RendererProvider>,
      ),
    ).toBe('<span>Content</span>');
    expect(observed).toBe(renderer);
  });

  it('collects actual server style rules and serializes caller style attributes', () => {
    const renderer = createDOMRenderer(undefined, {
      styleElementAttributes: { nonce: 'server-fixture-nonce', 'data-owner': 'server' },
    });
    const Probe = () => (
      <button type="button" className={useStyles().root}>
        Action
      </button>
    );
    const html = renderToStaticMarkup(
      <RendererProvider renderer={renderer}>
        <Probe />
      </RendererProvider>,
    );
    expect(html).toContain('Action');
    expect(Object.keys(renderer.insertionCache).length).toBeGreaterThan(0);
    const styles = renderToStaticMarkup(<>{renderToStyleElements(renderer)}</>);
    expect(styles).toContain('data-make-styles-bucket');
    expect(styles).toContain('nonce="server-fixture-nonce"');
    expect(styles).toContain('data-owner="server"');
    expect(styles).toContain('#274563');
  });

  it('isolates nested server renderer ownership and style collection', () => {
    const outer = createDOMRenderer();
    const inner = createDOMRenderer();
    const observed: ReturnType<typeof createDOMRenderer>[] = [];
    const Probe = () => {
      observed.push(useRenderer_unstable());
      return <button className={useStyles().root}>Action</button>;
    };
    renderToStaticMarkup(
      <RendererProvider renderer={outer}>
        <Probe />
        <RendererProvider renderer={inner}>
          <Probe />
        </RendererProvider>
        <Probe />
      </RendererProvider>,
    );
    expect(observed).toEqual([outer, inner, outer]);
    expect(Object.keys(outer.insertionCache)).toEqual(Object.keys(inner.insertionCache));
    expect(outer.insertionCache).not.toBe(inner.insertionCache);
  });
});
