import * as React from 'react';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider } from '@fluentui/react-provider';
import { webLightTheme } from '@fluentui/react-theme';
import { SwatchPicker } from './SwatchPicker';
import { ColorSwatch } from '../ColorSwatch';
import { ImageSwatch } from '../ImageSwatch';
import { SwatchPickerRow } from '../SwatchPickerRow';
import type { SwatchPickerProps, SwatchPickerOnSelectEventHandler } from '../SwatchPicker';
import { renderSwatchPickerGrid } from '../../utils/renderUtils';
import type { JSXElement } from '@fluentui/react-utilities';
import { EmptySwatch } from '../EmptySwatch';
import { Tooltip } from '@fluentui/react-tooltip';
import { Popover, PopoverTrigger, PopoverSurface } from '@fluentui/react-popover';
import { Field } from '@fluentui/react-field';
import { getTabster } from 'tabster';

const localImage =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="8" height="8"%3E%3Crect width="8" height="8" fill="blue"/%3E%3C/svg%3E';

describe('SwatchPicker adversarial improvements (final)', () => {
  it('controlled empty string overrides a default selection and same-valued sibling palettes remain isolated', () => {
    const secondChange = cy.stub().as('secondChange');
    mountFluent(
      <>
        <SwatchPicker id="first-picker" selectedValue="" defaultSelectedValue="red">
          <ColorSwatch id="first-red" color="#f00" value="red" aria-label="Red" />
        </SwatchPicker>
        <SwatchPicker id="second-picker" onSelectionChange={secondChange}>
          <ColorSwatch id="second-red" color="#f00" value="red" aria-label="Red" />
        </SwatchPicker>
      </>,
    );
    cy.get('#first-red').should('have.attr', 'aria-checked', 'false');
    cy.get('#second-red').realClick().should('have.attr', 'aria-checked', 'true');
    cy.get('#first-red').should('have.attr', 'aria-checked', 'false');
    cy.get('@secondChange').should('have.been.calledOnce');
  });

  it('64-swatch documented maximum grid has eight rows, vertical gap and native endpoint wrap', () => {
    const gridColors = Array.from({ length: 64 }, (_, index) => ({
      id: `max-${index}`,
      value: String(index),
      color: '#123456',
      'aria-label': `Color ${index}`,
    }));
    mountFluent(
      <SwatchPicker layout="grid" aria-label="64 colors">
        {renderSwatchPickerGrid({ items: gridColors, columnCount: 8 })}
      </SwatchPicker>,
    );
    cy.get('.fui-SwatchPickerRow').should('have.length', 8);
    cy.get('.fui-ColorSwatch').should('have.length', 64);
    cy.get('#max-0').then($first => {
      const first = $first[0].getBoundingClientRect();
      cy.get('#max-8').should($next => expect($next[0].getBoundingClientRect().top - first.bottom).to.equal(4));
    });
    cy.get('#max-63')
      .focus()
      .should($last =>
        expect(
          getTabster($last[0].ownerDocument.defaultView!)?.focusedElement.getFocusedElement(),
          'native focus backend has observed the original last grid swatch',
        ).to.equal($last[0]),
      )
      .realPress('ArrowRight');
    cy.get('#max-0').should('have.focus').realPress('ArrowLeft');
    cy.get('#max-63').should('have.focus');
  });

  it('switching focus mode removes arrow mover and restores native sequential Tab', () => {
    const Example = () => {
      const [tab, setTab] = React.useState(false);
      return (
        <>
          <button onClick={() => setTab(true)}>Use Tab</button>
          <SwatchPickerRowColorSample focusMode={tab ? 'tab' : 'arrow'} />
        </>
      );
    };
    mountFluent(<Example />);
    cy.get('#swatch-picker-color-row').should('have.attr', 'data-tabster');
    cy.contains('button', 'Use Tab').realClick();
    cy.get('#swatch-picker-color-row').should('not.have.attr', 'data-tabster');
    cy.get('#swatch-0').focus().realPress('Tab');
    cy.get('#swatch-1').should('have.focus').realPress('Tab');
    cy.get('#swatch-3').should('have.focus');
  });

  it('dynamic add/remove swatches retains selection value until its item reappears', () => {
    const Example = () => {
      const [visible, setVisible] = React.useState(true);
      return (
        <>
          <button onClick={() => setVisible(value => !value)}>Toggle blue</button>
          <SwatchPicker defaultSelectedValue="blue">
            <ColorSwatch id="remain-red" color="#f00" value="red" aria-label="Red" />
            {visible && <ColorSwatch id="added-blue" color="#00f" value="blue" aria-label="Blue" />}
          </SwatchPicker>
        </>
      );
    };
    mountFluent(<Example />);
    cy.get('#added-blue').should('have.attr', 'aria-checked', 'true');
    cy.contains('button', 'Toggle blue').realClick();
    cy.get('#added-blue').should('not.exist');
    cy.get('#remain-red').should('have.attr', 'aria-checked', 'false');
    cy.contains('button', 'Toggle blue').realClick();
    cy.get('#added-blue').should('have.attr', 'aria-checked', 'true');
  });
});

