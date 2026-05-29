export type ChaosScenarioType = 'latency' | 'error' | 'outage' | 'resource';

export interface ChaosImpact {
  expectedBehavior: string;
  acceptableDegradation: string;
}

export interface ChaosScenario {
  name: string;
  type: ChaosScenarioType;
  target: string;
  duration: number;
  impact: ChaosImpact;
  metadata?: Record<string, string>;
}

export const chaosScenarios: ChaosScenario[] = [
  {
    name: 'Database Connection Loss',
    type: 'outage',
    target: 'postgresql',
    duration: 30000,
    impact: {
      expectedBehavior: 'Graceful degradation with cached data and read-only access for non-critical endpoints',
      acceptableDegradation: 'Read-only mode for 30s with clear error messaging for write operations',
    },
    metadata: {
      schedule: 'weekly',
      mitigation: 'Enable database failover, retry with backoff, and preserve cached read paths',
    },
  },
  {
    name: 'External Search Latency',
    type: 'latency',
    target: 'elasticsearch',
    duration: 20000,
    impact: {
      expectedBehavior: 'Fallback search mode and user-facing partial results when primary search is slow',
      acceptableDegradation: 'Search response latency up to 2s with reduced ranking fidelity',
    },
    metadata: {
      schedule: 'bi-weekly',
      mitigation: 'Cache search results and degrade to database-backed search on timeout',
    },
  },
  {
    name: 'External Payment Gateway Failure',
    type: 'error',
    target: 'payment-gateway',
    duration: 30000,
    impact: {
      expectedBehavior: 'Retry logic or user-facing failure notice with no duplicate authorizations',
      acceptableDegradation: 'Payment attempt may be delayed by up to 30s and require user retry',
    },
    metadata: {
      schedule: 'monthly',
      mitigation: 'Circuit breaker with a secondary retry path and transaction idempotency',
    },
  },
  {
    name: 'Cache Service Resource Pressure',
    type: 'resource',
    target: 'redis',
    duration: 15000,
    impact: {
      expectedBehavior: 'Fallback to a safe default or bypass cache when the cache service is saturated',
      acceptableDegradation: 'Up to 50% slower response time for cached paths while avoiding request loss',
    },
    metadata: {
      schedule: 'monthly',
      mitigation: 'Use local memory fallback and circuit breakers for cache-bound operations',
    },
  },
  {
    name: 'Email Provider Outage',
    type: 'outage',
    target: 'smtp',
    duration: 30000,
    impact: {
      expectedBehavior: 'Notification system should queue outbound email and retry after provider recovery',
      acceptableDegradation: 'Email delivery may be delayed by up to 5 minutes during outage',
    },
    metadata: {
      schedule: 'quarterly',
      mitigation: 'Queue failed email messages for retry and expose delayed delivery warnings',
    },
  },
];
