import 'cypress-real-events';
import * as React from 'react';
import * as axe from 'axe-core';
import { computeAccessibleName, computeAccessibleDescription } from 'dom-accessibility-api';
import { mount } from '@fluentui/scripts-cypress';
import { FluentProvider, webLightTheme, webDarkTheme } from '@fluentui/react-components';
import type { JSXElement, SlotRenderFunction, FluentProviderCustomStyleHooks } from '@fluentui/react-components';
import { ColorArea } from '../ColorArea';
import type { ColorAreaProps, ColorAreaState } from '../ColorArea.types';
import type { HsvColor } from '../../../types/color';
import { ColorPicker } from '../../ColorPicker/ColorPicker';
import { ColorSlider } from '../../ColorSlider/ColorSlider';
import { AlphaSlider } from '../../AlphaSlider/AlphaSlider';
import { ColorPickerProvider } from '../../../contexts/colorPicker';
import { useColorArea_unstable, useColorAreaBase_unstable } from '../useColorArea';
import { useColorAreaStyles_unstable } from '../useColorAreaStyles.styles';
import { renderColorArea_unstable } from '../renderColorArea';
import { ColorAreaDefault } from '../../../../../stories/src/ColorPicker/ColorAreaDefault.stories';
import { Default } from '../../../../../stories/src/ColorPicker/ColorPickerDefault.stories';
import { ColorPickerShape } from '../../../../../stories/src/ColorPicker/ColorPickerShape.stories';
import { ColorPickerPopup } from '../../../../../stories/src/ColorPicker/ColorPickerPopup.stories';
import { ColorAndSwatchPicker } from '../../../../../stories/src/ColorPicker/ColorAndSwatchPicker.stories';
import { ColorSliderDefault } from '../../../../../stories/src/ColorPicker/ColorSliderDefault.stories';
import { ColorSliderChannels } from '../../../../../stories/src/ColorPicker/ColorSliderChannels.stories';
import { AlphaSliderDefault } from '../../../../../stories/src/ColorPicker/AlphaSliderDefault.stories';

const requestedRound = Cypress.env('coverageRound');
if (![1, 2, 3, 4, '1', '2', '3', '4'].includes(requestedRound === undefined ? 4 : requestedRound)) {
  throw new Error('coverageRound must be 1, 2, 3, or 4');
}
const round = Number(requestedRound === undefined ? 4 : requestedRound);
const evidenceRoot = `src/components/ColorArea/.temp/audits-${Date.now()}-${Cypress._.random(0, 1e9)}`;
let auditIndex = 0;
let gradientIndex = 0;
const initial: HsvColor = { h: 324, s: 0.5, v: 0.5, a: 0.4 };
const labels = { inputX: { 'aria-label': 'Saturation' }, inputY: { 'aria-label': 'Brightness' } };
const area = () => cy.get('#area');
const x = () => cy.get<HTMLInputElement>('#area .fui-ColorArea__inputX');
const y = () => cy.get<HTMLInputElement>('#area .fui-ColorArea__inputY');
const render = (element: JSXElement, dir: 'ltr' | 'rtl' = 'ltr', dark = false) =>
  mount(
    <FluentProvider theme={dark ? webDarkTheme : webLightTheme} dir={dir}>
      <main id="fixture" style={{ padding: 40 }}>
        {element}
      </main>
    </FluentProvider>,
  );
const renderArea = (
  props: ColorAreaProps & { ref?: React.Ref<HTMLDivElement> } = {},
  dir: 'ltr' | 'rtl' = 'ltr',
  dark = false,
) => render(<ColorArea id="area" {...labels} defaultColor={initial} {...props} />, dir, dark);
const channels = (s: number, v: number, h = 324) => {
  x().should('have.value', String(Math.round(s * 100)));
  y().should('have.value', String(Math.round(v * 100)));
  area().should($area => {
    const style = $area[0].style;
    expect(style.getPropertyValue('--fui-AreaX--progress')).to.equal(`${Math.round(s * 100)}%`);
    expect(style.getPropertyValue('--fui-AreaY--progress')).to.equal(`${Math.round(v * 100)}%`);
    expect(style.getPropertyValue('--fui-Area--main-color')).to.equal(`hsl(${h}, 100%, 50%)`);
  });
};
function assertRangeInput(input: HTMLInputElement | null, message: string): asserts input is HTMLInputElement {
  expect(input, message).not.to.equal(null);
}
const thumbGeometry = (s: number, v: number, dir: 'ltr' | 'rtl') =>
  area().should($area => {
    const root = $area[0];
    const rect = root.getBoundingClientRect();
    const thumb = root.querySelector('.fui-ColorArea__thumb')!.getBoundingClientRect();
    const centerX = thumb.left + thumb.width / 2;
    const centerY = thumb.top + thumb.height / 2;
    expect(centerX, 'rendered thumb horizontal center').to.be.closeTo(
      rect.left + root.clientLeft + root.clientWidth * (dir === 'rtl' ? 1 - s : s),
      0.1,
    );
    expect(centerY, 'rendered thumb vertical center').to.be.closeTo(
      rect.top + root.clientTop + root.clientHeight * (1 - v),
      0.1,
    );
  });
const gradient = (hueColor: string, dir: 'ltr' | 'rtl' = 'ltr') =>
  area()
    .should($area => {
      const root = $area[0];
      const style = root.ownerDocument.defaultView!.getComputedStyle(root);
      expect(style.backgroundImage, 'downward value overlay above the direction-aware saturation overlay').to.equal(
        `linear-gradient(rgba(0, 0, 0, 0), rgb(0, 0, 0)), linear-gradient(to ${
          dir === 'ltr' ? 'right' : 'left'
        }, rgb(255, 255, 255), rgba(0, 0, 0, 0)), none`,
      );
      expect(style.backgroundColor, 'opaque hue below both overlays').to.equal(hueColor);
    })
    .then($area => {
      const root = $area[0];
      const win = root.ownerDocument.defaultView!;
      const style = win.getComputedStyle(root);
      const thumb = root.querySelector<HTMLElement>('.fui-ColorArea__thumb')!;
      const rect = root.getBoundingClientRect();
      const thumbRect = thumb.getBoundingClientRect();
      const inputX = root.querySelector<HTMLInputElement>('.fui-ColorArea__inputX');
      const inputY = root.querySelector<HTMLInputElement>('.fui-ColorArea__inputY');
      assertRangeInput(inputX, 'saturation range exists before gradient value capture');
      assertRangeInput(inputY, 'brightness range exists before gradient value capture');
      return cy.writeFile(`${evidenceRoot}/gradient-${++gradientIndex}.json`, {
        scenario: Cypress.currentTest.title,
        retries: Cypress.currentRetry,
        direction: style.direction,
        backgroundImage: style.backgroundImage,
        backgroundColor: style.backgroundColor,
        saturation: inputX.value,
        value: inputY.value,
        thumbColor: win.getComputedStyle(thumb).backgroundColor,
        thumbFractionX: (thumbRect.left + thumbRect.width / 2 - rect.left - root.clientLeft) / root.clientWidth,
        thumbFractionY: (thumbRect.top + thumbRect.height / 2 - rect.top - root.clientTop) / root.clientHeight,
      });
    });
const lastColor = (alias: string, color: HsvColor, eventType?: string) =>
  cy.get<sinon.SinonStub>(alias).should(stub => {
    expect(stub.callCount).to.be.greaterThan(0);
    const [event, data] = stub.lastCall.args;
    expect(data.color).to.deep.equal(color);
    expect(data.type).to.equal('change');
    expect(data.event).to.equal(event);
    if (eventType) {
      expect(event.type).to.equal(eventType);
    }
  });
const pointer = (s: number, v: number, action: 'click' | 'down' | 'move' | 'up' = 'click') =>
  area().then($area => {
    const rect = $area[0].getBoundingClientRect();
    const px = Math.round(s * rect.width);
    const py = Math.round((1 - v) * rect.height);
    if (action === 'move') {
      return area().realMouseMove(px, py, { position: 'topLeft', scrollBehavior: false });
    }
    if (action === 'down') {
      return area().realMouseDown({ x: px, y: py, scrollBehavior: false });
    }
    if (action === 'up') {
      return area().realMouseUp({ x: px, y: py, scrollBehavior: false });
    }
    return area().realClick({ x: px, y: py, scrollBehavior: false });
  });