describe('SwatchPicker unit-derived contracts (round 3)', () => {
  it('defaults to medium square geometry, medium spacing and no selected swatch', () => {
    mountFluent(<SwatchPickerRowColorSample />);
    cy.get('#swatch-picker-color-row')
      .should('have.attr', 'role', 'radiogroup')
      .and('have.css', 'gap', '4px')
      .and('have.attr', 'data-tabster');
    cy.get('#swatch-0').should('have.css', 'width', '28px').and('have.css', 'border-radius', '0px');
    cy.get('.fui-ColorSwatch').each($swatch => cy.wrap($swatch).should('have.attr', 'aria-checked', 'false'));
  });

  it('tab focus explicitly omits the mover attribute and allows caller native role override', () => {
    mountFluent(
      <SwatchPicker focusMode="tab" role="group" aria-label="Custom palette">
        <ColorSwatch color="#f00" value="red" aria-label="Red" />
      </SwatchPicker>,
    );
    cy.get('.fui-SwatchPicker').should('not.have.attr', 'data-tabster');
    cy.get('.fui-SwatchPicker').should('have.attr', 'role', 'group');
  });

  it('default selection changes are initialization-only and unknown controlled values select nothing', () => {
    const Example = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button onClick={() => setChanged(true)}>Change defaults</button>
          <SwatchPickerRowColorSample defaultSelectedValue={changed ? 'FFC12E' : 'FF1921'} />
          <SwatchPicker id="unknown" selectedValue="missing">
            <ColorSwatch color="#f00" value="red" aria-label="Red" />
          </SwatchPicker>
        </>
      );
    };
    mountFluent(<Example />);
    cy.contains('button', 'Change defaults').realClick();
    cy.get('#swatch-0').should('have.attr', 'aria-checked', 'true');
    cy.get('#swatch-1').should('have.attr', 'aria-checked', 'false');
    cy.get('#unknown button').should('have.attr', 'aria-checked', 'false');
  });

  it('child size/shape overrides take precedence over picker design context', () => {
    mountFluent(
      <SwatchPicker size="large" shape="circular">
        <ColorSwatch id="inherited" color="#f00" value="red" aria-label="Red" />
        <ColorSwatch id="override" color="#00f" value="blue" aria-label="Blue" size="small" shape="square" />
      </SwatchPicker>,
    );
    cy.get('#inherited').should('have.css', 'width', '32px').and('have.css', 'border-radius', '10000px');
    cy.get('#override').should('have.css', 'width', '24px').and('have.css', 'border-radius', '0px');
  });

  it('consumer child/picker callbacks share the exact trusted event and payload before root bubbling', () => {
    const order: string[] = [];
    const child = cy.stub().callsFake((event: React.MouseEvent) => {
      order.push('child');
      event.preventDefault();
    });
    const change = cy.stub().callsFake(() => order.push('selection'));
    const root = cy
      .stub()
      .callsFake(() => order.push('root'))
      .as('root');
    mountFluent(
      <SwatchPicker onClick={root} onSelectionChange={change}>
        <ColorSwatch id="event-swatch" color="#f00" value="red" aria-label="Red" onClick={child} />
      </SwatchPicker>,
    );
    cy.get('#event-swatch').realClick();
    cy.get('@root')
      .should('have.been.calledOnce')
      .then(() => {
        expect(order).to.deep.equal(['child', 'selection', 'root']);
        const [event, data] = change.firstCall.args;
        expect(event).to.equal(child.firstCall.args[0]).and.to.equal(root.firstCall.args[0]);
        expect(data).to.deep.equal({ event, type: 'click', selectedValue: 'red', selectedSwatch: '#f00' });
        expect(event.defaultPrevented).to.equal(true);
      });
    cy.get('#event-swatch').should('have.attr', 'aria-checked', 'true');
  });

  it('empty swatch is an add-new placeholder, not an automatic selection request', () => {
    const change = cy.stub().as('change');
    const add = cy.stub().as('add');
    mountFluent(
      <SwatchPicker onSelectionChange={change}>
        <ColorSwatch color="#f00" value="red" aria-label="Red" />
        <EmptySwatch id="empty-swatch" onClick={add} aria-label="Add color" />
      </SwatchPicker>,
    );
    cy.get('#empty-swatch').focus().realPress('Enter');
    cy.get('@add').should('have.been.calledOnce');
    cy.get('@change').should('not.have.been.called');
    cy.get('#empty-swatch').should('have.attr', 'aria-checked', 'false');
  });
});

