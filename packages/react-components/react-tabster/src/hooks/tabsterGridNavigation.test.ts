import { createTabster, disposeTabster, getMover, MoverDirections, MoverKeys, MoverMoveFocusEvent } from 'tabster';
import type { Types } from 'tabster';

describe('managed Tabster grid geometry', () => {
  let tabster: Types.Tabster;
  let container: HTMLDivElement;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1000);
    jest.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(800);
    jest.spyOn(document.body, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      right: 1000,
      top: 0,
      bottom: 800,
      width: 1000,
      height: 800,
      toJSON: () => ({}),
    });
    jest.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockImplementation(function (this: HTMLElement) {
      return this.ownerDocument.body;
    });
  });

  afterEach(() => {
    disposeTabster(tabster);
    container.remove();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function grid(dir: 'ltr' | 'rtl', direction: Types.MoverDirection = MoverDirections.Grid, cyclic = false) {
    container = document.createElement('div');
    container.dir = dir;
    container.setAttribute('data-tabster', JSON.stringify({ root: {}, mover: { direction, cyclic } }));
    const cells = Array.from({ length: 9 }, (_, index) => {
      const cell = document.createElement('button');
      const row = Math.floor(index / 3);
      const column = index % 3;
      const left = (dir === 'rtl' ? 2 - column : column) * 100;
      cell.textContent = `Cell ${index}`;
      cell.id = `cell-${index}`;
      jest.spyOn(cell, 'getBoundingClientRect').mockReturnValue({
        x: left,
        y: row * 50,
        left,
        right: left + 100,
        top: row * 50,
        bottom: row * 50 + 40,
        width: 100,
        height: 40,
        toJSON: () => ({}),
      });
      container.appendChild(cell);
      return cell;
    });
    document.body.appendChild(container);
    tabster = createTabster(window);
    getMover(tabster);
    jest.runOnlyPendingTimers();
    expect(tabster.focusable.isFocusable(cells[0])).toBe(true);
    const mover = {
      moveFocus(element: HTMLElement, key: Types.MoverKey): Element | null {
        const before = document.activeElement;
        element.dispatchEvent(new MoverMoveFocusEvent({ key }));
        return document.activeElement === before ? null : document.activeElement;
      },
    };
    return { cells, mover };
  }

  for (const dir of ['ltr', 'rtl'] as const) {
    const forward = dir === 'rtl' ? MoverKeys.ArrowLeft : MoverKeys.ArrowRight;
    const backward = dir === 'rtl' ? MoverKeys.ArrowRight : MoverKeys.ArrowLeft;

    it(`moves to both adjacent columns in ${dir} using the real CommonJS mover`, () => {
      const { cells, mover } = grid(dir);
      cells[3].focus();
      expect(mover.moveFocus(cells[3], forward)).toBe(cells[4]);
      expect(document.activeElement).toBe(cells[4]);
      expect(mover.moveFocus(cells[4], backward)).toBe(cells[3]);
      expect(document.activeElement).toBe(cells[3]);
    });

    it(`independently reaches the previous column in ${dir}`, () => {
      const { cells, mover } = grid(dir);
      cells[4].focus();
      expect(mover.moveFocus(cells[4], backward)).toBe(cells[3]);
      expect(document.activeElement).toBe(cells[3]);
    });

    it(`keeps strict grid row boundaries in ${dir}`, () => {
      const { cells, mover } = grid(dir);
      cells[5].focus();
      expect(mover.moveFocus(cells[5], forward)).toBeNull();
      expect(document.activeElement).toBe(cells[5]);
      cells[3].focus();
      expect(mover.moveFocus(cells[3], backward)).toBeNull();
      expect(document.activeElement).toBe(cells[3]);
    });

    it(`keeps grid-linear movement across row boundaries in ${dir}`, () => {
      const { cells, mover } = grid(dir, MoverDirections.GridLinear);
      cells[5].focus();
      expect(mover.moveFocus(cells[5], forward)).toBe(cells[6]);
      expect(mover.moveFocus(cells[6], backward)).toBe(cells[5]);
    });

    it(`keeps cyclic whole-grid movement in ${dir}`, () => {
      const { cells, mover } = grid(dir, MoverDirections.Grid, true);
      cells[8].focus();
      expect(mover.moveFocus(cells[8], forward)).toBe(cells[0]);
      expect(mover.moveFocus(cells[0], backward)).toBe(cells[8]);
    });

    it(`preserves physical vertical column matching in ${dir}`, () => {
      const { cells, mover } = grid(dir);
      cells[1].focus();
      expect(mover.moveFocus(cells[1], MoverKeys.ArrowDown)).toBe(cells[4]);
      expect(mover.moveFocus(cells[4], MoverKeys.ArrowUp)).toBe(cells[1]);
      expect(mover.moveFocus(cells[1], MoverKeys.ArrowUp)).toBeNull();
      cells[7].focus();
      expect(mover.moveFocus(cells[7], MoverKeys.ArrowDown)).toBeNull();
    });

    for (const [direction, mode] of [
      [MoverDirections.Grid, 'grid'],
      [MoverDirections.GridLinear, 'grid-linear'],
    ] as const) {
      for (const [name, key, target] of [
        ['Home', MoverKeys.Home, 3],
        ['End', MoverKeys.End, 5],
        ['PageUp', MoverKeys.PageUp, 1],
        ['PageDown', MoverKeys.PageDown, 7],
      ] as const) {
        it(`preserves the row or column for ${name} in ${dir} ${mode}`, () => {
          const { cells, mover } = grid(dir, direction);
          cells[4].focus();
          expect(mover.moveFocus(cells[4], key)).toBe(cells[target]);
          expect(document.activeElement).toBe(cells[target]);
        });
      }
    }

    it(`rejects a physically overlapping horizontal candidate in ${dir}`, () => {
      const { cells, mover } = grid(dir);
      const rect = cells[4].getBoundingClientRect();
      const left = rect.left + (dir === 'rtl' ? 25 : -25);
      jest.spyOn(cells[4], 'getBoundingClientRect').mockReturnValue({
        ...rect,
        left,
        right: left + 100,
        x: left,
      });
      cells[3].focus();
      expect(mover.moveFocus(cells[3], forward)).toBeNull();
      expect(document.activeElement).toBe(cells[3]);
      cells[4].focus();
      expect(mover.moveFocus(cells[4], backward)).toBeNull();
      expect(document.activeElement).toBe(cells[4]);
    });

    it(`preserves disabled-candidate filtering without crossing the grid row in ${dir}`, () => {
      const { cells, mover } = grid(dir);
      cells[4].disabled = true;
      cells[3].focus();
      expect(mover.moveFocus(cells[3], forward)).toBe(cells[5]);
      expect(mover.moveFocus(cells[5], forward)).toBeNull();
      expect(document.activeElement).toBe(cells[5]);
    });

    it(`uses logical edges for unequal-width cells in ${dir}`, () => {
      const { cells, mover } = grid(dir);
      const widths = [75, 150, 75];
      let start = 0;
      for (let column = 0; column < 3; column++) {
        const width = widths[column];
        const left = dir === 'rtl' ? 300 - start - width : start;
        jest.spyOn(cells[column + 3], 'getBoundingClientRect').mockReturnValue({
          x: left,
          y: 50,
          left,
          right: left + width,
          top: 50,
          bottom: 90,
          width,
          height: 40,
          toJSON: () => ({}),
        });
        start += width;
      }
      cells[3].focus();
      expect(mover.moveFocus(cells[3], forward)).toBe(cells[4]);
      expect(mover.moveFocus(cells[4], forward)).toBe(cells[5]);
      expect(mover.moveFocus(cells[5], backward)).toBe(cells[4]);
      expect(mover.moveFocus(cells[4], MoverKeys.Home)).toBe(cells[3]);
      expect(mover.moveFocus(cells[3], MoverKeys.End)).toBe(cells[5]);
    });

    it(`retains rounded boundary tolerance for subpixel adjacency in ${dir}`, () => {
      const { cells, mover } = grid(dir);
      for (const [index, logicalLeft] of [
        [3, 0.2],
        [4, 100.1],
      ] as const) {
        const left = dir === 'rtl' ? 300 - logicalLeft - 100 : logicalLeft;
        jest.spyOn(cells[index], 'getBoundingClientRect').mockReturnValue({
          x: left,
          y: 50,
          left,
          right: left + 100,
          top: 50,
          bottom: 90,
          width: 100,
          height: 40,
          toJSON: () => ({}),
        });
      }
      cells[3].focus();
      expect(mover.moveFocus(cells[3], forward)).toBe(cells[4]);
      expect(mover.moveFocus(cells[4], backward)).toBe(cells[3]);
    });
  }
});
