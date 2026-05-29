import type { ChaosScenario, ChaosScenarioType } from './scenarios';

interface ActiveScenario extends ChaosScenario {
  expiresAt: number;
}

export class ChaosEngine {
  private activeScenarios = new Map<string, ActiveScenario>();

  constructor(private now: () => number = () => Date.now()) {}

  activate(...scenarios: ChaosScenario[]): void {
    const current = this.now();
    for (const scenario of scenarios) {
      this.activeScenarios.set(scenario.name, {
        ...scenario,
        expiresAt: current + scenario.duration,
      });
    }
  }

  deactivate(...names: string[]): void {
    for (const name of names) {
      this.activeScenarios.delete(name);
    }
  }

  deactivateAll(): void {
    this.activeScenarios.clear();
  }

  isActive(target: string, type?: ChaosScenarioType): boolean {
    return this.getActiveScenario(target, type) !== undefined;
  }

  getActiveScenario(target: string, type?: ChaosScenarioType): ChaosScenario | undefined {
    const now = this.now();
    for (const [name, scenario] of this.activeScenarios.entries()) {
      if (scenario.expiresAt <= now) {
        this.activeScenarios.delete(name);
        continue;
      }

      if (scenario.target !== target) {
        continue;
      }

      if (type && scenario.type !== type) {
        continue;
      }

      return scenario;
    }
    return undefined;
  }

  async execute<T>(target: string, action: () => Promise<T>): Promise<T> {
    const scenario = this.getActiveScenario(target);
    if (!scenario) {
      return action();
    }

    switch (scenario.type) {
      case 'latency':
        await sleep(Math.min(scenario.duration, 2000));
        return action();
      case 'error':
        throw new Error(`Chaos error injected for target=${target}: ${scenario.name}`);
      case 'outage':
        throw new Error(`Chaos outage injected for target=${target}: ${scenario.name}`);
      case 'resource':
        throw new Error(`Chaos resource limit injected for target=${target}: ${scenario.name}`);
      default:
        return action();
    }
  }

  listActive(): ChaosScenario[] {
    return Array.from(this.activeScenarios.values()).map(({ expiresAt, ...scenario }) => scenario);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
