import * as React from 'react';
import { PresenceBadge } from './PresenceBadge';
import { render } from '@testing-library/react';
import { isConformant } from '../../testing/isConformant';
import type { PresenceBadgeStatus } from './PresenceBadge.types';
import { DEFAULT_STRINGS as STATUS_LABELS } from './usePresenceBadge';

describe('PresenceBadge', () => {
  isConformant({
    Component: PresenceBadge,
    displayName: 'PresenceBadge',
  });

  it('renders a default state', () => {
    const { container } = render(<PresenceBadge />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it.each(Object.keys(STATUS_LABELS) as PresenceBadgeStatus[])('renders correct aria label for "%s" status', status => {
    const { getByLabelText } = render(<PresenceBadge status={status} />);
    expect(getByLabelText(STATUS_LABELS[status])).toBeTruthy();
  });

  it.each(Object.keys(STATUS_LABELS) as PresenceBadgeStatus[])(
    'includes out of office in the "%s" accessible name',
    status => {
      const { getByRole } = render(<PresenceBadge status={status} outOfOffice />);
      const name = STATUS_LABELS[status] + (status === 'out-of-office' ? '' : ' out of office');
      expect(getByRole('img', { name })).toBeTruthy();
    },
  );

  it('updates and removes out of office labeling while respecting a caller label', () => {
    const { getByRole, rerender } = render(<PresenceBadge status="away" outOfOffice />);
    expect(getByRole('img', { name: 'away out of office' })).toBeTruthy();
    rerender(<PresenceBadge status="busy" />);
    expect(getByRole('img', { name: 'busy' })).toBeTruthy();
    rerender(<PresenceBadge status="away" outOfOffice aria-label="Custom presence" />);
    expect(getByRole('img', { name: 'Custom presence' })).toBeTruthy();
    rerender(<PresenceBadge outOfOffice />);
    expect(getByRole('img', { name: 'available out of office' })).toBeTruthy();
  });
});
