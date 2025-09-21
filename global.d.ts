import React from 'react';
import { MathfieldElement } from 'mathlive';

// NOTE: For Next.js projects, the tsconfig option "jsx" is
// set to "preserve", so set the declare directive to 'react'.
// Source: https://react.dev/blog/2024/04/25/react-19-upgrade-guide#the-jsx-namespace-in-typescript
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<React.HTMLAttributes<MathfieldElement>, MathfieldElement>;
    }
  }
}
