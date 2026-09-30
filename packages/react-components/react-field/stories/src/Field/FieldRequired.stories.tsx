import * as React from 'react';
import type { JSXElement } from '@fluentui/react-components';

import { Field, Input } from '@fluentui/react-components';

export const Required = (): JSXElement => (
  <Field label="Required field" required>
    <Input />
  </Field>
);

Required.parameters = {
  docs: {
    description: {
      story:
        'When a Field is marked as `required`, the label has a red asterisk, ' +
        'and controls supporting native validation (such as Input) get `required`. ' +
        'Other controls get `aria-required` for accessibility tools.',
    },
  },
};
