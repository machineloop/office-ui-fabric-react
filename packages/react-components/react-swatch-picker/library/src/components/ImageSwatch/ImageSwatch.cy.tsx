import * as React from 'react';
import { mount as mountBase } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { teamsLightTheme, tokens } from '@fluentui/react-theme';
import { SwatchPicker, SwatchPickerRow, ColorSwatch, renderSwatchPickerGrid } from '@fluentui/react-swatch-picker';
import type { SwatchPickerProps } from '@fluentui/react-swatch-picker';
import { Popover, PopoverTrigger, PopoverSurface } from '@fluentui/react-popover';
import { Tooltip } from '@fluentui/react-tooltip';
import { ImageSwatch } from './ImageSwatch';

const mount = (element: React.ReactElement) =>
  mountBase(<FluentProvider theme={teamsLightTheme}>{element}</FluentProvider>);
// Local data images avoid relying on the story's external CDN availability.
const image = (name: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg"><title>${name}</title></svg>`)}`;
const swatch = (name: string) => cy.get(`[data-swatch="${name}"]`);
const selected = (name: string, value: boolean, grid = false) =>
  swatch(name).should('have.attr', grid ? 'aria-selected' : 'aria-checked', String(value));
const Images = ({ grid = false, ...props }: SwatchPickerProps & { grid?: boolean }) => {
  const children = ['sea', 'bridge', 'park'].map(name => (
    <ImageSwatch key={name} data-swatch={name} src={image(name)} value={name} aria-label={name} />
  ));
  return (
    <>
      <button data-test="before">Before</button>
      <SwatchPicker aria-label="Images" layout={grid ? 'grid' : 'row'} {...props}>
        {grid ? <SwatchPickerRow>{children}</SwatchPickerRow> : children}
      </SwatchPicker>
      <button data-test="after">After</button>
    </>
  );
};

describe('ImageSwatch documented contracts (round 1)', () => {
  it('MixedSwatches render utility: native grid ArrowDown reaches an image without selecting until Space', () => {
    const changes = cy.stub().as('changes');
    const items = [
      { color: tokens.colorPaletteRedBackground1, value: 'color', 'aria-label': 'Color', 'data-swatch': 'color' },
      { src: image('bridge'), value: 'bridge', 'aria-label': 'bridge', 'data-swatch': 'bridge' },
      { src: image('sea'), value: 'sea', 'aria-label': 'sea', 'data-swatch': 'sea' },
      { src: image('park'), value: 'park', 'aria-label': 'park', 'data-swatch': 'park' },
    ];
    mount(
      <>
        <button data-test="before">Before</button>
        <SwatchPicker layout="grid" aria-label="Mixed grid" defaultSelectedValue="color" onSelectionChange={changes}>
          {renderSwatchPickerGrid({ items, columnCount: 2 })}
        </SwatchPicker>
      </>,
    );
    cy.get('[data-test="before"]').focus();
    cy.realPress('Tab');
    swatch('color').should('be.focused');
    cy.realPress('ArrowDown');
    swatch('sea').should('be.focused');
    selected('color', true, true);
    selected('sea', false, true);
    cy.get('@changes').should('not.have.been.called');
    cy.realPress('Space');
    selected('sea', true, true);
    selected('color', false, true);
    cy.get('@changes').should('have.been.calledOnce');
    cy.get('@changes').then(() => {
      const [event, data] = changes.firstCall.args;
      expect(data).to.deep.equal({ type: 'click', event, selectedValue: 'sea', selectedSwatch: image('sea') });
    });
  });

  describe('ImageSwatch a11y and edge contracts (round 2)', () => {
    it('disabled image is skipped by arrow/Tab and rejects forced native activation callbacks', () => {
      const click = cy.stub().as('click');
      const changes = cy.stub().as('changes');
      mount(
        <>
          <button data-test="before">Before</button>
          <SwatchPicker aria-label="Images" onSelectionChange={changes}>
            <ImageSwatch data-swatch="sea" src={image('sea')} value="sea" aria-label="sea" />
            <ImageSwatch
              data-swatch="bridge"
              src={image('bridge')}
              value="bridge"
              aria-label="bridge"
              disabled
              onClick={click}
            />
            <ImageSwatch data-swatch="park" src={image('park')} value="park" aria-label="park" />
          </SwatchPicker>
          <button data-test="after">After</button>
        </>,
      );
      cy.get('[data-test="before"]').focus().realPress('Tab');
      swatch('sea').should('be.focused');
      cy.realPress('ArrowRight');
      swatch('park').should('be.focused');
      swatch('bridge').should('be.disabled').click({ force: true });
      selected('bridge', false);
      cy.get('@click').should('not.have.been.called');
      cy.get('@changes').should('not.have.been.called');
      swatch('park').focus();
      cy.realPress('Tab');
      cy.get('[data-test="after"]').should('be.focused');
    });

    it('disabled image in tab mode is omitted from forward and reverse native Tab order', () => {
      mount(
        <>
          <SwatchPicker aria-label="Images" focusMode="tab">
            <ImageSwatch data-swatch="sea" src={image('sea')} value="sea" aria-label="sea" />
            <ImageSwatch data-swatch="bridge" src={image('bridge')} value="bridge" aria-label="bridge" disabled />
            <ImageSwatch data-swatch="park" src={image('park')} value="park" aria-label="park" />
          </SwatchPicker>
        </>,
      );
      swatch('sea').focus().realPress('Tab');
      swatch('park').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      swatch('sea').should('be.focused');
    });

    it('hover/focus/navigation/Escape alone never select or call consumer onClick', () => {
      const click = cy.stub().as('click');
      const changes = cy.stub().as('changes');
      mount(
        <SwatchPicker aria-label="Images" onSelectionChange={changes}>
          <ImageSwatch data-swatch="sea" src={image('sea')} value="sea" aria-label="sea" onClick={click} />
        </SwatchPicker>,
      );
      swatch('sea').trigger('mouseover').focus();
      (['ArrowRight', 'ArrowLeft', 'Home', 'End', 'Escape'] as const).forEach(key => cy.realPress(key));
      selected('sea', false);
      swatch('sea').should('be.focused');
      cy.get('@click').should('not.have.been.called');
      cy.get('@changes').should('not.have.been.called');
    });

    it('consumer preventing native Enter/Space keys cancels click and selection', () => {
      const click = cy.stub().as('click');
      const changes = cy.stub().as('changes');
      mount(
        <SwatchPicker aria-label="Images" onSelectionChange={changes}>
          <ImageSwatch
            data-swatch="sea"
            src={image('sea')}
            value="sea"
            aria-label="sea"
            onClick={click}
            onKeyDown={event => event.preventDefault()}
            onKeyUp={event => event.preventDefault()}
          />
        </SwatchPicker>,
      );
      swatch('sea').focus();
      cy.realPress('Enter');
      cy.realPress('Space');
      selected('sea', false);
      cy.get('@click').should('not.have.been.called');
      cy.get('@changes').should('not.have.been.called');
    });

    it('consumer click prevention is not a selection veto and callback follows the consumer', () => {
      const order = cy.stub().as('order');
      mount(
        <SwatchPicker
          aria-label="Images"
          onSelectionChange={(event, data) =>
            order('parent', event.defaultPrevented, data.selectedValue, data.selectedSwatch)
          }
        >
          <ImageSwatch
            data-swatch="sea"
            src={image('sea')}
            value="sea"
            aria-label="sea"
            onClick={event => {
              event.preventDefault();
              order('child', event.currentTarget.dataset.swatch);
            }}
          />
        </SwatchPicker>,
      );
      swatch('sea').click();
      selected('sea', true);
      cy.get('@order').then(() =>
        expect(order.getCalls().map(call => call.args)).to.deep.equal([
          ['child', 'sea'],
          ['parent', true, 'sea', image('sea')],
        ]),
      );
    });

    it('aria-labelledby and title native attributes preserve the descriptive name without an img child', () => {
      mount(
        <>
          <span id="image-label">Sea texture</span>
          <SwatchPicker aria-label="Images">
            <ImageSwatch
              data-swatch="sea"
              src={image('sea')}
              value="sea"
              aria-labelledby="image-label"
              title="Sea texture"
            />
          </SwatchPicker>
        </>,
      );
      swatch('sea').should('have.attr', 'aria-labelledby', 'image-label').and('have.attr', 'title', 'Sea texture');
      cy.get('#image-label').should('have.text', 'Sea texture');
      swatch('sea').find('img').should('not.exist');
      swatch('sea').focus().realPress('Space');
      selected('sea', true);
    });

    it('standalone ImageSwatch stays unselected without a provider but preserves native callbacks', () => {
      const click = cy.stub().as('click');
      mount(<ImageSwatch data-swatch="sea" src={image('sea')} value="sea" aria-label="sea" onClick={click} />);
      swatch('sea').should('have.attr', 'role', 'radio').focus().realPress('Enter');
      selected('sea', false);
      cy.get('@click').should('have.been.calledOnce');
    });

    it('repeated selected-image activation reports each request without deselecting the image', () => {
      const changes = cy.stub().as('changes');
      mount(<Images defaultSelectedValue="sea" onSelectionChange={changes} />);
      swatch('sea').click().click();
      selected('sea', true);
      cy.get('@changes').should('have.callCount', 2);
      cy.get('@changes').then(() =>
        expect(changes.getCalls().map(call => call.args[1].selectedValue)).to.deep.equal(['sea', 'sea']),
      );
    });
  });

  it('SwatchPickerImage: controlled image choice updates selected state and the preview', () => {
    const changes = cy.stub().as('changes');
    const Example = () => {
      const [value, setValue] = React.useState('bridge');
      return (
        <>
          <Images
            selectedValue={value}
            onSelectionChange={(event, data) => {
              changes(event.type, data.selectedValue, data.selectedSwatch, data.type, data.event === event);
              setValue(data.selectedValue);
            }}
          />
          <output data-test="preview">{image(value)}</output>
        </>
      );
    };
    mount(<Example />);
    selected('bridge', true);
    swatch('sea').click();
    selected('sea', true);
    selected('bridge', false);
    cy.get('[data-test="preview"]').should('have.text', image('sea'));
    cy.get('@changes').should('have.been.calledOnceWithExactly', 'click', 'sea', image('sea'), 'click', true);
    swatch('sea').should('have.css', 'background-size', 'cover').and('have.css', 'background-repeat', 'no-repeat');
    swatch('sea').invoke('css', 'background-image').should('contain', 'sea');
  });

  (['Enter', 'Space'] as const).forEach(key => {
    it(`Spec native Tab/${key} selects, arrows only move focus, Home/End reach endpoints`, () => {
      const changes = cy.stub().as('changes');
      mount(<Images onSelectionChange={changes} />);
      cy.get('[data-test="before"]').focus();
      cy.realPress('Tab');
      swatch('sea').should('be.focused');
      cy.realPress('ArrowRight');
      swatch('bridge').should('be.focused');
      selected('bridge', false);
      cy.get('@changes').should('not.have.been.called');
      cy.realPress('End');
      swatch('park').should('be.focused');
      cy.realPress('Home');
      swatch('sea').should('be.focused');
      cy.realPress(key);
      selected('sea', true);
      cy.get('@changes').should('have.been.calledOnce');
      cy.realPress('Tab');
      cy.get('[data-test="after"]').should('be.focused');
      cy.realPress(['Shift', 'Tab']);
      swatch('sea').should('be.focused');
    });
  });

  it('SwatchPickerMixedSwatches: image and color grid cells share mutually exclusive selection', () => {
    mount(
      <SwatchPicker layout="grid" aria-label="Mixed" defaultSelectedValue="color">
        <SwatchPickerRow>
          <ColorSwatch color={tokens.colorPaletteRedBackground1} value="color" aria-label="Color" data-swatch="color" />
          <ImageSwatch src={image('sea')} value="sea" aria-label="sea" data-swatch="sea" />
        </SwatchPickerRow>
      </SwatchPicker>,
    );
    selected('color', true, true);
    swatch('sea').should('have.attr', 'role', 'gridcell').click();
    selected('sea', true, true);
    selected('color', false, true);
    swatch('sea').should('not.have.attr', 'aria-checked');
    swatch('color').click();
    selected('sea', false, true);
    selected('color', true, true);
  });

  it('SwatchPickerFocusMode tab: native Tab/shiftTab traverse images without selecting them', () => {
    const changes = cy.stub().as('changes');
    mount(<Images focusMode="tab" onSelectionChange={changes} />);
    cy.get('[data-test="before"]').focus();
    cy.realPress('Tab');
    swatch('sea').should('be.focused');
    cy.realPress('Tab');
    swatch('bridge').should('be.focused');
    cy.realPress('Tab');
    swatch('park').should('be.focused');
    cy.realPress(['Shift', 'Tab']);
    swatch('bridge').should('be.focused');
    cy.get('@changes').should('not.have.been.called');
    cy.realPress('Space');
    selected('bridge', true);
    cy.get('@changes').should('have.been.calledOnce');
  });

  (['extra-small', 'small', 'medium', 'large'] as const).forEach((size, index) => {
    it(`SwatchPickerSize ${size}: inherited image dimensions and activation`, () => {
      const extent = [20, 24, 28, 32][index];
      mount(<Images size={size} />);
      swatch('sea').should('have.css', 'width', `${extent}px`).and('have.css', 'height', `${extent}px`);
      swatch('sea').click();
      selected('sea', true);
    });
  });

  (['square', 'rounded', 'circular'] as const).forEach(shape => {
    it(`SwatchPickerShape ${shape}: inherited shape and selection`, () => {
      mount(<Images shape={shape} />);
      swatch('sea').should(
        'have.css',
        'border-radius',
        shape === 'square' ? '0px' : shape === 'rounded' ? '4px' : '10000px',
      );
      swatch('sea').focus().realPress('Enter');
      selected('sea', true);
    });
  });

  it('Spec custom size: consumer root dimensions override picker defaults without changing selection', () => {
    mount(
      <SwatchPicker aria-label="Customized images">
        <ImageSwatch
          src={image('sea')}
          value="sea"
          aria-label="sea"
          data-swatch="sea"
          style={{ width: tokens.spacingHorizontalXXXL, height: tokens.spacingVerticalXXXL }}
        />
      </SwatchPicker>,
    );
    swatch('sea').should('have.css', 'width', '32px').and('have.css', 'height', '32px').click();
    selected('sea', true);
  });

  it('tooltip naming composition leaves native keyboard selection usable', () => {
    mount(
      <SwatchPicker aria-label="Named images">
        <Tooltip relationship="label" content="Sea image" showDelay={0}>
          <ImageSwatch src={image('sea')} value="sea" data-swatch="sea" />
        </Tooltip>
      </SwatchPicker>,
    );
    swatch('sea').focus();
    swatch('sea').should('have.attr', 'aria-label', 'Sea image');
    cy.realPress('Enter');
    selected('sea', true);
  });

  it('SwatchPickerPopup composition closes after image selection and Escape cancels without selecting', () => {
    const changes = cy.stub().as('changes');
    const Popup = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <Popover open={open} onOpenChange={(_, data) => setOpen(data.open)} trapFocus surfaceMotion={null}>
          <PopoverTrigger>
            <button data-test="popup-trigger">Choose image</button>
          </PopoverTrigger>
          <PopoverSurface data-test="popup-surface">
            <Images
              onSelectionChange={(event, data) => {
                changes(data.selectedValue);
                setOpen(false);
              }}
            />
          </PopoverSurface>
        </Popover>
      );
    };
    mount(<Popup />);
    cy.get('[data-test="popup-trigger"]').focus().realPress('Enter');
    swatch('sea').focus().realPress('Space');
    cy.get('[data-test="popup-surface"]').should('not.exist');
    cy.get('[data-test="popup-trigger"]').should('be.focused');
    cy.get('@changes').should('have.been.calledOnceWithExactly', 'sea');
    cy.get('[data-test="popup-trigger"]').realPress('Enter');
    swatch('sea').should('exist').focus().realPress('Escape');
    cy.get('[data-test="popup-surface"]').should('not.exist');
    cy.get('@changes').should('have.been.calledOnce');
  });
});