describe('SwatchPicker edges and accessibility (round 2)', () => {
  it('preserves native root style, attributes, class and forwarded ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    mountFluent(
      <SwatchPicker
        ref={ref}
        id="native-picker"
        title="Palette"
        data-native="yes"
        aria-label="Colors"
        className="custom-picker"
        style={{ padding: 13, maxWidth: 200 }}
      >
        <ColorSwatch color="#f00" value="red" aria-label="Red" />
      </SwatchPicker>,
    );
    cy.get('#native-picker')
      .should('have.attr', 'title', 'Palette')
      .and('have.attr', 'data-native', 'yes')
      .and('have.attr', 'aria-label', 'Colors')
      .and('have.class', 'custom-picker')
      .and('have.css', 'padding', '13px')
      .and('have.css', 'max-width', '200px')
      .should($picker => expect(ref.current).to.equal($picker[0]));
  });

  (['ltr', 'rtl'] as const).forEach(dir => {
    it(`${dir}: arrow keys cycle enabled swatches without selecting, Tab exits and reentry memorizes focus`, () => {
      const change = cy.stub().as('change');
      mountFluent(
        <FluentProvider theme={webLightTheme} dir={dir}>
          <SwatchPickerRowColorSample onSelectionChange={change} defaultSelectedValue="FF1921" />
        </FluentProvider>,
      );
      cy.get('#before').focus().realPress('Tab');
      cy.get('#swatch-0')
        .should('have.focus')
        .realPress(dir === 'ltr' ? 'ArrowLeft' : 'ArrowRight');
      cy.get('#swatch-3')
        .should('have.focus')
        .realPress(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
      cy.get('#swatch-0')
        .should('have.focus')
        .realPress(dir === 'ltr' ? 'ArrowRight' : 'ArrowLeft');
      cy.get('#swatch-1').should('have.focus').realPress('Tab');
      cy.get('#after').should('have.focus').realPress(['Shift', 'Tab']);
      cy.get('#swatch-1').should('have.focus');
      cy.get('#swatch-0').should('have.attr', 'aria-checked', 'true');
      cy.get('@change').should('not.have.been.called');
    });
  });

  it('tab mode reverse traversal skips disabled and arrow keys do not move focus', () => {
    mountFluent(<SwatchPickerRowColorSample focusMode="tab" />);
    cy.get('#after').focus().realPress(['Shift', 'Tab']);
    cy.get('#swatch-3').should('have.focus').realPress(['Shift', 'Tab']);
    cy.get('#swatch-1').should('have.focus').realPress('ArrowRight');
    cy.get('#swatch-1').should('have.focus').realPress(['Shift', 'Tab']);
    cy.get('#swatch-0').should('have.focus').realPress(['Shift', 'Tab']);
    cy.get('#before').should('have.focus');
  });

  it('disabled swatch pointer does not emit callback; active swatch repeats selection request exactly once per click', () => {
    const change = cy.stub().as('change');
    mountFluent(<SwatchPickerRowColorSample onSelectionChange={change} defaultSelectedValue="FF1921" />);
    cy.get('#swatch-2').realClick();
    cy.get('@change').should('not.have.been.called');
    cy.get('#swatch-0').realClick();
    cy.get('@change').should('have.been.calledOnce');
    cy.get('#swatch-0').realClick();
    cy.get('@change').should('have.been.calledTwice');
  });

  it('live layout/size/shape/spacing/state changes update existing swatches and ARIA contracts', () => {
    let initial: HTMLElement;
    const Example = () => {
      const [changed, setChanged] = React.useState(false);
      return (
        <>
          <button onClick={() => setChanged(value => !value)}>Change</button>
          <SwatchPicker
            id="dynamic-picker"
            layout={changed ? 'grid' : 'row'}
            size={changed ? 'large' : 'small'}
            shape={changed ? 'circular' : 'square'}
            spacing={changed ? 'small' : 'medium'}
            selectedValue={changed ? 'blue' : 'red'}
          >
            <SwatchPickerRow>
              <ColorSwatch id="dynamic-red" color="#f00" value="red" aria-label="Red" />
              <ColorSwatch id="dynamic-blue" color="#00f" value="blue" aria-label="Blue" />
            </SwatchPickerRow>
          </SwatchPicker>
        </>
      );
    };
    mountFluent(<Example />);
    cy.get('#dynamic-red').then($swatch => {
      initial = $swatch[0];
    });
    cy.get('#dynamic-red').should('have.attr', 'aria-checked', 'true').and('have.attr', 'role', 'radio');
    cy.contains('button', 'Change').realClick();
    cy.get('#dynamic-picker').should('have.attr', 'role', 'grid').and('have.css', 'gap', '2px');
    cy.get('#dynamic-red')
      .should('have.attr', 'role', 'gridcell')
      .and('have.attr', 'aria-selected', 'false')
      .and('not.have.attr', 'aria-checked');
    cy.get('#dynamic-red')
      .should('have.css', 'width', '32px')
      .and('have.css', 'border-radius', '10000px')
      .should($swatch => expect($swatch[0]).to.equal(initial));
    cy.get('#dynamic-blue').should('have.attr', 'aria-selected', 'true');
  });

  it('Field integration supplies the picker accessible label and validation relationship', () => {
    mountFluent(
      <Field label="Color choice" validationMessage="Choose an available color" validationState="error">
        <SwatchPicker>
          <ColorSwatch color="#f00" value="red" aria-label="Red" />
        </SwatchPicker>
      </Field>,
    );
    cy.get('.fui-SwatchPicker')
      .invoke('attr', 'aria-labelledby')
      .then(id => cy.get(`[id="${id}"]`).should('have.text', 'Color choice'));
    cy.get('.fui-SwatchPicker')
      .invoke('attr', 'aria-describedby')
      .then(id => cy.get(`[id="${id}"]`).should('contain.text', 'Choose an available color'));
  });
});

