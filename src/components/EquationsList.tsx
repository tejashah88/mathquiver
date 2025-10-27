'use client';

// React imports
import { memo, RefObject, useCallback, useMemo } from 'react';

// Drag-and-drop kit integration
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

// List Virtualization
import { VList, type VListHandle } from 'virtua';

// Utilities
import { deepEqual } from 'fast-equals';

// Local imports
import EquationLine, { EquationLineHandle } from '@/components/EquationLine';
import { EquationItem, CondensedVariableItem } from '@/types';

interface EquationsListProps {
  // State
  equations: EquationItem[];
  condensedVariables: CondensedVariableItem[];
  focusMode: boolean;
  draggedEquationId: string | null;

  // Refs
  equationRefs: RefObject<Map<string, EquationLineHandle>>;
  virtualEquationsRef: RefObject<VListHandle | null>;

  // Callbacks
  onEquationInput: (id: string, latex: string) => void;
  onEquationNewLine: (id: string) => void;
  onEquationDelete: (id: string) => void;
  onEquationFocus: (id: string) => void;
  onEquationDragStart: (event: DragStartEvent) => void;
  onEquationDragEnd: (event: DragEndEvent) => void;
}

const EquationsList = memo(
  function EquationsList({
    // State
    equations,
    condensedVariables,
    focusMode,
    draggedEquationId,

    // Refs
    equationRefs,
    virtualEquationsRef,

    // Callbacks
    onEquationInput,
    onEquationNewLine,
    onEquationDelete,
    onEquationFocus,
    onEquationDragStart,
    onEquationDragEnd,
  }: EquationsListProps) {
    // Sensors for drag-and-drop integration with activation constraints
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      }),
      useSensor(KeyboardSensor)
    );

    // Compute equation IDs for SortableContext
    const equationIds = useMemo(() => equations.map(item => item.id), [equations]);

    // Memoize dragged equation to avoid O(n) search during drag renders
    const draggedEquation = useMemo(() => {
      return draggedEquationId ? equations.find(e => e.id === draggedEquationId) : null;
    }, [draggedEquationId, equations]);

    // Memoize ref callback to prevent unnecessary ref updates on every render
    const handleEquationRef = useCallback((id: string, el: EquationLineHandle | null) => {
      if (el) {
        equationRefs.current?.set(id, el);
      } else {
        equationRefs.current?.delete(id);
      }
    }, [equationRefs]);

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={onEquationDragStart}
        onDragEnd={onEquationDragEnd}
      >
        <SortableContext items={equationIds} strategy={verticalListSortingStrategy}>
          <VList ref={virtualEquationsRef} style={{ height: '100%' }}>
            {equations.map((equ: EquationItem) => (
              <EquationLine
                key={equ.id}
                ref={(el: EquationLineHandle | null) => handleEquationRef(equ.id, el)}
                id={equ.id}
                equation={equ.latex}
                variableList={condensedVariables}
                inFocusMode={focusMode}
                onEquationInput={onEquationInput}
                onEquationNewLine={onEquationNewLine}
                onEquationDelete={onEquationDelete}
                onEquationFocus={onEquationFocus}
              />
            ))}
          </VList>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {draggedEquation ? (
            <div style={{ opacity: 0.9, cursor: 'grabbing' }}>
              <EquationLine
                id={draggedEquation.id}
                equation={draggedEquation.latex}
                variableList={condensedVariables}
                inFocusMode={false}
                onEquationInput={() => {}}
                onEquationNewLine={() => {}}
                onEquationDelete={() => {}}
                onEquationFocus={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  },
  (prevProps: EquationsListProps, nextProps: EquationsListProps) => {
    // Custom comparison to prevent re-renders when only variables changed
    // Return true if props are equal (component should NOT re-render)
    return (
      prevProps.equations === nextProps.equations &&
      deepEqual(prevProps.condensedVariables, nextProps.condensedVariables) &&
      prevProps.focusMode === nextProps.focusMode &&
      prevProps.draggedEquationId === nextProps.draggedEquationId &&
      // Refs and callbacks should be stable via useCallback/useRef, so we don't compare them
      prevProps.equationRefs === nextProps.equationRefs &&
      prevProps.virtualEquationsRef === nextProps.virtualEquationsRef
    );
  }
);

export default EquationsList;
