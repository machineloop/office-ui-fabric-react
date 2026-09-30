import * as React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { Dialog } from './Dialog';
import type { DialogProps } from './Dialog.types';
import { isConformant } from '../../testing/isConformant';
import { DialogTrigger } from '../DialogTrigger/DialogTrigger';
import { makeStyles, mergeClasses } from '@griffel/react';
import type { DialogSurfaceProps } from '../../DialogSurface';
import { DialogSurface } from '../../DialogSurface';

describe('Dialog', () => {
  isConformant<DialogProps>({
    Component: Dialog,
    displayName: 'Dialog',
    disabledTests: [
      // Dialog does not render DOM elements
      'component-handles-ref',
      'component-has-root-ref',
      'component-handles-classname',
      'component-has-static-classnames-object',
      // TODO:
      // onOpenChange: A second (data) argument cannot be a union
      'consistent-callback-args',
      // Dialog does not have own styles
      'make-styles-overrides-win',
    ],
  });

  it('renders a default state', () => {
    const result = render(
      <Dialog>
        <div>Default Dialog</div>
      </Dialog>,
    );
    expect(result.container).toMatchSnapshot();
  });

  it('hides retained surfaces with disabled motion without resetting their content', () => {
    const result = render(
      <Dialog surfaceMotion={null} unmountOnClose={false}>
        <DialogTrigger disableButtonEnhancement>
          <button>Open retained</button>
        </DialogTrigger>
        <DialogSurface data-testid="retained-surface">
          <input aria-label="Draft" defaultValue="initial" />
          <DialogTrigger disableButtonEnhancement>
            <button>Close retained</button>
          </DialogTrigger>
        </DialogSurface>
      </Dialog>,
    );
    const surface = result.getByTestId('retained-surface');
    const input = result.getByLabelText('Draft');
    expect(surface).toHaveAttribute('hidden');
    expect(surface).toHaveAttribute('aria-hidden', 'true');
    result.getByText('Open retained').focus();
    fireEvent.click(result.getByText('Open retained'));
    expect(surface).not.toHaveAttribute('hidden');
    expect(surface).toBeVisible();
    fireEvent.change(input, { target: { value: 'edited' } });
    input.focus();
    fireEvent.click(result.getByText('Close retained'));
    expect(surface).toHaveAttribute('hidden');
    expect(surface).not.toBeVisible();
    expect(result.getByText('Open retained')).toHaveFocus();
    fireEvent.click(result.getByText('Open retained'));
    expect(result.getByLabelText('Draft')).toBe(input);
    expect(input).toHaveValue('edited');
    expect(surface).toBeVisible();
  });

  it.each([true, false])('preserves non-first focus when unmountOnClose changes from %s', initialUnmount => {
    const composition = (unmountOnClose: boolean) => (
      <Dialog open unmountOnClose={unmountOnClose} surfaceMotion={null}>
        <DialogSurface>
          <button>First action</button>
          <button>Second action</button>
        </DialogSurface>
      </Dialog>
    );
    const result = render(composition(initialUnmount));
    result.getByText('Second action').focus();
    expect(result.getByText('Second action')).toHaveFocus();
    result.rerender(composition(!initialUnmount));
    expect(result.getByText('Second action')).toHaveFocus();
  });

  it.each([true, false])('preserves non-modal outside focus when unmountOnClose changes from %s', initialUnmount => {
    const composition = (unmountOnClose: boolean) => (
      <>
        <Dialog open modalType="non-modal" unmountOnClose={unmountOnClose} surfaceMotion={null}>
          <DialogSurface>
            <button>Inside action</button>
          </DialogSurface>
        </Dialog>
        <button>Outside target</button>
      </>
    );
    const result = render(composition(initialUnmount));
    result.getByText('Outside target').focus();
    result.rerender(composition(!initialUnmount));
    expect(result.getByText('Outside target')).toHaveFocus();
  });

  it('Testing DialogSurface with toBeVisible works as expected', () => {
    // eslint-disable-next-line @griffel/styles-file
    const useStyles = makeStyles({
      root: {
        left: '2px',
      },
    });
    const CustomDialogSurface = React.forwardRef<HTMLDivElement, DialogSurfaceProps>((props, ref) => {
      const styles = useStyles();
      return <DialogSurface ref={ref} className={mergeClasses(styles.root, props.className)} {...props} />;
    });

    const result = render(
      <Dialog>
        <DialogTrigger disableButtonEnhancement>
          <button data-testid="trigger">Open dialog</button>
        </DialogTrigger>
        <CustomDialogSurface>
          <div data-testid="surface-content">content in surface</div>

          <DialogTrigger>
            <button data-testid="trigger-close">Close dialog</button>
          </DialogTrigger>
        </CustomDialogSurface>
      </Dialog>,
    );

    fireEvent.click(result.getByTestId('trigger'));

    expect(result.getByTestId('surface-content')).toBeInTheDocument();
    expect(result.getByTestId('surface-content')).toBeVisible();

    fireEvent.click(result.getByTestId('trigger-close'));
    expect(result.queryByTestId('surface-content')).toBeNull();
  });
});