const mountFluent = (element: JSXElement) => {
  mount(<FluentProvider theme={webLightTheme}>{element}</FluentProvider>);
};

const colors = [
  { id: 'color-0', color: '#FF1921', value: 'FF1921', 'aria-label': 'red' },
  { id: 'color-1', color: '#FFC12E', value: 'FFC12E', 'aria-label': 'orange' },
  { id: 'color-2', color: '#FEFF37', value: 'FEFF37', 'aria-label': 'yellow' },
  { id: 'color-3', color: '#90D057', value: '90D057', 'aria-label': 'light green' },
  { id: 'color-4', color: '#00B053', value: '00B053', 'aria-label': 'green' },
  { id: 'color-5', color: '#00AFED', value: '00AFED', 'aria-label': 'light blue', disabled: true },
  { id: 'color-6', color: '#006EBD', value: '006EBD', 'aria-label': 'blue' },
  { id: 'color-7', color: '#712F9E', value: '712F9E', 'aria-label': 'purple' },
];

const images = [
  {
    swatchSrc: localImage,
    value: 'image-0',
    label: 'sea',
    fullImageSrc: 'https://fabricweb.azureedge.net/fabric-website/assets/images/swatch-picker/sea-full-img.jpg',
  },
  {
    swatchSrc: localImage,
    value: 'image-1',
    label: 'bridge',
    disabled: true,
    fullImageSrc: 'https://fabricweb.azureedge.net/fabric-website/assets/images/swatch-picker/bridge-full-img.jpg',
  },
  {
    swatchSrc: localImage,
    value: 'image-2',
    label: 'park',
    fullImageSrc: 'https://fabricweb.azureedge.net/fabric-website/assets/images/swatch-picker/park-full-img.jpg',
  },
];

