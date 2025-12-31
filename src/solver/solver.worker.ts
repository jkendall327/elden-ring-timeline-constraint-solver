import { solve, type SolverInput } from './solver';
import type { SolverResult } from '../types';

/**
 * Message types for worker communication
 */
export interface SolverWorkerRequest {
  type: 'solve';
  input: SolverInput;
  requestId: number;
}

export interface SolverWorkerResponse {
  type: 'result';
  result: SolverResult;
  requestId: number;
}

export interface SolverWorkerError {
  type: 'error';
  error: string;
  requestId: number;
}

export type SolverWorkerMessage = SolverWorkerResponse | SolverWorkerError;

/**
 * Web Worker entry point.
 * Receives solve requests and returns results asynchronously.
 */
self.onmessage = (event: MessageEvent<SolverWorkerRequest>) => {
  const { type, input, requestId } = event.data;

  if (type !== 'solve') {
    const errorResponse: SolverWorkerError = {
      type: 'error',
      error: `Unknown message type: ${type}`,
      requestId,
    };
    self.postMessage(errorResponse);
    return;
  }

  try {
    const result = solve(input);

    const response: SolverWorkerResponse = {
      type: 'result',
      result,
      requestId,
    };
    self.postMessage(response);
  } catch (error) {
    const errorResponse: SolverWorkerError = {
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      requestId,
    };
    self.postMessage(errorResponse);
  }
};

// Signal that worker is ready
self.postMessage({ type: 'ready' });
