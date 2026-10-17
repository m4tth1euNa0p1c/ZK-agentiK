export type OperationState = 'RESERVED' | 'COMPLETED' | 'UNKNOWN' | 'REJECTED';

export interface OperationStore {
  reserve(key: string): Promise<boolean>;
  finish(key: string, state: Exclude<OperationState, 'RESERVED'>): Promise<void>;
}

/** Demo only: protects distinct fresh challenges for the same business action. */
export class MemoryOperationStore implements OperationStore {
  private records = new Map<string, OperationState>();
  constructor(private readonly capacity = 10_000) {}
  async reserve(key: string): Promise<boolean> {
    if (this.records.has(key) || this.records.size >= this.capacity) return false;
    this.records.set(key, 'RESERVED');
    return true;
  }
  async finish(key: string, state: Exclude<OperationState, 'RESERVED'>): Promise<void> {
    if (this.records.get(key) !== 'RESERVED') throw new Error('INVALID_OPERATION_TRANSITION');
    this.records.set(key, state);
  }
  state(key: string): OperationState | undefined { return this.records.get(key); }
}
