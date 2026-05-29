import { chaosScenarios } from '../../tests/chaos/scenarios';
import { ChaosEngine } from '../../tests/chaos/engine';

describe('Chaos Engineering Harness', () => {
  it('exports a list of production-style chaos scenarios', () => {
    expect(Array.isArray(chaosScenarios)).toBe(true);
    expect(chaosScenarios.length).toBeGreaterThanOrEqual(4);
    for (const scenario of chaosScenarios) {
      expect(typeof scenario.name).toBe('string');
      expect(['latency', 'error', 'outage', 'resource']).toContain(scenario.type);
      expect(typeof scenario.target).toBe('string');
      expect(typeof scenario.duration).toBe('number');
      expect(scenario.impact.expectedBehavior).toBeTruthy();
      expect(scenario.impact.acceptableDegradation).toBeTruthy();
    }
  });

  it('injects latency before the wrapped action completes', async () => {
    const scenario = chaosScenarios.find((item) => item.type === 'latency');
    expect(scenario).toBeDefined();

    const engine = new ChaosEngine();
    engine.activate(scenario!);

    const start = Date.now();
    const result = await engine.execute(scenario!.target, async () => 'ok');
    const elapsed = Date.now() - start;

    expect(result).toBe('ok');
    expect(elapsed).toBeGreaterThanOrEqual(Math.min(scenario!.duration, 2000));
  });

  it('fails fast for injected outage scenarios', async () => {
    const scenario = chaosScenarios.find((item) => item.type === 'outage');
    expect(scenario).toBeDefined();

    const engine = new ChaosEngine();
    engine.activate(scenario!);

    await expect(engine.execute(scenario!.target, async () => 'ok')).rejects.toThrow(
      /Chaos outage injected/,
    );
  });

  it('fails fast for injected error scenarios', async () => {
    const scenario = chaosScenarios.find((item) => item.type === 'error');
    expect(scenario).toBeDefined();

    const engine = new ChaosEngine();
    engine.activate(scenario!);

    await expect(engine.execute(scenario!.target, async () => 'ok')).rejects.toThrow(
      /Chaos error injected/,
    );
  });

  it('fails fast for resource pressure scenarios', async () => {
    const scenario = chaosScenarios.find((item) => item.type === 'resource');
    expect(scenario).toBeDefined();

    const engine = new ChaosEngine();
    engine.activate(scenario!);

    await expect(engine.execute(scenario!.target, async () => 'ok')).rejects.toThrow(
      /Chaos resource limit injected/,
    );
  });

  it('does not inject failure when no active scenario matches', async () => {
    const engine = new ChaosEngine();
    const result = await engine.execute('unmatched-target', async () => 'safe');
    expect(result).toBe('safe');
  });
});
