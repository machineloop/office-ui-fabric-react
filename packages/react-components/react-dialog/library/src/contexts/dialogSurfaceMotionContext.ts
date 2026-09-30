'use client';

import * as React from 'react';

// Retained surface visibility must commit before Dialog's first-focus effect.
export const DialogSurfaceMotionContext = React.createContext<{ open: boolean; motionDisabled: boolean } | undefined>(
  undefined,
);