describe('ImageSwatch unit-derived browser contracts (round 3)', () => {
  it('unit context size/shape override direct props, while standalone uses medium/square defaults', () => {
    mount(
      <>
        <ImageSwatch
          data-swatch="standalone"
          src={image('standalone')}
          value="alone"
          aria-label="Standalone"
          size="extra-small"
          shape="rounded"
        />
        <SwatchPicker size="large" shape="circular" aria-label="Images">
          <ImageSwatch
            data-swatch="sea"
            src={image('sea')}
            value="sea"
            aria-label="sea"
            size="extra-small"
            shape="rounded"
          />
        </SwatchPicker>
      </>,
    );
    swatch('standalone').should('have.css', 'width', '28px').and('have.css', 'border-radius', '0px');
    swatch('sea').should('have.css', 'width', '32px').and('have.css', 'border-radius', '10000px');
    swatch('sea').click();
    selected('sea', true);
  });

  it('unit root ref/native attributes/class and children survive selection and clear on unmount', () => {
    const ref = React.createRef<HTMLButtonElement>();
    const callbackRef = cy.stub().as('ref');
    let setVisible: React.Dispatch<React.SetStateAction<boolean>>;
    const Lifecycle = () => {
      const [visible, update] = React.useState(true);
      setVisible = update;
      return visible ? (
        <SwatchPicker aria-label="Images">
          <ImageSwatch
            ref={node => {
              ref.current = node;
              callbackRef(node);
            }}
            data-swatch="sea"
            src={image('sea')}
            value="sea"
            aria-label="Sea"
            className="consumer-image"
            id="image-id"
            title="Sea title"
            name="image-choice"
            type="button"
            data-native="retained"
          >
            <span data-test="content">Sea</span>
          </ImageSwatch>
        </SwatchPicker>
      ) : (
        <p data-test="unmounted">Unmounted</p>
      );
    };
    mount(<Lifecycle />);
    swatch('sea').should('have.class', 'fui-ImageSwatch').and('have.class', 'consumer-image');
    swatch('sea').should('have.attr', 'id', 'image-id').and('have.attr', 'name', 'image-choice');
    swatch('sea').should('have.attr', 'title', 'Sea title').and('have.attr', 'data-native', 'retained');
    swatch('sea').find('[data-test="content"]').should('have.text', 'Sea');
    swatch('sea').then($el => {
      expect(ref.current).to.equal($el[0]);
      expect(callbackRef.lastCall.args[0]).to.equal($el[0]);
    });
    swatch('sea').click();
    selected('sea', true);
    cy.then(() => setVisible(false));
    cy.get('[data-test="unmounted"]').should('exist');
    cy.then(() => {
      expect(ref.current).to.equal(null);
      expect(callbackRef.lastCall.args[0]).to.equal(null);
    });
  });

  it('unit inline background override affects paint but callback still reports the actual src/value', () => {
    const changes = cy.stub().as('changes');
    mount(
      <SwatchPicker aria-label="Images" onSelectionChange={changes}>
        <ImageSwatch
          data-swatch="sea"
          src={image('sea')}
          value="sea"
          aria-label="Sea"
          style={{ backgroundImage: `url("${image('bridge')}")` }}
        />
      </SwatchPicker>,
    );
    swatch('sea').invoke('css', 'background-image').should('contain', 'bridge');
    swatch('sea').click();
    selected('sea', true);
    cy.get('@changes').then(() => {
      expect(changes.firstCall.args[1].selectedSwatch).to.equal(image('sea'));
      expect(changes.firstCall.args[1].selectedValue).to.equal('sea');
    });
  });

  it('controlled selection rejects requests until external value changes, without an extra callback', () => {
    const changes = cy.stub().as('changes');
    let setValue: React.Dispatch<React.SetStateAction<string>>;
    const Controlled = () => {
      const [value, update] = React.useState('bridge');
      setValue = update;
      return <Images selectedValue={value} onSelectionChange={changes} />;
    };
    mount(<Controlled />);
    swatch('sea').click();
    selected('sea', false);
    selected('bridge', true);
    cy.get('@changes').should('have.been.calledOnce');
    cy.then(() => setValue('sea'));
    selected('sea', true);
    selected('bridge', false);
    cy.get('@changes').should('have.been.calledOnce');
  });

  it('default selection initializes once and changing the default does not reset a user choice', () => {
    let setDefault: React.Dispatch<React.SetStateAction<string>>;
    const Defaults = () => {
      const [value, update] = React.useState('bridge');
      setDefault = update;
      return <Images defaultSelectedValue={value} />;
    };
    mount(<Defaults />);
    selected('bridge', true);
    swatch('sea').click();
    selected('sea', true);
    cy.then(() => setDefault('park'));
    selected('sea', true);
    selected('park', false);
  });

  it('unit current src/value/consumer handler and parent envelope are fresh on the same button', () => {
    const calls = cy.stub().as('calls');
    let setVersion: React.Dispatch<React.SetStateAction<number>>;
    const Current = () => {
      const [version, update] = React.useState(0);
      setVersion = update;
      return (
        <SwatchPicker
          aria-label="Images"
          onSelectionChange={(event, data) => {
            calls(
              'parent',
              version,
              (event.currentTarget as HTMLButtonElement).dataset.version,
              data.selectedValue,
              data.selectedSwatch,
              data.type,
              data.event === event,
            );
          }}
        >
          <ImageSwatch
            data-swatch="sea"
            data-version={version}
            src={image(`sea${version}`)}
            value={`value${version}`}
            aria-label={`Sea ${version}`}
            onClick={event => calls('child', version, event.currentTarget.dataset.version)}
          />
        </SwatchPicker>
      );
    };
    mount(<Current />);
    swatch('sea').should('have.attr', 'aria-label', 'Sea 0');
    cy.then(() => setVersion(1));
    swatch('sea').should('have.attr', 'aria-label', 'Sea 1').focus().realPress('Enter');
    selected('sea', true);
    cy.get('@calls').then(() =>
      expect(calls.getCalls().map(call => call.args)).to.deep.equal([
        ['child', 1, '1'],
        ['parent', 1, '1', 'value1', image('sea1'), 'click', true],
      ]),
    );
  });

  it('unit context layout/selection/size/shape changes update the same image root', () => {
    let setGrid: React.Dispatch<React.SetStateAction<boolean>>;
    const Dynamic = () => {
      const [grid, update] = React.useState(false);
      setGrid = update;
      return (
        <SwatchPicker
          layout={grid ? 'grid' : 'row'}
          size={grid ? 'small' : 'large'}
          shape={grid ? 'rounded' : 'square'}
          selectedValue={grid ? 'sea' : 'other'}
          aria-label="Images"
        >
          <ImageSwatch src={image('sea')} value="sea" data-swatch="sea" aria-label="Sea" />
        </SwatchPicker>
      );
    };
    mount(<Dynamic />);
    selected('sea', false);
    swatch('sea').should('have.css', 'width', '32px').and('have.css', 'border-radius', '0px');
    cy.then(() => setGrid(true));
    selected('sea', true, true);
    swatch('sea').should('have.attr', 'role', 'gridcell');
    swatch('sea').should('not.have.attr', 'aria-checked');
    swatch('sea').should('have.css', 'width', '24px').and('have.css', 'border-radius', '4px');
    cy.then(() => setGrid(false));
    selected('sea', false);
    swatch('sea').should('not.have.attr', 'aria-selected');
  });

  it('native role/ARIA overrides are preserved without changing selection callback data', () => {
    const changes = cy.stub().as('changes');
    mount(
      <SwatchPicker aria-label="Images" onSelectionChange={changes}>
        <ImageSwatch
          data-swatch="sea"
          src={image('sea')}
          value="sea"
          aria-label="Sea"
          role="button"
          aria-checked={undefined}
        />
      </SwatchPicker>,
    );
    swatch('sea').should('have.attr', 'role', 'button');
    swatch('sea').should('not.have.attr', 'aria-checked');
    swatch('sea').click();
    swatch('sea').should('not.have.attr', 'aria-checked');
    cy.get('@changes').should('have.been.calledOnce');
    cy.get('@changes').then(() => expect(changes.firstCall.args[1].selectedValue).to.equal('sea'));
  });
});
