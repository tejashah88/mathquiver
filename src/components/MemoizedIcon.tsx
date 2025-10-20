import { memo } from 'react';
import { FontAwesomeIcon, FontAwesomeIconProps } from '@fortawesome/react-fontawesome';

/**
 * Memoized wrapper for FontAwesomeIcon to prevent unnecessary re-renders
 * during parent component updates when icon props haven't changed.
 *
 * This significantly reduces render overhead when many icons are present
 * (e.g., 70 equations × 3 icons = 210 icons that don't need to re-render on every update)
 */
const MemoizedIcon = memo<FontAwesomeIconProps>(
  function MemoizedIcon(props) {
    'use memo';
    return <FontAwesomeIcon {...props} />;
  }
);

export default MemoizedIcon;