const Controlled = ({ frozen = false, onChange }: { frozen?: boolean; onChange?: ColorAreaProps['onChange'] }) => {
  const [color, setColor] = React.useState(initial);
  return (
    <>
      <ColorArea
        id="area"
        {...labels}
        color={color}
        onChange={(event, data) => {
          onChange?.(event, data);
          if (!frozen) {
            setColor(data.color);
          }
        }}
      />
      <output id="selected">{JSON.stringify(color)}</output>
      <button id="update" onClick={() => setColor({ h: 120, s: 0.25, v: 0.75, a: 0.8 })}>
        Update
      </button>
      <button id="reset" onClick={() => setColor(initial)}>
        Reset
      </button>
    </>
  );
};
const PickerFixture = ({
  vertical = false,
  onChange,
}: {
  vertical?: boolean;
  onChange?: ColorAreaProps['onChange'];
}) => {
  const [color, setColor] = React.useState(initial);
  return (
    <>
      <ColorPicker
        color={color}
        onColorChange={(event, data) => {
          onChange?.(event, data);
          setColor(data.color);
        }}
      >
        <ColorArea id="area" {...labels} />
        <ColorSlider id="hue" aria-label="Hue" vertical={vertical} />
        <AlphaSlider id="alpha" aria-label="Alpha" vertical={vertical} />
      </ColorPicker>
      <output id="selected">{JSON.stringify(color)}</output>
    </>
  );
};
const HookArea = ({ base }: { base: boolean }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const useStateHook = base ? useColorAreaBase_unstable : useColorArea_unstable;
  const state = useStateHook({ id: 'area', ...labels, defaultColor: initial }, ref);
  useColorAreaStyles_unstable(state);
  return renderColorArea_unstable(state);
};