const SwatchPickerRowColorSample = (props: SwatchPickerProps) => (
  <>
    <p tabIndex={0} id="before">
      Before
    </p>

    <SwatchPicker {...props} id="swatch-picker-color-row">
      <ColorSwatch color="#FF1921" value="FF1921" aria-label="red" id="swatch-0" />
      <ColorSwatch color="#FFC12E" value="FFC12E" aria-label="orange" id="swatch-1" />
      <ColorSwatch color="#00B053" value="00B053" aria-label="green" id="swatch-2" disabled />
      <ColorSwatch color="#00AFED" value="00AFED" aria-label="light blue" id="swatch-3" />
    </SwatchPicker>

    <p tabIndex={0} id="after">
      After
    </p>
  </>
);

const SwatchPickerRowImageSample = (props: SwatchPickerProps) => (
  <>
    <p tabIndex={0} id="before">
      Before
    </p>

    <SwatchPicker {...props} id="swatch-picker-image-row">
      {images.map(image => (
        <ImageSwatch
          key={image.value}
          src={image.swatchSrc}
          value={image.value}
          aria-label={image.label}
          id={image.value}
          disabled={image.disabled}
        />
      ))}
    </SwatchPicker>

    <p tabIndex={0} id="after">
      After
    </p>
  </>
);

const SwatchPickerGridColorSample = (props: SwatchPickerProps) => (
  <>
    <p tabIndex={0} id="before">
      Before
    </p>

    <SwatchPicker layout="grid" {...props} id="swatch-picker">
      {renderSwatchPickerGrid({ items: colors, columnCount: 3 })}
    </SwatchPicker>

    <p tabIndex={0} id="after">
      After
    </p>
  </>
);

const SwatchPickerRowSample = () => {
  const [selectedValue, setSelectedValue] = React.useState('FF1921');
  const handleSelect: SwatchPickerOnSelectEventHandler = (_, data) => {
    setSelectedValue(data.selectedValue);
  };

  return (
    <SwatchPicker selectedValue={selectedValue} onSelectionChange={handleSelect} id="swatch-picker-color-row">
      <ColorSwatch color="#FF1921" value="FF1921" aria-label="red" id="swatch-0" />
      <ColorSwatch color="#FFC12E" value="FFC12E" aria-label="orange" id="swatch-1" />
      <ColorSwatch color="#00B053" value="00B053" aria-label="green" id="swatch-2" disabled />
      <ColorSwatch color="#00AFED" value="00AFED" aria-label="light blue" id="swatch-3" />
      <ImageSwatch src={localImage} value="img" aria-label="img" id="swatch-4" />
    </SwatchPicker>
  );
};

