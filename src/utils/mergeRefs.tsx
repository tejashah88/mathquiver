// Source: https://gist.github.com/wojtekmaj/3848f00c1dc78bfa0686bec96fef9608

import { ForwardedRef, RefCallback, useMemo } from 'react';

/**
 * Allows to use multiple refs on a single React element.
 * Supports both functions and ref objects created using createRef() and useRef().
 * Now memoized to prevent unnecessary re-renders.
 *
 * Usage:
 * ```jsx
 * const mergedRef = useMergeRefs(ref1, ref2, ref3);
 * <div ref={mergedRef} />
 * ```
 *
 * @param {...Array<Function|Object>} inputRefs Array of refs
 */
export function useMergeRefs<T>(...inputRefs: ForwardedRef<T>[]): RefCallback<T> {
  return useMemo(
    () => (ref: T) => {
      inputRefs.forEach((inputRef) => {
        if (!inputRef) {
          return;
        }

        if (typeof inputRef === 'function') {
          inputRef(ref);
        } else {
          inputRef.current = ref;
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    inputRefs
  );
}

/**
 * Non-hook version for backward compatibility.
 * WARNING: This creates a new function on every call and may cause unnecessary re-renders.
 * Use useMergeRefs hook instead for better performance.
 */
export default function mergeRefs<T>(...inputRefs: ForwardedRef<T>[]): RefCallback<T> {
  return (ref: T) => {
    inputRefs.forEach((inputRef) => {
      if (!inputRef) {
        return;
      }

      if (typeof inputRef === 'function') {
        inputRef(ref);
      } else {
        inputRef.current = ref;
      }
    });
  };
}
