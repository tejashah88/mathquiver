'use client';

// React imports
import { memo, RefObject, useCallback, useMemo } from 'react';

// Drag-and-drop kit integration
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

// List Virtualization
import { VList, type VListHandle } from 'virtua';

// Local imports
import VariableLine, { VariableLineHandle } from '@/components/VariableLine';
import { VariableItem } from '@/types';

interface VariablesListProps {
  // State
  variables: VariableItem[];
  focusMode: boolean;
  draggedVariableId: string | null;

  // Refs
  variableRefs: RefObject<Map<string, VariableLineHandle>>;
  virtualVariablesRef: RefObject<VListHandle | null>;

  // Callbacks
  onVariableLatexInput: (id: string, val: string) => void;
  onVariableExcelInput: (id: string, val: string) => void;
  onVariableNewLine: (id: string) => void;
  onVariableDelete: (id: string) => void;
  onVariableFocus: (id: string) => void;
  onVariableDragStart: (event: DragStartEvent) => void;
  onVariableDragEnd: (event: DragEndEvent) => void;
}

const VariablesList = memo(
  function VariablesList({
    // State
    variables,
    focusMode,
    draggedVariableId,

    // Refs
    variableRefs,
    virtualVariablesRef,

    // Callbacks
    onVariableLatexInput,
    onVariableExcelInput,
    onVariableNewLine,
    onVariableDelete,
    onVariableFocus,
    onVariableDragStart,
    onVariableDragEnd,
  }: VariablesListProps) {
    // Sensors for drag-and-drop integration with activation constraints
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      }),
      useSensor(KeyboardSensor)
    );

    // Compute variable IDs for SortableContext
    const variablesIds = useMemo(() => variables.map(item => item.id), [variables]);

    // Memoize dragged variable to avoid O(n) searches during drag renders
    const draggedVariable = useMemo(() => {
      return draggedVariableId ? variables.find(v => v.id === draggedVariableId) : null;
    }, [draggedVariableId, variables]);

    // Memoize ref callback to prevent unnecessary ref updates on every render
    const handleVariableRef = useCallback((id: string, el: VariableLineHandle | null) => {
      if (el) {
        variableRefs.current?.set(id, el);
      } else {
        variableRefs.current?.delete(id);
      }
    }, [variableRefs]);

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={onVariableDragStart}
        onDragEnd={onVariableDragEnd}
      >
        <SortableContext items={variablesIds} strategy={verticalListSortingStrategy}>
          {/* HACK: Height is set to 95% to prevent viewpoint from spilling out vertically */}
          <VList ref={virtualVariablesRef} style={{ height: '95%' }}>
            {variables.map((_var: VariableItem) => (
              <VariableLine
                key={_var.id}
                ref={(el: VariableLineHandle | null) => handleVariableRef(_var.id, el)}
                id={_var.id}
                latexInput={_var._latexRender}
                excelInput={_var.excelVar}
                inFocusMode={focusMode}
                onVariableLatexInput={onVariableLatexInput}
                onVariableExcelInput={onVariableExcelInput}
                onVariableNewLine={onVariableNewLine}
                onVariableDelete={onVariableDelete}
                onVariableFocus={onVariableFocus}
              />
            ))}
          </VList>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {draggedVariable ? (
            <div style={{ opacity: 0.9, cursor: 'grabbing' }}>
              <VariableLine
                id={draggedVariable.id}
                latexInput={draggedVariable._latexRender}
                excelInput={draggedVariable.excelVar}
                inFocusMode={false}
                onVariableLatexInput={() => {}}
                onVariableExcelInput={() => {}}
                onVariableNewLine={() => {}}
                onVariableDelete={() => {}}
                onVariableFocus={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  },
  (prevProps: VariablesListProps, nextProps: VariablesListProps) => {
    // Custom comparison to prevent re-renders when only equations changed
    // Return true if props are equal (component should NOT re-render)
    return (
      prevProps.variables === nextProps.variables &&
      prevProps.focusMode === nextProps.focusMode &&
      prevProps.draggedVariableId === nextProps.draggedVariableId &&
      // Refs and callbacks should be stable via useCallback/useRef, so we don't compare them
      prevProps.variableRefs === nextProps.variableRefs &&
      prevProps.virtualVariablesRef === nextProps.virtualVariablesRef
    );
  }
);

export default VariablesList;