const SwatchPickerGridSample = () => {
  const [selectedValue, setSelectedValue] = React.useState('FF1921');
  const handleSelect: SwatchPickerOnSelectEventHandler = (_, data) => {
    setSelectedValue(data.selectedValue);
  };

  return (
    <SwatchPicker
      layout="grid"
      selectedValue={selectedValue}
      onSelectionChange={handleSelect}
      id="swatch-picker-color-row"
    >
      <SwatchPickerRow>
        <ColorSwatch color="#FF1921" value="FF1921" aria-label="red" id="swatch-0" />
        <ColorSwatch color="#FFC12E" value="FFC12E" aria-label="orange" id="swatch-1" disabled />
      </SwatchPickerRow>
      <SwatchPickerRow>
        <ColorSwatch color="#00AFED" value="00AFED" aria-label="light blue" id="swatch-2" />
        <ImageSwatch src={localImage} value="img" aria-label="img" id="swatch-3" />
      </SwatchPickerRow>
    </SwatchPicker>
  );
};

describe('SwatchPicker', () => {
  describe('focus behaviors', () => {
    describe('row layout', () => {
      it('picker with colors should be focusable', () => {
        mountFluent(<SwatchPickerRowColorSample />);

        cy.get('#before').focus();

        cy.get('#swatch-0').should('not.be.focused');

        cy.realPress('Tab');

        cy.get('#swatch-0').should('be.focused');
        cy.realPress('ArrowRight');
        cy.get('#swatch-1').should('be.focused');
        cy.realPress('ArrowDown');
        cy.get('#swatch-2').should('not.be.focused');
        cy.get('#swatch-3').should('be.focused');
      });

      describe('SwatchPicker documented contracts (round 1)', () => {
        (['extra-small', 'small', 'medium', 'large'] as const).forEach((size, index) => {
          (['square', 'rounded', 'circular'] as const).forEach(shape => {
            it(`${size}/${shape}: inherited actual swatch geometry`, () => {
              mountFluent(<SwatchPickerRowColorSample size={size} shape={shape} />);
              cy.get('#swatch-0').should($swatch => {
                const rect = $swatch[0].getBoundingClientRect();
                expect(rect.width).to.equal(20 + index * 4);
                expect(rect.height).to.equal(20 + index * 4);
              });
              cy.get('#swatch-0').should(
                'have.css',
                'border-radius',
                shape === 'circular' ? '10000px' : shape === 'rounded' ? '4px' : '0px',
              );
            });
          });
        });

        (['row', 'grid'] as const).forEach(layout => {
          (['small', 'medium'] as const).forEach(spacing => {
            it(`${layout}/${spacing}: real neighboring swatches have the documented gap`, () => {
              mountFluent(
                layout === 'row' ? (
                  <SwatchPickerRowColorSample spacing={spacing} />
                ) : (
                  <SwatchPickerGridColorSample spacing={spacing} />
                ),
              );
              const first = layout === 'row' ? '#swatch-0' : '#color-0';
              const second = layout === 'row' ? '#swatch-1' : '#color-1';
              cy.get(first).then($first => {
                const a = $first[0].getBoundingClientRect();
                cy.get(second).should($second => {
                  const b = $second[0].getBoundingClientRect();
                  expect(b.left - a.right).to.equal(spacing === 'small' ? 2 : 4);
                });
              });
            });
          });
        });

        (['Enter', 'Space'] as const).forEach(key => {
          it(`native ${key} mixed image selection provides exact event/value/swatch identities`, () => {
            const change = cy.stub().as('change');
            mountFluent(
              <SwatchPicker onSelectionChange={change} defaultSelectedValue="red">
                <ColorSwatch id="mixed-red" color="#f00" value="red" aria-label="Red" />
                <ImageSwatch id="mixed-image" src={localImage} value="image" aria-label="Pattern" />
                <EmptySwatch aria-label="No color" />
              </SwatchPicker>,
            );
            cy.get('#mixed-image').focus().realPress(key);
            cy.get('#mixed-image').should('have.attr', 'aria-checked', 'true');
            cy.get('#mixed-red').should('have.attr', 'aria-checked', 'false');
            cy.get('@change')
              .should('have.been.calledOnce')
              .then(() => {
                const [event, data] = change.firstCall.args;
                expect(event.type).to.equal('click');
                expect(event.nativeEvent.isTrusted).to.equal(true);
                expect(data).to.deep.equal({
                  type: 'click',
                  event,
                  selectedValue: 'image',
                  selectedSwatch: localImage,
                });
                expect(event.target.id).to.equal('mixed-image');
              });
          });
        });

        it('controlled frozen selection requests do not alter visual/ARIA state', () => {
          const change = cy.stub().as('change');
          mountFluent(<SwatchPickerRowColorSample selectedValue="FF1921" onSelectionChange={change} />);
          cy.get('#swatch-1').realClick();
          cy.get('#swatch-0').should('have.attr', 'aria-checked', 'true');
          cy.get('#swatch-1').should('have.attr', 'aria-checked', 'false');
          cy.get('@change')
            .should('have.been.calledOnce')
            .then(() => expect(change.firstCall.args[1].selectedSwatch).to.equal('#FFC12E'));
        });

        it('tooltip composition gives a swatch a DOM accessible-name relationship on native focus', () => {
          mountFluent(
            <SwatchPicker>
              <Tooltip content="Red color" relationship="label">
                <ColorSwatch id="tooltip-swatch" color="#f00" value="red" />
              </Tooltip>
            </SwatchPicker>,
          );
          cy.get('#tooltip-swatch').focus();
          cy.get('[role="tooltip"]').should('be.visible').and('have.text', 'Red color');
          cy.get('#tooltip-swatch').should('have.attr', 'aria-label', 'Red color');
        });

        it('popup picker opens with native Enter and Escape restores trigger focus', () => {
          mountFluent(
            <Popover>
              <PopoverTrigger disableButtonEnhancement>
                <button id="picker-trigger">Choose color</button>
              </PopoverTrigger>
              <PopoverSurface>
                <SwatchPickerRowColorSample />
              </PopoverSurface>
            </Popover>,
          );
          cy.get('#picker-trigger').focus().realPress('Enter');
          cy.get('.fui-PopoverSurface').should('be.visible');
          cy.get('#swatch-1').realClick().realPress('Escape');
          cy.get('.fui-PopoverSurface').should('not.exist');
          cy.get('#picker-trigger').should('have.focus');
        });
      });

      it('picker with images should be focusable', () => {
        mountFluent(<SwatchPickerRowImageSample />);

        cy.get('#before').focus();

        cy.get('#image-0').should('not.be.focused');

        cy.realPress('Tab');

        cy.get('#image-0').should('be.focused');
        cy.realPress('ArrowRight');
        cy.get('#image-1').should('not.be.focused');
        cy.get('#image-2').should('be.focused');
      });
    });

    describe('grid layout', () => {
      it('should be focusable', () => {
        mountFluent(<SwatchPickerGridColorSample layout="grid" />);

        cy.get('#before').focus();

        cy.get('#color-0').should('not.be.focused');

        cy.realPress('Tab');

        cy.get('#color-0').should('be.focused');
        cy.realPress('ArrowRight');
        cy.get('#color-1').should('be.focused');
        cy.realPress('ArrowDown');
        cy.get('#color-4').should('be.focused');
        cy.realPress('ArrowRight');
        cy.get('#color-5').should('not.be.focused');
        cy.get('#color-6').should('be.focused');
      });
    });
    describe('focusMode="tab"', () => {
      it('should navigate between swatches with Tab key', () => {
        mountFluent(<SwatchPickerRowColorSample focusMode="tab" />);

        cy.get('#before').focus();

        cy.realPress('Tab');
        cy.get('#swatch-0').should('be.focused');

        cy.realPress('Tab');
        cy.get('#swatch-1').should('be.focused');

        cy.realPress('Tab');
        // swatch-2 is disabled, so it should be skipped
        cy.get('#swatch-3').should('be.focused');
      });

      it('should move focus out of picker after last swatch', () => {
        mountFluent(<SwatchPickerRowColorSample focusMode="tab" />);

        cy.get('#swatch-3').focus();

        cy.realPress('Tab');
        cy.get('#after').should('be.focused');
      });
    });
  });

  describe('selection behaviors', () => {
    describe('row layout', () => {
      it('should select color swatch onClick', () => {
        mountFluent(<SwatchPickerRowSample />);
        cy.get('#swatch-0').should('have.attr', 'aria-checked', 'true');
        cy.get('#swatch-1').should('have.attr', 'aria-checked', 'false');
        cy.get('#swatch-1').realClick();
        cy.get('#swatch-1').should('have.attr', 'aria-checked', 'true');
      });
      it('should select color with the Space key', () => {
        mountFluent(<SwatchPickerRowSample />);
        cy.get('#swatch-1').should('have.attr', 'aria-checked', 'false');
        cy.get('#swatch-1').focus().realPress('Space');
        cy.get('#swatch-1').should('have.attr', 'aria-checked', 'true');
      });
      it('should select color with the Enter key', () => {
        mountFluent(<SwatchPickerRowSample />);
        cy.get('#swatch-1').should('have.attr', 'aria-checked', 'false');
        cy.get('#swatch-1').focus().realPress('Enter');
        cy.get('#swatch-1').should('have.attr', 'aria-checked', 'true');
      });
      it('should not select disabled color', () => {
        mountFluent(<SwatchPickerRowSample />);
        cy.get('#swatch-1').should('have.attr', 'aria-checked', 'false');
        cy.get('#swatch-2').realClick();
        cy.get('#swatch-2').should('have.attr', 'aria-checked', 'false');
      });
      it('defaultSelectedValue is correct', () => {
        mountFluent(<SwatchPickerRowColorSample defaultSelectedValue="00AFED" />);
        cy.get('#swatch-0').should('have.attr', 'aria-checked', 'false');
        cy.get('#swatch-3').should('have.attr', 'aria-checked', 'true');
      });
      it('selectedValue value is correct', () => {
        mountFluent(<SwatchPickerRowColorSample selectedValue="00AFED" />);
        cy.get('#swatch-0').should('have.attr', 'aria-checked', 'false');
        cy.get('#swatch-3').should('have.attr', 'aria-checked', 'true');
      });
    });
    describe('grid layout', () => {
      it('should select color swatch onClick', () => {
        mountFluent(<SwatchPickerGridSample />);
        cy.get('#swatch-0').should('have.attr', 'aria-selected', 'true');
        cy.get('#swatch-1').should('have.attr', 'aria-selected', 'false');
        cy.get('#swatch-2').realClick();
        cy.get('#swatch-2').should('have.attr', 'aria-selected', 'true');
      });
      it('should select color with the Space key', () => {
        mountFluent(<SwatchPickerGridSample />);
        cy.get('#swatch-2').should('have.attr', 'aria-selected', 'false');
        cy.get('#swatch-2').focus().realPress('Space');
        cy.get('#swatch-2').should('have.attr', 'aria-selected', 'true');
      });
      it('should select color with the Enter key', () => {
        mountFluent(<SwatchPickerGridSample />);
        cy.get('#swatch-2').should('have.attr', 'aria-selected', 'false');
        cy.get('#swatch-2').focus().realPress('Enter');
        cy.get('#swatch-2').should('have.attr', 'aria-selected', 'true');
      });
      it('should not select disabled color', () => {
        mountFluent(<SwatchPickerGridSample />);
        cy.get('#swatch-1').should('have.attr', 'aria-selected', 'false');
        cy.get('#swatch-1').realClick();
        cy.get('#swatch-1').should('have.attr', 'aria-selected', 'false');
      });
      it('defaultSelectedValue is correct', () => {
        mountFluent(<SwatchPickerGridColorSample defaultSelectedValue="FEFF37" />);
        cy.get('#color-0').should('have.attr', 'aria-selected', 'false');
        cy.get('#color-2').should('have.attr', 'aria-selected', 'true');
      });
      it('selectedValue value is correct', () => {
        mountFluent(<SwatchPickerGridColorSample selectedValue="00B053" />);
        cy.get('#color-0').should('have.attr', 'aria-selected', 'false');
        cy.get('#color-4').should('have.attr', 'aria-selected', 'true');
      });
    });
  });
});
