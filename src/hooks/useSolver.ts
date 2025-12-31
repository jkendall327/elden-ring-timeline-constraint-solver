import { useEffect, useRef, useState, useCallback } from 'react';
import type { TimelineNode, TemporalRelationship, SolverResult } from '../types';
import type {
  SolverWorkerRequest,
  SolverWorkerMessage,
} from '../solver/solver.worker';

// Debounce delay for auto-solving
const SOLVE_DEBOUNCE_MS = 300;
// Max retries for worker crash recovery
const MAX_WORKER_RETRIES = 3;
// Delay between worker recovery attempts
const WORKER_RETRY_DELAY_MS = 100;

/**
 * Hook for managing the constraint solver.
 *
 * This hook:
 * - Manages a Web Worker for non-blocking solving
 * - Debounces solve requests to avoid excessive computation
 * - Provides the latest solver result
 * - Automatically recovers from worker crashes
 */
export function useSolver(
  nodes: Record<string, TimelineNode>,
  relationships: Record<string, TemporalRelationship>
) {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const pendingRequestRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const pendingDataRef = useRef<{ nodes: TimelineNode[]; relationships: TemporalRelationship[] } | null>(null);

  const [result, setResult] = useState<SolverResult | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new worker instance with message handlers.
   */
  const createWorker = useCallback(() => {
    const worker = new Worker(
      new URL('../solver/solver.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event: MessageEvent<SolverWorkerMessage | { type: 'ready' }>) => {
      const message = event.data;

      if (message.type === 'ready') {
        // Worker is ready - if we have pending data from a crash recovery, re-send it
        if (pendingDataRef.current && pendingRequestRef.current !== null) {
          const requestId = pendingRequestRef.current;
          const request: SolverWorkerRequest = {
            type: 'solve',
            input: pendingDataRef.current,
            requestId,
          };
          worker.postMessage(request);
        }
        return;
      }

      if (message.type === 'result') {
        // Only accept result if it's from the latest request
        if (message.requestId === pendingRequestRef.current) {
          setResult(message.result);
          setIsSolving(false);
          setError(null);
          pendingRequestRef.current = null;
          pendingDataRef.current = null;
          retryCountRef.current = 0; // Reset retry count on success
        }
      } else if (message.type === 'error') {
        if (message.requestId === pendingRequestRef.current) {
          setError(message.error);
          setIsSolving(false);
          pendingRequestRef.current = null;
          pendingDataRef.current = null;
        }
      }
    };

    worker.onerror = (event) => {
      console.error('Solver worker error:', event);

      // Attempt to recover from crash
      if (retryCountRef.current < MAX_WORKER_RETRIES && pendingDataRef.current) {
        retryCountRef.current++;
        console.log(`Worker crashed, attempting recovery (attempt ${String(retryCountRef.current)}/${String(MAX_WORKER_RETRIES)})...`);

        // Terminate the crashed worker
        worker.terminate();

        // Create a new worker after a short delay
        setTimeout(() => {
          workerRef.current = createWorker();
        }, WORKER_RETRY_DELAY_MS);
      } else {
        setError('Solver worker crashed');
        setIsSolving(false);
        pendingRequestRef.current = null;
        pendingDataRef.current = null;
        retryCountRef.current = 0;
      }
    };

    return worker;
  }, []);

  // Initialize worker
  useEffect(() => {
    workerRef.current = createWorker();

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [createWorker]);

  // Trigger a solve
  const triggerSolve = useCallback(() => {
    if (!workerRef.current) return;

    // Get enabled nodes and relationships
    const enabledNodes = Object.values(nodes).filter((n) => n.enabled);
    const enabledRelationships = Object.values(relationships).filter(
      (r) => r.enabled
    );

    // Store pending data for crash recovery
    const inputData = {
      nodes: enabledNodes,
      relationships: enabledRelationships,
    };
    pendingDataRef.current = inputData;

    // Create request
    const requestId = ++requestIdRef.current;
    pendingRequestRef.current = requestId;
    setIsSolving(true);

    const request: SolverWorkerRequest = {
      type: 'solve',
      input: inputData,
      requestId,
    };

    workerRef.current.postMessage(request);
  }, [nodes, relationships]);

  // Auto-solve on data changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerSolve();
    }, SOLVE_DEBOUNCE_MS);

    return () => { clearTimeout(timer); };
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
    void import('../solver/solver').then(({ solve }) => {
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
