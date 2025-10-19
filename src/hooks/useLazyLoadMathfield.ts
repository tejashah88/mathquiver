import { useMemo } from 'react';
import { useIntersectionObserver } from '@uidotdev/usehooks';
import { useMergeRefs } from '@/utils/mergeRefs';

/**
 * Custom hook for lazy-loading mathfield elements using Intersection Observer.
 *
 * This hook combines three optimizations:
 * 1. Intersection Observer - detects when element enters/exits viewport
 * 2. Memoized visibility state - prevents re-renders when entry object changes
 * 3. Merged refs - combines sortable drag-and-drop ref with observer ref
 *
 * The 400px rootMargin ensures smooth scrolling by loading elements before
 * they become visible, preventing layout shifts and jitter.
 *
 * @param sortableRef - The ref from useSortable for drag-and-drop functionality
 * @returns Object containing merged ref and visibility state
 *
 * @example
 * const { setNodeRef } = useSortable({ id });
 * const { mergedRef, isInView } = useLazyLoadMathfield(setNodeRef);
 *
 * return (
 *   <div ref={mergedRef}>
 *     {isInView ? <math-field /> : <div>placeholder</div>}
 *   </div>
 * );
 */
export function useLazyLoadMathfield(sortableRef: (node: HTMLElement | null) => void) {
  // Use large rootMargin to prevent jitter by loading elements before they're visible
  const [intersectRef, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: '400px', // Load 400px before entering viewport, unload 400px after leaving
  });

  // Memoize isInView to prevent re-renders when entry object changes but isIntersecting stays the same
  // This is critical because entry object updates on every scroll, causing excessive re-renders
  const isInView = useMemo(() => entry?.isIntersecting ?? true, [entry?.isIntersecting]);

  // Memoize the merged ref to prevent unnecessary re-renders
  const mergedRef = useMergeRefs(sortableRef, intersectRef);

  return { mergedRef, isInView };
}
