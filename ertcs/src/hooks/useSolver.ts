import { useEffect, useRef, useState, useCallback } from 'react';
import type { TimelineNode, TemporalRelationship, SolverResult } from '../types';
import type {
  SolverWorkerRequest,
  SolverWorkerMessage,
} from '../solver/solver.worker';

// Debounce delay for auto-solving
const SOLVE_DEBOUNCE_MS = 300;

/**
 * Hook for managing the constraint solver.
 *
 * This hook:
 * - Manages a Web Worker for non-blocking solving
 * - Debounces solve requests to avoid excessive computation
 * - Provides the latest solver result
 */
export function useSolver(
  nodes: Record<string, TimelineNode>,
  relationships: Record<string, TemporalRelationship>
) {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const pendingRequestRef = useRef<number | null>(null);

  const [result, setResult] = useState<SolverResult | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize worker
  useEffect(() => {
    const worker = new Worker(
      new URL('../solver/solver.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event: MessageEvent<SolverWorkerMessage | { type: 'ready' }>) => {
      const message = event.data;

      if (message.type === 'ready') {
        // Worker is ready
        return;
      }

      if (message.type === 'result') {
        // Only accept result if it's from the latest request
        if (message.requestId === pendingRequestRef.current) {
          setResult(message.result);
          setIsSolving(false);
          setError(null);
          pendingRequestRef.current = null;
        }
      } else if (message.type === 'error') {
        if (message.requestId === pendingRequestRef.current) {
          setError(message.error);
          setIsSolving(false);
          pendingRequestRef.current = null;
        }
      }
    };

    worker.onerror = (event) => {
      console.error('Solver worker error:', event);
      setError('Solver worker error');
      setIsSolving(false);
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  // Trigger a solve
  const triggerSolve = useCallback(() => {
    if (!workerRef.current) return;

    // Get enabled nodes and relationships
    const enabledNodes = Object.values(nodes).filter((n) => n.enabled);
    const enabledRelationships = Object.values(relationships).filter(
      (r) => r.enabled
    );

    // Create request
    const requestId = ++requestIdRef.current;
    pendingRequestRef.current = requestId;
    setIsSolving(true);

    const request: SolverWorkerRequest = {
      type: 'solve',
      input: {
        nodes: enabledNodes,
        relationships: enabledRelationships,
      },
      requestId,
    };

    workerRef.current.postMessage(request);
  }, [nodes, relationships]);

  // Auto-solve on data changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerSolve();
    }, SOLVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [nodes, relationships, triggerSolve]);

  return {
    result,
    isSolving,
    error,
    triggerSolve,
  };
}

/**
 * Synchronous solver for immediate feedback (use sparingly).
 * This runs on the main thread and may cause UI jank for large datasets.
 */
export function useSyncSolver(
  nodes: Record<string, TimelineNode>,
  relationships: Record<string, TemporalRelationship>
): SolverResult | null {
  const [result, setResult] = useState<SolverResult | null>(null);

  useEffect(() => {
    // Dynamically import to avoid bundling in main chunk
    import('../solver/solver').then(({ solve }) => {
      const enabledNodes = Object.values(nodes).filter((n) => n.enabled);
      const enabledRelationships = Object.values(relationships).filter(
        (r) => r.enabled
      );

      const solverResult = solve({
        nodes: enabledNodes,
        relationships: enabledRelationships,
      });

      setResult(solverResult);
    });
  }, [nodes, relationships]);

  return result;
}