describe('ONLY132 ColorArea browser coverage', () => {
  const auditCurrentFixture = () => {
    return cy
      .get('#fixture')
      .should('be.visible')
      .and('not.be.empty')
      .should($scope => {
        if (
          Cypress.currentTest.title ===
          'R3.04 stable Popup updates the draft area and commits with Ok then reopens the selected color'
        ) {
          const surface = $scope[0].ownerDocument.querySelector('.fui-PopoverSurface')!;
          expect(surface, 'original reopened Popup is present').not.to.equal(null);
          [surface.firstElementChild, surface.lastElementChild].forEach((sentinel, index) => {
            expect(sentinel?.getAttribute('data-tabster-dummy'), 'original modal sentinel is ready').to.equal(
              `isFirst=${index === 0}, isOutside=false, (Modalizer, tabbable=true)`,
            );
            expect(sentinel?.getAttribute('tabindex')).to.equal('0');
          });
        } else {
          expect($scope[0].closest('[aria-hidden="true"]'), 'non-modal fixture is accessibility-exposed').to.equal(
            null,
          );
          expect($scope[0].closest('[inert]'), 'non-modal fixture is not inert').to.equal(null);
        }
      })
      .then($scope =>
        cy
          .then(() =>
            axe.run([$scope[0], ...Array.from($scope[0].ownerDocument.querySelectorAll('.fui-PopoverSurface'))], {
              elementRef: true,
            }),
          )
          .then(result => {
            const report = {
              scenario: Cypress.currentTest.title,
              retries: Cypress.currentRetry,
              classification:
                Cypress.currentTest.title ===
                'R3.03 stable Shape shares controlled channels and renders rounded and square areas'
                  ? 'unchanged Shape story: four unnamed square-picker ranges'
                  : Cypress.currentTest.title ===
                    'R3.04 stable Popup updates the draft area and commits with Ok then reopens the selected color'
                  ? 'unchanged Popup story: unnamed dialog and two Tabster modal sentinels'
                  : Cypress.currentTest.title ===
                    'R3.05 stable Swatch story adds the current area color and Reset restores area and empty swatches'
                  ? 'unchanged Swatch story: two Tabster mover sentinels'
                  : Cypress.currentTest.title ===
                    'R3.07 stable ColorSliderChannels updates saturation independently of hue and brightness'
                  ? 'unchanged Channels story: three unnamed ranges'
                  : 'clean',
              passes: result.passes.map(({ id }) => id),
              violations: result.violations.map(({ id, nodes }) => ({
                id,
                nodes: nodes.map(({ target, html, failureSummary }) => ({ target, html, failureSummary })),
              })),
              incomplete: result.incomplete.map(({ id, nodes }) => ({
                id,
                nodes: nodes.map(({ target, html, any: anyChecks, all, none }) => ({
                  target,
                  html,
                  anyChecks,
                  all,
                  none,
                })),
              })),
            };
            cy.writeFile(`${evidenceRoot}/audit-${++auditIndex}.json`, report).then(() => {
              expect(report.passes.length, 'axe evaluated rules').to.be.greaterThan(0);
              if (
                report.classification === 'unchanged Shape story: four unnamed square-picker ranges' ||
                report.classification === 'unchanged Channels story: three unnamed ranges'
              ) {
                expect(report.violations.map(({ id }) => id)).to.deep.equal(['label']);
                const shape = report.classification === 'unchanged Shape story: four unnamed square-picker ranges';
                const inputs = shape
                  ? $scope[0].querySelectorAll('.fui-ColorPicker')[1].querySelectorAll('input')
                  : $scope[0].querySelectorAll<HTMLInputElement>('.fui-ColorSlider__input');
                expect(inputs).to.have.length(shape ? 4 : 3);
                expect(result.violations[0].nodes).to.have.length(shape ? 4 : 3);
                const values = shape ? ['99', '91', '109', '100'] : ['109', '100', '91'];
                result.violations[0].nodes.forEach((node, index) => {
                  expect(node.target).to.have.length(1);
                  expect($scope[0].ownerDocument.querySelector(String(node.target[0]))).to.equal(inputs[index]);
                  expect(inputs[index].type).to.equal('range');
                  expect(inputs[index].value).to.equal(values[index]);
                  expect(computeAccessibleName(inputs[index])).to.equal('');
                  expect(node.failureSummary).to.equal(
                    'Fix any of the following:\n  Element does not have an implicit (wrapped) <label>\n  Element does not have an explicit <label>\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute\n  Element has no placeholder attribute\n  Element\'s default semantics were not overridden with role="none" or role="presentation"',
                  );
                });
              } else if (
                report.classification === 'unchanged Popup story: unnamed dialog and two Tabster modal sentinels'
              ) {
                expect(report.violations.map(({ id }) => id)).to.deep.equal(['aria-dialog-name', 'aria-hidden-focus']);
                const document = $scope[0].ownerDocument;
                const surface = document.querySelector('.fui-PopoverSurface')!;
                expect(surface.getAttribute('role')).to.equal('dialog');
                expect(surface.getAttribute('aria-modal')).to.equal('true');
                expect(computeAccessibleName(surface)).to.equal('');
                expect(result.violations[0].nodes).to.have.length(1);
                expect(result.violations[0].nodes[0].target).to.deep.equal(['.fui-PopoverSurface']);
                expect(result.violations[0].nodes[0].failureSummary).to.equal(
                  'Fix any of the following:\n  aria-label attribute does not exist or is empty\n  aria-labelledby attribute does not exist, references elements that do not exist or references elements that are empty\n  Element has no title attribute',
                );
                expect(result.violations[1].nodes).to.have.length(2);
                const sentinels = [surface.firstElementChild, surface.lastElementChild];
                result.violations[1].nodes.forEach((node, index) => {
                  expect(node.target).to.have.length(1);
                  const sentinel = document.querySelector(String(node.target[0]))!;
                  expect(sentinel).to.equal(sentinels[index]);
                  expect(sentinel.tagName).to.equal('I');
                  expect(sentinel.getAttribute('tabindex')).to.equal('0');
                  expect(sentinel.getAttribute('aria-hidden')).to.equal('true');
                  expect(sentinel.getAttribute('role')).to.equal('none');
                  expect(sentinel.getAttribute('data-tabster-dummy')).to.equal(
                    `isFirst=${index === 0}, isOutside=false, (Modalizer, tabbable=true)`,
                  );
                  expect(node.failureSummary).to.equal(
                    'Fix all of the following:\n  Focusable content should have tabindex="-1" or be removed from the DOM',
                  );
                });
              } else if (report.classification === 'unchanged Swatch story: two Tabster mover sentinels') {
                expect(report.violations.map(({ id }) => id)).to.deep.equal(
                  result.violations.length ? ['aria-hidden-focus'] : [],
                );
                const sentinels = $scope[0].querySelectorAll('.fui-SwatchPicker i[data-tabster-dummy]');
                expect(sentinels).to.have.length(2);
                if (result.violations.length) {
                  expect(result.violations[0].nodes).to.have.length(2);
                }
                (result.violations[0]?.nodes || []).forEach((node, index) => {
                  expect(node.target).to.have.length(1);
                  expect(node.element).to.equal(sentinels[index]);
                  const sentinel = new DOMParser().parseFromString(node.html, 'text/html').body.firstElementChild!;
                  expect(sentinel.tagName).to.equal('I');
                  expect(sentinel.getAttribute('tabindex')).to.equal('0');
                  expect(sentinel.getAttribute('aria-hidden')).to.equal('true');
                  expect(sentinel.getAttribute('role')).to.equal('none');
                  expect(sentinel.getAttribute('data-tabster-dummy')).to.equal(
                    `isFirst=${index === 0}, isOutside=false, (Mover, tabbable=true)`,
                  );
                  expect(node.failureSummary).to.equal(
                    'Fix all of the following:\n  Focusable content should have tabindex="-1" or be removed from the DOM',
                  );
                });
              } else {
                expect(report.violations, 'unexpected axe violations').to.deep.equal([]);
              }
              expect(report.incomplete, 'unexpected axe incompletes').to.deep.equal([]);
            });
          }),
      );
  };

  // Preserve this suite's audit scope while keeping verdict failures in test bodies.
  const it = (title: string, body: () => void, afterAudit?: () => void): Mocha.Test =>
    globalThis.it(title, () => {
      body();
      return auditCurrentFixture().then(() => {
        afterAudit?.();
      });
    });

  const registerRoundTwo = () => {
    if (round >= 2) {
      for (const dir of ['ltr', 'rtl'] as const) {
        for (const [s, v] of [
          [0.25, 0.75],
          [0.75, 0.25],
          [0.33, 0.67],
        ] as const) {
          it(`R2.01 ${dir} pointer (${s}, ${v}) uses physical coordinates with exact rounded HSV`, () => {
            const change = cy.stub().as('change');
            renderArea({ onChange: change }, dir);
            pointer(s, v);
            channels(s, v);
            thumbGeometry(s, v, dir);
            cy.get('@change').should('have.been.calledOnce');
            lastColor('@change', { ...initial, s, v }, 'pointerdown');
            cy.get<sinon.SinonStub>('@change').then(stub => {
              const event: PointerEvent = stub.lastCall.args[0];
              expect(event.isTrusted).to.equal(true);
              expect(event.defaultPrevented).to.equal(true);
              expect(event.pointerType).to.equal('mouse');
            });
          });
        }
      }
      for (const dir of ['ltr', 'rtl'] as const) {
        it(`R2.02 ${dir} border-adjacent real clicks round to all four exact corners without losing hue`, () => {
          const alias = `corner-${dir}`;
          const change = cy.stub().as(alias);
          renderArea({ onChange: change, style: { width: 600, height: 600 } }, dir);
          for (const [s, v] of [
            [0, 1],
            [1, 1],
            [1, 0],
            [0, 0],
          ] as const) {
            pointer(s === 0 ? 0.003 : 0.997, v === 0 ? 0.003 : 0.997);
            channels(s, v);
            thumbGeometry(s, v, dir);
            lastColor(`@${alias}`, { ...initial, s, v }, 'pointerdown');
          }
          cy.get(`@${alias}`).should('have.callCount', 4);
        });
      }
      for (const dir of ['ltr', 'rtl'] as const) {
        it(`R2.03 ${dir} document drag clamps outside corners and stops after pointerup`, () => {
          const change = cy.stub().as('change');
          renderArea({ onChange: change }, dir);
          pointer(0.25, 0.75, 'down');
          channels(0.25, 0.75);
          pointer(1.05, -0.05, 'move');
          channels(1, 0);
          lastColor('@change', { ...initial, s: 1, v: 0 }, 'pointermove');
          pointer(-0.05, 1.05, 'move');
          channels(0, 1);
          pointer(0.75, 0.25, 'move');
          channels(0.75, 0.25);
          pointer(0.75, 0.25, 'up');
          cy.get<sinon.SinonStub>('@change').then(stub => {
            const count = stub.callCount;
            expect(count).to.equal(4);
            pointer(0.5, 0.5, 'move');
            cy.get('@change').should('have.callCount', count);
            channels(0.75, 0.25);
          });
        });
      }
      it('R2.04 a second drag registers one move listener and does not duplicate callbacks', () => {
        const change = cy.stub().as('change');
        renderArea({ onChange: change });
        pointer(0.2, 0.8, 'down');
        pointer(0.3, 0.7, 'move');
        pointer(0.3, 0.7, 'up');
        pointer(0.4, 0.6, 'down');
        pointer(0.6, 0.4, 'move');
        pointer(0.6, 0.4, 'up');
        cy.get('@change').should('have.callCount', 4);
        channels(0.6, 0.4);
      });
      it('R2.05 frozen controlled pointer requests preserve the owner color throughout a drag', () => {
        const change = cy.stub().as('change');
        render(<Controlled frozen onChange={change} />);
        pointer(0.25, 0.75, 'down');
        pointer(0.75, 0.25, 'move');
        pointer(0.75, 0.25, 'up');
        channels(0.5, 0.5);
        cy.get('@change').should('have.been.calledTwice');
        lastColor('@change', { ...initial, s: 0.75, v: 0.25 });
      });
      it('R2.06 black to colored pointer selection retains nonzero hue and optional alpha', () => {
        const change = cy.stub().as('change');
        renderArea({ defaultColor: { h: 111, s: 1, v: 0 }, onChange: change });
        pointer(0.5, 0.5);
        channels(0.5, 0.5, 111);
        lastColor('@change', { h: 111, s: 0.5, v: 0.5 });
        area().should('have.css', 'background-color', 'rgb(38, 255, 0)');
      });
      it('R2.07 consumer root pointerdown runs first; preventDefault does not veto the internal request', () => {
        const order: string[] = [];
        const parent = cy.stub().as('parent');
        const change = cy.stub().as('change');
        render(
          <div onPointerDown={parent}>
            <ColorArea
              id="area"
              {...labels}
              defaultColor={initial}
              onPointerDown={event => {
                order.push('consumer');
                expect(event.defaultPrevented).to.equal(false);
                event.preventDefault();
              }}
              onChange={(event, data) => {
                order.push('change');
                change(event, data);
              }}
            />
          </div>,
        );
        pointer(0.25, 0.75);
        channels(0.25, 0.75);
        cy.get('@change')
          .should('have.been.calledOnce')
          .then(() => expect(order).to.deep.equal(['consumer', 'change']));
        cy.get('@parent').should('not.have.been.called');
        lastColor('@change', { ...initial, s: 0.25, v: 0.75 });
      });
      it('R2.08 consumer keyboard preventDefault is merged, not a cancellation gate, and bubbles once', () => {
        const order: string[] = [];
        const parent = cy.stub().as('parent');
        const change = cy.stub().as('change');
        render(
          <div onKeyDown={parent}>
            <ColorArea
              id="area"
              {...labels}
              defaultColor={initial}
              onKeyDown={event => {
                order.push('consumer');
                event.preventDefault();
              }}
              onChange={(event, data) => {
                order.push('change');
                change(event, data);
              }}
            />
          </div>,
        );
        x().focus();
        cy.realPress('ArrowRight');
        channels(0.51, 0.5);
        thumbGeometry(0.51, 0.5, 'ltr');
        cy.get('@change')
          .should('have.been.calledOnce')
          .then(() => expect(order).to.deep.equal(['consumer', 'change']));
        cy.get('@parent').should('have.been.calledOnce');
        lastColor('@change', { ...initial, s: 0.51 });
      });
      for (const axis of ['x', 'y'] as const) {
        for (const [key, target] of [
          ['Home', 0],
          ['End', 1],
        ] as const) {
          it(`R2.09 native ${axis} ${key} fires slot onChange first and exact color data second`, () => {
            const order: string[] = [];
            const change = cy.stub().as('change');
            const input = {
              'aria-label': axis === 'x' ? 'Saturation' : 'Brightness',
              onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                order.push('slot');
                event.preventDefault();
              },
            };
            renderArea({
              [axis === 'x' ? 'inputX' : 'inputY']: input,
              onChange: (event, data) => {
                order.push('color');
                change(event, data);
              },
            });
            (axis === 'x' ? x() : y()).focus();
            cy.realPress(key);
            channels(axis === 'x' ? target : 0.5, axis === 'y' ? target : 0.5);
            cy.get('@change')
              .should('have.been.calledOnce')
              .then(() => expect(order).to.deep.equal(['slot', 'color']));
            lastColor('@change', { ...initial, [axis === 'x' ? 's' : 'v']: target }, 'change');
          });
        }
      }
      it('R2.10 slot step/min/max affect native Home/End, not the root one-percent arrow algorithm', () => {
        const change = cy.stub().as('change');
        renderArea({ inputX: { 'aria-label': 'Saturation', min: 10, max: 90, step: 10 }, onChange: change });
        x().focus();
        cy.realPress('ArrowRight');
        area().should($area => expect($area[0].style.getPropertyValue('--fui-AreaX--progress')).to.equal('51%'));
        lastColor('@change', { ...initial, s: 0.51 }, 'keydown');
        cy.realPress('Home');
        channels(0.1, 0.5);
        lastColor('@change', { ...initial, s: 0.1 }, 'change');
        cy.realPress('End');
        channels(0.9, 0.5);
        cy.get('@change').should('have.been.calledThrice');
      });
      it('R2.11 disabled input slots skip real Tab but do not disable the area pointer API', () => {
        const change = cy.stub().as('change');
        render(
          <>
            <button id="before">Before</button>
            <ColorArea
              id="area"
              defaultColor={initial}
              onChange={change}
              inputX={{ 'aria-label': 'Saturation', disabled: true }}
              inputY={{ 'aria-label': 'Brightness', disabled: true }}
            />
            <button id="after">After</button>
          </>,
        );
        cy.get('#before').focus();
        cy.realPress('Tab');
        cy.get('#after').should('have.focus');
        x().should('be.disabled');
        y().should('be.disabled');
        pointer(0.25, 0.75);
        channels(0.25, 0.75);
        cy.get('@change').should('have.been.calledOnce');
      });
      it('R2.12 aria-disabled is descriptive only and does not block real keyboard changes', () => {
        const change = cy.stub().as('change');
        renderArea({ 'aria-disabled': true, onChange: change });
        x().focus();
        cy.realPress('ArrowRight');
        channels(0.51, 0.5);
        cy.get('@change').should('have.been.calledOnce');
        area().should('have.attr', 'aria-disabled', 'true');
      });
      it('R2.13 root and all slot refs target the real mounted nodes with user attributes preserved', () => {
        const rootRef = React.createRef<HTMLDivElement>();
        const thumbRef = React.createRef<HTMLDivElement>();
        const xRef = React.createRef<HTMLInputElement>();
        const yRef = React.createRef<HTMLInputElement>();
        renderArea({
          ref: rootRef,
          className: 'consumer-root',
          title: 'Choose color',
          thumb: { ref: thumbRef, id: 'thumb', className: 'consumer-thumb' },
          inputX: { ref: xRef, id: 'saturation', className: 'consumer-x', 'aria-label': 'Saturation' },
          inputY: { ref: yRef, id: 'brightness', className: 'consumer-y', 'aria-label': 'Brightness' },
        });
        area()
          .should('have.class', 'consumer-root')
          .and('have.attr', 'title', 'Choose color')
          .then($el => expect(rootRef.current).to.equal($el[0]));
        cy.get('#thumb')
          .should('have.class', 'consumer-thumb')
          .then($el => expect(thumbRef.current).to.equal($el[0]));
        x()
          .should('have.class', 'consumer-x')
          .then($el => expect(xRef.current).to.equal($el[0]));
        y()
          .should('have.class', 'consumer-y')
          .then($el => expect(yRef.current).to.equal($el[0]));
        x().focus();
        cy.realPress('ArrowRight');
        channels(0.51, 0.5);
      });
      it('R2.14 required slots remain present when explicitly undefined and input values override slot values', () => {
        renderArea({
          thumb: undefined,
          inputX: { 'aria-label': 'Saturation', value: 80, type: 'range' },
          inputY: { 'aria-label': 'Brightness', value: 20, tabIndex: 0 },
        });
        area().find('.fui-ColorArea__thumb').should('have.length', 1);
        channels(0.5, 0.5);
        y().should('have.attr', 'tabindex', '0');
        y().focus();
        cy.realPress('ArrowDown');
        channels(0.5, 0.49);
      });
      it('R2.15 thumb render function preserves native inputs, refs and interactive behavior', () => {
        const thumb: SlotRenderFunction<React.ComponentProps<'div'>> = (Thumb, props) => (
          <Thumb {...props} data-rendered="true">
            {props.children}
          </Thumb>
        );
        renderArea({ thumb: { children: thumb } });
        area().find('[data-rendered="true"] input').should('have.length', 2);
        x().focus();
        cy.realPress('ArrowUp');
        channels(0.5, 0.51);
        pointer(0.25, 0.75);
        channels(0.25, 0.75);
      });
      it('R2.16 names serialize saturation/value in a form; arrows do not submit; submit button does', () => {
        const submit = cy.stub().as('submit');
        render(
          <form
            aria-label="Color selection"
            onSubmit={event => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              submit({ saturation: data.get('saturation'), brightness: data.get('brightness') });
            }}
          >
            <ColorArea
              id="area"
              defaultColor={initial}
              inputX={{ 'aria-label': 'Saturation', name: 'saturation' }}
              inputY={{ 'aria-label': 'Brightness', name: 'brightness' }}
            />
            <button id="submit" type="submit">
              Save color
            </button>
          </form>,
        );
        x().focus();
        cy.realPress('ArrowRight');
        cy.realPress('ArrowUp');
        channels(0.51, 0.51);
        cy.get('@submit').should('not.have.been.called');
        cy.get('#submit').realClick();
        cy.get('@submit').should('have.been.calledOnceWithExactly', { saturation: '51', brightness: '51' });
      });
      it('R2.17 consumer size/style survives, but computed color CSS variables override stale user progress', () => {
        renderArea({
          style: { width: 400, height: 200, minHeight: 200, '--fui-AreaX--progress': '99%' } as React.CSSProperties,
        });
        area().should($area => {
          const rect = $area[0].getBoundingClientRect();
          expect(rect.width).to.equal(400);
          expect(rect.height).to.equal(200);
        });
        channels(0.5, 0.5);
        pointer(0.25, 0.75);
        channels(0.25, 0.75);
      });
    }
  };

  const registerRoundThree = () => {
    if (round < 3) {
      return;
    }
    it('R3.01 stable ColorAreaDefault updates both channels, textual value description and Reset', () => {
      render(<ColorAreaDefault />);
      cy.get('.fui-ColorArea__inputX').focus();
      cy.realPress('ArrowRight');
      cy.get('.fui-ColorArea__inputX').should('have.value', '51');
      cy.get('.fui-ColorArea__inputY').should('have.value', '50');
      cy.get('.fui-ColorArea__inputX').should('have.attr', 'aria-valuetext', 'Saturation 51, Brightness: 50, ');
      cy.realPress('ArrowUp');
      cy.get('.fui-ColorArea__inputY').should('have.value', '51');
      cy.contains('button', 'Reset').realClick();
      cy.get('.fui-ColorArea__inputX').should('have.value', '50');
      cy.get('.fui-ColorArea__inputY').should('have.value', '50');
    });
    it('R3.02 stable Default synchronizes area, HEX and RGB and accepts a valid external HEX update', () => {
      render(<Default />);
      cy.get('.fui-ColorArea__inputX').focus();
      cy.realPress('ArrowLeft');
      cy.get('.fui-ColorArea__inputX').should('have.value', '99');
      cy.get('input').filter('[type="text"]').first().should('have.value', '#2ce602');
      cy.get('input').filter('[type="text"]').first().clear().type('#ff0000').blur();
      cy.get('.fui-ColorArea__inputX').should('have.value', '100');
      cy.get('.fui-ColorArea__inputY').should('have.value', '100');
      cy.get('.fui-ColorArea').should($el =>
        expect($el[0].style.getPropertyValue('--fui-Area--main-color')).to.equal('hsl(0, 100%, 50%)'),
      );
    });
    it('R3.03 stable Shape shares controlled channels and renders rounded and square areas', () => {
      render(<ColorPickerShape />);
      cy.get('.fui-ColorArea').eq(0).should('have.css', 'border-top-left-radius', '4px');
      cy.get('.fui-ColorArea').eq(1).should('have.css', 'border-top-left-radius', '0px');
      cy.get('.fui-ColorArea__inputX').first().focus();
      cy.realPress('ArrowLeft');
      cy.get('.fui-ColorArea__inputX').each($el => expect($el.val()).to.equal('99'));
      cy.get('.fui-ColorArea__inputY').each($el => expect($el.val()).to.equal('91'));
    });
    it(
      'R3.04 stable Popup updates the draft area and commits with Ok then reopens the selected color',
      () => {
        render(<ColorPickerPopup />);
        cy.contains('button', 'Choose color').realClick();
        cy.get('.fui-PopoverSurface .fui-ColorArea__inputX').focus();
        cy.realPress('ArrowLeft');
        cy.get('.fui-PopoverSurface .fui-ColorArea__inputX').should('have.value', '99');
        cy.contains('button', 'Ok').realClick();
        cy.get('.fui-PopoverSurface').should('not.exist');
        cy.contains('button', 'Choose color').realClick();
        cy.get('.fui-PopoverSurface .fui-ColorArea__inputX').should('have.value', '99');
      },
      () => {
        cy.contains('.fui-PopoverSurface button', 'Ok').realClick();
        cy.get('.fui-PopoverSurface').should('not.exist');
        cy.get('#fixture').should($scope => {
          expect($scope[0].closest('[aria-hidden="true"]'), 'audited Popup releases fixture isolation').to.equal(null);
          expect($scope[0].closest('[inert]')).to.equal(null);
        });
      },
    );
    it('R3.05 stable Swatch story adds the current area color and Reset restores area and empty swatches', () => {
      render(<ColorAndSwatchPicker />);
      cy.get('.fui-ColorArea__inputX').focus();
      cy.realPress('ArrowLeft');
      cy.get('.fui-ColorArea__inputX').should('have.value', '99');
      cy.get('#add-new-color').realClick();
      cy.get('.fui-ColorSwatch').should('have.length', 1).and('have.attr', 'aria-label', 'rgb(44, 230, 2)');
      cy.get('#reset-example').realClick();
      cy.get('.fui-ColorSwatch').should('not.exist');
      cy.get('.fui-EmptySwatch').should('have.length', 8);
      cy.get('.fui-ColorArea__inputX').should('have.value', '100');
      cy.get('.fui-SwatchPicker').should($picker => {
        expect($picker[0].firstElementChild!.tagName).to.equal('I');
        expect($picker[0].lastElementChild!.tagName).to.equal('I');
      });
    });
    it('R3.06 stable ColorSliderDefault exposes horizontal/vertical hue and synchronized exact values', () => {
      render(<ColorSliderDefault />);
      cy.get('.fui-ColorSlider__input').first().focus();
      cy.realPress('ArrowRight');
      cy.get('.fui-ColorSlider__input').each($el => expect($el.val()).to.equal('110'));
      cy.get('.fui-ColorSlider__input').eq(1).should('have.attr', 'aria-orientation', 'vertical');
      cy.contains('button', 'Reset').realClick();
      cy.get('.fui-ColorSlider__input').each($el => expect($el.val()).to.equal('109'));
    });
    it('R3.07 stable ColorSliderChannels updates saturation independently of hue and brightness', () => {
      render(<ColorSliderChannels />);
      cy.get('.fui-ColorSlider__input').eq(1).focus();
      cy.realPress('ArrowLeft');
      cy.get('.fui-ColorSlider__input').eq(1).should('have.value', '99');
      cy.get('.fui-ColorSlider__input')
        .eq(0)
        .should('have.value', '109')
        .and('have.attr', 'value', '108.83116883116882');
      cy.get('.fui-ColorSlider__input').eq(2).should('have.value', '91').and('have.attr', 'value', '90.58823529411765');
      cy.contains('button', 'Reset').realClick();
      cy.get('.fui-ColorSlider__input').eq(1).should('have.value', '100');
    });
    it('R3.08 stable AlphaSliderDefault changes both primary alpha inputs without changing transparency examples', () => {
      render(<AlphaSliderDefault />);
      cy.get('.fui-AlphaSlider__input').first().focus();
      cy.realPress('ArrowLeft');
      cy.get('.fui-AlphaSlider__input').eq(0).should('have.value', '99');
      cy.get('.fui-AlphaSlider__input').eq(1).should('have.value', '99');
      cy.get('.fui-AlphaSlider__input').eq(2).should('have.value', '0');
      cy.contains('button', /^Reset$/).realClick();
      cy.get('.fui-AlphaSlider__input').eq(0).should('have.value', '100');
    });
    for (const vertical of [false, true]) {
      it(`R3.09 ${
        vertical ? 'vertical' : 'horizontal'
      } sibling hue/alpha integrate through context without losing channels`, () => {
        const change = cy.stub().as('change');
        render(<PickerFixture vertical={vertical} onChange={change} />);
        x().focus();
        cy.realPress('ArrowRight');
        channels(0.51, 0.5);
        cy.get('#hue').focus();
        cy.realPress(vertical ? 'ArrowUp' : 'ArrowRight');
        cy.get('#hue').should('have.value', '325');
        channels(0.51, 0.5, 325);
        cy.get('#alpha').focus();
        cy.realPress('ArrowLeft');
        cy.get('#alpha').should('have.value', '39');
        x().focus();
        cy.realPress('ArrowUp');
        channels(0.51, 0.51, 325);
        cy.get('@change').should('have.callCount', 4);
        lastColor('@change', { h: 325, s: 0.51, v: 0.51, a: 0.39 });
        cy.get('#selected').should('have.text', JSON.stringify({ h: 325, s: 0.51, v: 0.51, a: 0.39 }));
      });
    }
    it('R3.10 a read-only context reports requests without changing its controlled area', () => {
      const change = cy.stub().as('change');
      render(
        <ColorPicker color={initial} onColorChange={change}>
          <ColorArea id="area" {...labels} />
        </ColorPicker>,
      );
      x().focus();
      cy.realPress('ArrowDown');
      channels(0.5, 0.5);
      cy.get('@change').should('have.been.calledOnce');
      lastColor('@change', { ...initial, v: 0.49 }, 'keydown');
    });
    it('R3.11 explicit child color overrides context and defaultColor but still forwards to context', () => {
      const change = cy.stub().as('change');
      render(
        <ColorPicker color={initial} onColorChange={change}>
          <ColorArea id="area" {...labels} color={{ h: 90, s: 0.2, v: 0.7 }} defaultColor={initial} />
        </ColorPicker>,
      );
      channels(0.2, 0.7, 90);
      x().focus();
      cy.realPress('ArrowRight');
      channels(0.2, 0.7, 90);
      lastColor('@change', { h: 90, s: 0.2 + 0.01, v: 0.7 });
    });
    it('R3.12 explicit area onChange replaces rather than duplicates the context callback', () => {
      const parent = cy.stub().as('parent');
      const child = cy.stub().as('child');
      render(
        <ColorPicker color={initial} onColorChange={parent}>
          <ColorArea id="area" {...labels} onChange={child} />
        </ColorPicker>,
      );
      pointer(0.25, 0.75);
      channels(0.5, 0.5);
      cy.get('@parent').should('not.have.been.called');
      cy.get('@child').should('have.been.calledOnce');
      lastColor('@child', { ...initial, s: 0.25, v: 0.75 }, 'pointerdown');
    });
    it('R3.13 nested ColorPicker selects the nearest color and requestChange only', () => {
      const outer = cy.stub().as('outer');
      const inner = cy.stub().as('inner');
      render(
        <ColorPicker color={initial} onColorChange={outer}>
          <ColorPicker color={{ h: 180, s: 0.2, v: 0.8 }} onColorChange={inner}>
            <ColorArea id="area" {...labels} />
          </ColorPicker>
        </ColorPicker>,
      );
      channels(0.2, 0.8, 180);
      x().focus();
      cy.realPress('ArrowDown');
      lastColor('@inner', { h: 180, s: 0.2, v: 0.8 - 0.01 });
      cy.get('@outer').should('not.have.been.called');
    });
    it('R3.14 context with undefined color permits defaultColor and uncontrolled state', () => {
      const change = cy.stub().as('change');
      render(
        <ColorPicker onColorChange={change}>
          <ColorArea id="area" {...labels} defaultColor={initial} />
        </ColorPicker>,
      );
      x().focus();
      cy.realPress('ArrowRight');
      channels(0.51, 0.5);
      lastColor('@change', { ...initial, s: 0.51 });
    });
    for (const [context, own, expected] of [
      ['square', undefined, '0px'],
      ['square', 'rounded', '4px'],
      ['rounded', 'square', '0px'],
      ['rounded', undefined, '4px'],
    ] as const) {
      it(`R3.15 unit-derived shape context ${context} / prop ${String(own)} resolves ${expected}`, () => {
        render(
          <ColorPickerProvider value={{ color: undefined, shape: context, requestChange: () => undefined }}>
            <ColorArea id="area" {...labels} defaultColor={initial} shape={own} />
          </ColorPickerProvider>,
        );
        area().should('have.css', 'border-top-left-radius', expected);
        x().focus();
        cy.realPress('ArrowRight');
        channels(0.51, 0.5);
      });
    }
    for (const dark of [false, true]) {
      it(`R3.16 ${dark ? 'dark' : 'light'} theme applies real border tokens, gradient and alpha thumb`, () => {
        renderArea({}, 'ltr', dark);
        area()
          .should('have.css', 'border-top-left-radius', '4px')
          .and('have.css', 'border-top-color', dark ? 'rgb(102, 102, 102)' : 'rgb(209, 209, 209)');
        gradient('rgb(255, 0, 153)');
        area().should($el =>
          expect($el[0].style.getPropertyValue('--fui-Area__thumb--color')).to.equal('hsla(324, 33.33%, 37.5%, 0.4)'),
        );
        area().find('.fui-ColorArea__thumb').should('have.css', 'background-color', 'rgba(127, 64, 102, 0.4)');
        pointer(0.25, 0.75);
        channels(0.25, 0.75);
      });
    }
    it('R3.17 dynamic accessible names, descriptions, orientations and non-color feedback update', () => {
      const Fixture = () => {
        const [color, setColor] = React.useState(initial);
        const text = `Saturation ${Math.round(color.s * 100)}; brightness ${Math.round(color.v * 100)}`;
        return (
          <>
            <p id="description">Use arrow keys to choose saturation and brightness.</p>
            <ColorArea
              id="area"
              color={color}
              onChange={(_, data) => setColor(data.color)}
              inputX={{
                'aria-label': 'Saturation',
                'aria-describedby': 'description',
                'aria-orientation': 'horizontal',
                'aria-roledescription': '2D slider',
                'aria-valuetext': text,
              }}
              inputY={{
                'aria-label': 'Brightness',
                'aria-describedby': 'description',
                'aria-orientation': 'vertical',
                'aria-valuetext': text,
              }}
            />
            <output id="text">{text}</output>
          </>
        );
      };
      render(<Fixture />);
      x().focus();
      cy.realPress('ArrowRight');
      cy.realPress('ArrowUp');
      channels(0.51, 0.51);
      for (const input of [x, y]) {
        input()
          .should('have.attr', 'aria-valuetext', 'Saturation 51; brightness 51')
          .then($el => {
            expect(computeAccessibleDescription($el[0])).to.equal(
              'Use arrow keys to choose saturation and brightness.',
            );
            expect(computeAccessibleName($el[0])).to.equal(input === x ? 'Saturation' : 'Brightness');
          });
      }
      x().should('have.attr', 'aria-orientation', 'horizontal');
      y().should('have.attr', 'aria-orientation', 'vertical');
      cy.get('#text').should('have.text', 'Saturation 51; brightness 51');
    });
    it('R3.18 HTML label associations name both native inputs and clicking the label focuses saturation', () => {
      render(
        <>
          <label htmlFor="saturation">Saturation</label>
          <label htmlFor="brightness">Brightness</label>
          <ColorArea id="area" defaultColor={initial} inputX={{ id: 'saturation' }} inputY={{ id: 'brightness' }} />
        </>,
      );
      cy.contains('label', 'Saturation').realClick();
      x()
        .should('have.focus')
        .then($el => expect(computeAccessibleName($el[0])).to.equal('Saturation'));
      y().then($el => expect(computeAccessibleName($el[0])).to.equal('Brightness'));
      cy.realPress('ArrowRight');
      channels(0.51, 0.5);
    });
    it('R3.19 real keyboard focus draws a visible thumb outline and preserves focus while moving', () => {
      render(
        <>
          <button id="before">Before</button>
          <ColorArea id="area" {...labels} defaultColor={initial} />
        </>,
      );
      cy.get('#before').focus();
      cy.realPress('Tab');
      x().should('have.focus');
      cy.realPress('ArrowRight');
      x().should('have.focus');
      area()
        .find('.fui-ColorArea__thumb')
        .should($thumb => {
          const style = $thumb[0].ownerDocument.defaultView!.getComputedStyle($thumb[0], '::after');
          expect(style.content).to.equal('""');
          expect(style.borderTopStyle).to.equal('solid');
          expect(style.borderTopWidth).to.equal('2px');
          expect(style.borderTopColor).to.equal('rgb(0, 0, 0)');
        });
      channels(0.51, 0.5);
    });
    it('R3.20 live callback replacement is used by keyboard and subsequent document drag moves', () => {
      const first = cy.stub().as('first');
      const second = cy.stub().as('second');
      const Fixture = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <>
            <ColorArea id="area" {...labels} defaultColor={initial} onChange={updated ? second : first} />
            <button id="update" onClick={() => setUpdated(true)}>
              Replace handler
            </button>
          </>
        );
      };
      render(<Fixture />);
      x().focus();
      cy.realPress('ArrowRight');
      cy.get('#update').realClick();
      x().focus();
      cy.realPress('ArrowDown');
      pointer(0.25, 0.75, 'down');
      pointer(0.75, 0.25, 'move');
      pointer(0.75, 0.25, 'up');
      cy.get('@first').should('have.been.calledOnce');
      cy.get('@second').should('have.been.calledThrice');
      lastColor('@second', { ...initial, s: 0.75, v: 0.25 }, 'pointermove');
      channels(0.75, 0.25);
    });
    it('R3.21 controlled rerender during an active drag uses the latest hue/alpha, not stale pointerdown state', () => {
      const change = cy.stub().as('change');
      const Fixture = () => {
        const [color, setColor] = React.useState(initial);
        return (
          <ColorArea
            id="area"
            {...labels}
            color={color}
            onChange={(event, data) => {
              change(event, data);
              setColor({ ...data.color, h: 120, a: 0.8 });
            }}
          />
        );
      };
      render(<Fixture />);
      pointer(0.25, 0.75, 'down');
      channels(0.25, 0.75, 120);
      pointer(0.75, 0.25, 'move');
      pointer(0.75, 0.25, 'up');
      lastColor('@change', { h: 120, s: 0.75, v: 0.25, a: 0.8 });
      cy.get('@change').should('have.been.calledTwice');
    });
    for (const base of [false, true]) {
      it(`R3.22 exported ${
        base ? 'base' : 'styled'
      } state hook/styles/renderer compose a working uncontrolled area`, () => {
        render(<HookArea base={base} />);
        x().focus();
        cy.realPress('ArrowUp');
        channels(0.5, 0.51);
        pointer(0.25, 0.75);
        channels(0.25, 0.75);
      });
    }
    it('R3.23 provider custom style hook receives live ColorArea state without dropping interaction', () => {
      const isAreaState = (state: unknown): state is ColorAreaState =>
        typeof state === 'object' &&
        state !== null &&
        'components' in state &&
        typeof state.components === 'object' &&
        state.components !== null &&
        'inputX' in state.components &&
        state.components.inputX === 'input' &&
        'root' in state &&
        typeof state.root === 'object' &&
        state.root !== null &&
        'thumb' in state &&
        typeof state.thumb === 'object' &&
        state.thumb !== null;
      const custom = (state: unknown) => {
        if (!isAreaState(state)) {
          throw new Error('Custom style hook received a non-ColorArea state');
        }
        state.root.style = { ...state.root.style, borderWidth: '3px' };
        state.thumb.title = 'Custom thumb';
      };
      const hooks: FluentProviderCustomStyleHooks = {};
      hooks.useColorAreaStyles_unstable = custom;
      render(
        <FluentProvider customStyleHooks_unstable={hooks}>
          <ColorArea id="area" {...labels} defaultColor={initial} />
        </FluentProvider>,
      );
      area().should('have.css', 'border-top-width', '3px');
      area().find('[title="Custom thumb"]').should('have.length', 1);
      x().focus();
      cy.realPress('ArrowRight');
      channels(0.51, 0.5);
    });
    it('R3.24 unmount releases consumer refs and completed drag listeners without changing another area', () => {
      const rootRef = React.createRef<HTMLDivElement>();
      const inputRef = React.createRef<HTMLInputElement>();
      const change = cy.stub().as('change');
      const Fixture = () => {
        const [visible, setVisible] = React.useState(true);
        return (
          <>
            {visible && (
              <ColorArea
                id="area"
                ref={rootRef}
                defaultColor={initial}
                onChange={change}
                {...labels}
                inputX={{ 'aria-label': 'Saturation', ref: inputRef }}
              />
            )}
            <button id="remove" onClick={() => setVisible(false)}>
              Remove area
            </button>
            <ColorArea id="other" {...labels} defaultColor={{ h: 180, s: 0.2, v: 0.8 }} />
          </>
        );
      };
      render(<Fixture />);
      pointer(0.25, 0.75, 'down');
      pointer(0.75, 0.25, 'move');
      pointer(0.75, 0.25, 'up');
      cy.get('#remove')
        .realClick()
        .then(() => {
          expect(rootRef.current).to.equal(null);
          expect(inputRef.current).to.equal(null);
        });
      cy.get('#area').should('not.exist');
      cy.get('#other').realHover();
      cy.get('#other .fui-ColorArea__inputX').should('have.value', '20');
      cy.get('@change').should('have.been.calledTwice');
    });
    for (const [key, target] of [
      ['PageUp', 0.6],
      ['PageDown', 0.4],
    ] as const) {
      it(`R3.25 native ${key} uses the browser ten-percent step instead of an invented ColorArea API`, () => {
        const change = cy.stub().as('change');
        renderArea({ onChange: change });
        x().focus();
        cy.realPress(key);
        channels(target, 0.5);
        lastColor('@change', { ...initial, s: target }, 'change');
      });
    }
    it('R3.26 Shift-modified ArrowRight remains an exact one-percent root step', () => {
      const change = cy.stub().as('change');
      renderArea({ onChange: change });
      x().focus();
      cy.realPress(['Shift', 'ArrowRight']);
      channels(0.51, 0.5);
      lastColor('@change', { ...initial, s: 0.51 }, 'keydown');
      cy.get('@change').should('have.been.calledOnce');
    });
  };

  const forcedColors = (active: boolean) =>
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Emulation.setEmulatedMedia',
        params: { features: [{ name: 'forced-colors', value: active ? 'active' : 'none' }] },
      }),
    );
  const registerRoundFour = () => {
    if (round < 4) {
      return;
    }
    for (const dir of ['ltr', 'rtl'] as const) {
      it(`R4.01 ${dir} real forced-colors retains direction-aware gradients, thumb geometry and keyboard focus indicator`, () => {
        forcedColors(true);
        render(
          <>
            <button id="before">Before</button>
            <ColorArea id="area" {...labels} defaultColor={initial} />
          </>,
          dir,
        );
        cy.window().should(win => expect(win.matchMedia('(forced-colors: active)').matches).to.equal(true));
        area().should('have.css', 'forced-color-adjust', 'none');
        gradient('rgb(255, 0, 153)', dir);
        cy.get('#before').focus();
        cy.realPress('Tab');
        x().should('have.focus');
        cy.realPress('ArrowRight');
        channels(0.51, 0.5);
        thumbGeometry(0.51, 0.5, dir);
        area()
          .find('.fui-ColorArea__thumb')
          .should('have.css', 'forced-color-adjust', 'none')
          .should($thumb => {
            const win = $thumb[0].ownerDocument.defaultView!;
            const style = win.getComputedStyle($thumb[0], '::after');
            expect(style.content).to.equal('""');
            expect(style.borderTopStyle).to.equal('solid');
            expect(style.borderTopWidth).to.equal('2px');
            expect(style.borderTopColor).not.to.equal('rgba(0, 0, 0, 0)');
          });
        cy.screenshot(`only132-forced-colors-${dir}`);
      });
    }
    it('R4.02 changing picker shape in place does not remount refs or reset uncontrolled channels', () => {
      const Fixture = () => {
        const [square, setSquare] = React.useState(false);
        return (
          <>
            <ColorPicker shape={square ? 'square' : 'rounded'}>
              <ColorArea id="area" {...labels} defaultColor={initial} />
            </ColorPicker>
            <button id="shape" onClick={() => setSquare(!square)}>
              Toggle shape
            </button>
          </>
        );
      };
      render(<Fixture />);
      x().focus();
      cy.realPress('ArrowRight');
      area().then($area => {
        const original = $area[0];
        cy.get('#shape').realClick();
        area()
          .should('have.css', 'border-top-left-radius', '0px')
          .then($current => expect($current[0]).to.equal(original));
        channels(0.51, 0.5);
        cy.get('#shape').realClick();
        area().should('have.css', 'border-top-left-radius', '4px');
      });
    });
    it('R4.03 replacing inputX onChange uses the current slot handler for native Home and End', () => {
      const first = cy.stub().as('first');
      const second = cy.stub().as('second');
      const change = cy.stub().as('change');
      const Fixture = () => {
        const [updated, setUpdated] = React.useState(false);
        return (
          <>
            <ColorArea
              id="area"
              {...labels}
              defaultColor={initial}
              onChange={change}
              inputX={{ 'aria-label': 'Saturation', onChange: updated ? second : first }}
            />
            <button id="update" onClick={() => setUpdated(true)}>
              Replace slot handler
            </button>
          </>
        );
      };
      render(<Fixture />);
      x().focus();
      cy.realPress('Home');
      cy.get('#update').realClick();
      x().focus();
      cy.realPress('End');
      channels(1, 0.5);
      cy.get('@first').should('have.been.calledOnce');
      cy.get('@second').should('have.been.calledOnce');
      cy.get('@change').should('have.been.calledTwice');
      lastColor('@change', { ...initial, s: 1 }, 'change');
    });
    it('R4.04 input slot focus/blur handlers preserve native range semantics, refs and change events', () => {
      const inputRef = React.createRef<HTMLInputElement>();
      const focus = cy.stub().as('focus');
      const blur = cy.stub().as('blur');
      const change = cy.stub().as('change');
      render(
        <>
          <p id="area-label">Color selection</p>
          <ColorArea
            id="area"
            role="group"
            aria-labelledby="area-label"
            {...labels}
            defaultColor={initial}
            onChange={change}
            inputX={{
              'aria-label': 'Saturation',
              ref: inputRef,
              title: 'Custom saturation input',
              onFocus: focus,
              onBlur: blur,
            }}
          />
          <button id="after">After</button>
        </>,
      );
      area()
        .should('have.attr', 'role', 'group')
        .then($el => expect(computeAccessibleName($el[0])).to.equal('Color selection'));
      x()
        .should('have.attr', 'type', 'range')
        .and('have.attr', 'title', 'Custom saturation input')
        .then($input => expect(inputRef.current).to.equal($input[0]));
      x().focus();
      cy.realPress('End');
      channels(1, 0.5);
      lastColor('@change', { ...initial, s: 1 }, 'change');
      cy.get('#after').focus();
      cy.get('@focus').should('have.been.calledOnce');
      cy.get('@blur').should('have.been.calledOnce');
      cy.get<sinon.SinonStub>('@blur').then(stub => expect(stub.firstCall.args[0].target).to.equal(inputRef.current));
    });
    it('R4.05 onChange preventDefault does not roll back already requested uncontrolled keyboard/pointer state', () => {
      const change = cy.stub().as('change');
      renderArea({
        onChange: (event, data) => {
          event.preventDefault();
          change(event, data);
        },
      });
      x().focus();
      cy.realPress('ArrowRight');
      channels(0.51, 0.5);
      pointer(0.25, 0.75);
      channels(0.25, 0.75);
      cy.get('@change').should('have.been.calledTwice');
      lastColor('@change', { ...initial, s: 0.25, v: 0.75 }, 'pointerdown');
    });
    it('R4.06 horizontal arrows on focused Y still change saturation and restore the active X tab stop', () => {
      const change = cy.stub().as('change');
      renderArea({ onChange: change });
      y().focus();
      cy.realPress('ArrowLeft');
      channels(0.49, 0.5);
      y().should('have.focus').and('have.prop', 'tabIndex', -1);
      x().should('have.prop', 'tabIndex', 0);
      lastColor('@change', { ...initial, s: 0.49 }, 'keydown');
    });
    it('R4.07 omitted alpha stays omitted through keyboard and pointer changes rather than being normalized', () => {
      const change = cy.stub().as('change');
      renderArea({ defaultColor: { h: 180, s: 0.5, v: 0.5 }, onChange: change });
      x().focus();
      cy.realPress('ArrowUp');
      lastColor('@change', { h: 180, s: 0.5, v: 0.51 });
      pointer(0.25, 0.75);
      channels(0.25, 0.75, 180);
      lastColor('@change', { h: 180, s: 0.25, v: 0.75 });
      area().should($el =>
        expect($el[0].style.getPropertyValue('--fui-Area__thumb--color')).to.equal('hsla(180, 27.27%, 65.63%, 1)'),
      );
    });
    it('R4.08 two standalone uncontrolled areas retain independent channels and callback ownership', () => {
      const first = cy.stub().as('first');
      const second = cy.stub().as('second');
      render(
        <>
          <ColorArea id="area" {...labels} defaultColor={initial} onChange={first} />
          <ColorArea id="other" {...labels} defaultColor={{ h: 180, s: 0.2, v: 0.8 }} onChange={second} />
        </>,
      );
      x().focus();
      cy.realPress('ArrowRight');
      channels(0.51, 0.5);
      cy.get('#other .fui-ColorArea__inputX').focus();
      cy.realPress('ArrowDown');
      cy.get('#other .fui-ColorArea__inputX').should('have.value', '20');
      cy.get('#other .fui-ColorArea__inputY').should('have.value', '79');
      channels(0.51, 0.5);
      cy.get('@first').should('have.been.calledOnce');
      cy.get('@second').should('have.been.calledOnce');
      lastColor('@second', { h: 180, s: 0.2, v: 0.8 - 0.01 });
    });
    it('R4.09 resizing the root in place recomputes pointer geometry without resetting color', () => {
      const Fixture = () => {
        const [large, setLarge] = React.useState(false);
        return (
          <>
            <ColorArea
              id="area"
              {...labels}
              defaultColor={initial}
              style={{ width: large ? 600 : 400, height: large ? 400 : 200, minHeight: 200 }}
            />
            <button id="resize" onClick={() => setLarge(true)}>
              Resize area
            </button>
          </>
        );
      };
      render(<Fixture />);
      pointer(0.25, 0.75);
      channels(0.25, 0.75);
      cy.get('#resize').realClick();
      area().should($el => {
        expect($el[0].getBoundingClientRect().width).to.equal(600);
        expect($el[0].getBoundingClientRect().height).to.equal(400);
      });
      channels(0.25, 0.75);
      pointer(0.75, 0.25);
      channels(0.75, 0.25);
    });
    for (const dir of ['ltr', 'rtl'] as const) {
      it(`R4.10 ${dir} ${
        dir === 'ltr' ? 'rightward' : 'mirrored leftward'
      } saturation gradient aligns with thumb and value gradient stays downward`, () => {
        const states = [
          { h: 0, s: 0, v: 1, thumbColor: 'rgb(255, 255, 255)', hueColor: 'rgb(255, 0, 0)' },
          { h: 0, s: 1, v: 1, thumbColor: 'rgb(255, 0, 0)', hueColor: 'rgb(255, 0, 0)' },
          { h: 0, s: 0.25, v: 1, thumbColor: 'rgb(255, 191, 191)', hueColor: 'rgb(255, 0, 0)' },
          { h: 0, s: 0.75, v: 1, thumbColor: 'rgb(255, 64, 64)', hueColor: 'rgb(255, 0, 0)' },
          { h: 0, s: 0.75, v: 0, thumbColor: 'rgb(0, 0, 0)', hueColor: 'rgb(255, 0, 0)' },
          { h: 120, s: 0.75, v: 1, thumbColor: 'rgb(64, 255, 64)', hueColor: 'rgb(0, 255, 0)' },
        ];
        const Fixture = () => {
          const [color, setColor] = React.useState<HsvColor>({ h: 0, s: 0, v: 1, a: 1 });
          return (
            <>
              <ColorArea id="area" {...labels} color={color} />
              {states.map(({ h, s, v }, index) => (
                <button id={`state-${index}`} key={index} onClick={() => setColor({ h, s, v, a: 1 })}>
                  Hue {h}, saturation {s}, value {v}
                </button>
              ))}
            </>
          );
        };
        render(<Fixture />, dir);
        states.forEach(({ h, s, v, thumbColor, hueColor }, index) => {
          cy.get(`#state-${index}`).realClick();
          channels(s, v, h);
          gradient(hueColor, dir);
          thumbGeometry(s, v, dir);
          area().should('have.css', 'direction', dir);
          area().find('.fui-ColorArea__thumb').should('have.css', 'background-color', thumbColor);
        });
      });
    }
  };

  beforeEach(() => {
    forcedColors(false);
  });

  it('R1.01 initial white HSV defaults and native slider semantics', () => {
    renderArea({ defaultColor: undefined });
    channels(0, 1, 0);
    x().should('have.attr', 'type', 'range').and('not.have.attr', 'tabindex');
    y().should('have.attr', 'tabindex', '-1');
    x().then($input => {
      expect($input[0].min).to.equal('');
      expect($input[0].max).to.equal('');
      expect($input[0].step).to.equal('');
      expect(computeAccessibleName($input[0])).to.equal('Saturation');
    });
    area().should('have.css', 'touch-action', 'none');
  });
  it('R1.02 uncontrolled state accumulates exact one-percent changes without a callback', () => {
    renderArea();
    x().focus();
    cy.realPress('ArrowRight');
    cy.realPress('ArrowRight');
    cy.realPress('ArrowDown');
    channels(0.52, 0.49);
  });
  it('R1.03 controlled feedback updates textual HSV, retains hue and alpha, and resets', () => {
    const change = cy.stub().as('change');
    render(<Controlled onChange={change} />);
    x().focus();
    cy.realPress('ArrowUp');
    channels(0.5, 0.51);
    lastColor('@change', { ...initial, v: 0.51 }, 'keydown');
    cy.get('#selected').should('have.text', JSON.stringify({ ...initial, v: 0.51 }));
    cy.get('#reset').realClick();
    channels(0.5, 0.5);
    cy.get('@change').should('have.been.calledOnce');
  });
  it('R1.04 controlled owner can reject requests without moving displayed channels', () => {
    const change = cy.stub().as('change');
    render(<Controlled frozen onChange={change} />);
    x().focus();
    cy.realPress('ArrowRight');
    cy.realPress('ArrowRight');
    channels(0.5, 0.5);
    cy.get('@change').should('have.been.calledTwice');
    lastColor('@change', { ...initial, s: 0.51 });
  });
  it('R1.05 external controlled updates change hue, channels and the next callback closure', () => {
    const change = cy.stub().as('change');
    render(<Controlled onChange={change} />);
    cy.get('#update').realClick();
    channels(0.25, 0.75, 120);
    x().focus();
    cy.realPress('ArrowLeft');
    channels(0.24, 0.75, 120);
    lastColor('@change', { h: 120, s: 0.24, v: 0.75, a: 0.8 });
    cy.get('@change').should('have.been.calledOnce');
  });
  it('R1.06 color takes precedence over defaultColor', () => {
    renderArea({ color: { h: 90, s: 0.2, v: 0.7 }, defaultColor: initial });
    channels(0.2, 0.7, 90);
  });
  it('R1.07 changing defaultColor after mount does not reset an uncontrolled value', () => {
    const Fixture = () => {
      const [value, setValue] = React.useState(initial);
      return (
        <>
          <ColorArea id="area" {...labels} defaultColor={value} />
          <button id="update" onClick={() => setValue({ h: 90, s: 0.2, v: 0.7 })}>
            Update default
          </button>
        </>
      );
    };
    render(<Fixture />);
    x().focus();
    cy.realPress('ArrowRight');
    cy.get('#update').realClick();
    channels(0.51, 0.5);
  });
  for (const dir of ['ltr', 'rtl'] as const) {
    for (const [key, s, v, axis] of [
      ['ArrowRight', 0.51, 0.5, 'x'],
      ['ArrowLeft', 0.49, 0.5, 'x'],
      ['ArrowUp', 0.5, 0.51, 'y'],
      ['ArrowDown', 0.5, 0.49, 'y'],
    ] as const) {
      it(`R1.08 ${dir} ${key} changes only the intended channel and roving axis`, () => {
        const change = cy.stub().as('change');
        renderArea({ onChange: change }, dir);
        x().focus();
        cy.realPress(key);
        channels(s, v);
        x().should('have.prop', 'tabIndex', axis === 'x' ? 0 : -1);
        y().should('have.prop', 'tabIndex', axis === 'y' ? 0 : -1);
        cy.get('@change').should('have.been.calledOnce');
        lastColor('@change', { ...initial, s, v }, 'keydown');
        cy.get<sinon.SinonStub>('@change').then(stub => expect(stub.lastCall.args[0].defaultPrevented).to.equal(true));
      });
    }
  }
  for (const [key, s, v] of [
    ['ArrowLeft', 0, 0.5],
    ['ArrowRight', 1, 0.5],
    ['ArrowDown', 0.5, 0],
    ['ArrowUp', 0.5, 1],
  ] as const) {
    it(`R1.09 ${key} clamps its boundary and still reports each request`, () => {
      const change = cy.stub().as('change');
      renderArea({ defaultColor: { ...initial, s, v }, onChange: change });
      x().focus();
      cy.realPress(key);
      cy.realPress(key);
      channels(s, v);
      cy.get('@change').should('have.been.calledTwice');
      lastColor('@change', { ...initial, s, v });
    });
  }
  for (const key of ['Enter', 'Space', 'Escape'] as const) {
    it(`R1.10 ${key} does not request a color change`, () => {
      const change = cy.stub().as('change');
      renderArea({ onChange: change });
      x().focus();
      cy.realPress(key);
      channels(0.5, 0.5);
      cy.get('@change').should('not.have.been.called');
    });
  }
  it('R1.11 real Tab enters one axis, leaves the area, and reenters the active Y axis', () => {
    render(
      <>
        <button id="before">Before</button>
        <ColorArea id="area" {...labels} defaultColor={initial} />
        <button id="after">After</button>
      </>,
    );
    cy.get('#before').focus();
    cy.realPress('Tab');
    x().should('have.focus');
    cy.realPress('ArrowUp');
    x().should('have.focus');
    cy.realPress('Tab');
    y().should('have.focus');
    cy.realPress('Tab');
    cy.get('#after').should('have.focus');
    cy.realPress(['Shift', 'Tab']);
    y().should('have.focus');
    channels(0.5, 0.51);
  });
  it('R1.12 fractional props render rounded percentages but keyboard retains underlying precision', () => {
    const change = cy.stub().as('change');
    renderArea({ defaultColor: { h: 111, s: 0.234, v: 0.456 }, onChange: change });
    channels(0.234, 0.456, 111);
    x().focus();
    cy.realPress('ArrowRight');
    channels(0.244, 0.456, 111);
    lastColor('@change', { h: 111, s: 0.234 + 0.01, v: 0.456 });
  });
  registerRoundTwo();
  registerRoundThree();
  registerRoundFour();
});
