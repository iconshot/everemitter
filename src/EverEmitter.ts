interface ListenerEntry {
  listener: (...args: any[]) => any;
  once: boolean;
}

export type SignatureRecord = Record<string, (...args: any[]) => any>;

export type OnErrorCallback = (error: any, name: string, ...args: any[]) => any;

export interface EverEmitterOptions {
  ignoreErrors?: boolean;
  onError?: OnErrorCallback;
}

export class EverEmitter<K extends SignatureRecord> {
  private ignoreErrors: boolean;
  private onError?: OnErrorCallback;

  private events: Map<string, ListenerEntry[]> = new Map();

  constructor(options?: EverEmitterOptions) {
    this.ignoreErrors = options?.ignoreErrors ?? false;
    this.onError = options?.onError;
  }

  public on<N extends keyof K>(name: N, listener: K[N]): this {
    let entries = this.events.get(name as string);

    if (entries === undefined) {
      entries = [];

      this.events.set(name as string, entries);
    }

    const entry: ListenerEntry = { listener, once: false };

    entries.push(entry);

    return this;
  }

  public once<N extends keyof K>(name: N, listener: K[N]): this {
    let entries = this.events.get(name as string);

    if (entries === undefined) {
      entries = [];

      this.events.set(name as string, entries);
    }

    const entry: ListenerEntry = { listener, once: true };

    entries.push(entry);

    return this;
  }

  public off<N extends keyof K>(name?: N, listener?: K[N]): this {
    if (name === undefined) {
      this.events.clear();

      return this;
    }

    let entries = this.events.get(name as string);

    if (entries === undefined) {
      return this;
    }

    const tmpEntries =
      listener !== undefined
        ? entries.filter((entry): boolean => entry.listener !== listener)
        : [];

    this.updateEntries(name as string, tmpEntries);

    return this;
  }

  public emit<N extends keyof K>(name: N, ...args: Parameters<K[N]>): void {
    const entries = this.events.get(name as string);

    if (entries === undefined) {
      return;
    }

    const tmpEntries = [...entries];

    this.runEntries(name as string, tmpEntries, ...args);
  }

  public emitReversed<N extends keyof K>(
    name: N,
    ...args: Parameters<K[N]>
  ): void {
    const entries = this.events.get(name as string);

    if (entries === undefined) {
      return;
    }

    const tmpEntries = [...entries].reverse();

    this.runEntries(name as string, tmpEntries, ...args);
  }

  private removeEntryIfOnce(name: string, entry: ListenerEntry): void {
    if (!entry.once) {
      return;
    }

    let entries = this.events.get(name);

    if (entries === undefined) {
      return;
    }

    const tmpEntries = entries.filter(
      (tmpEntry): boolean => tmpEntry !== entry
    );

    this.updateEntries(name, tmpEntries);
  }

  private updateEntries(name: string, entries: ListenerEntry[]): void {
    if (entries.length === 0) {
      this.events.delete(name);
    } else {
      this.events.set(name, entries);
    }
  }

  private runEntries(
    name: string,
    entries: ListenerEntry[],
    ...args: any[]
  ): void {
    if (this.ignoreErrors) {
      for (const entry of entries) {
        this.removeEntryIfOnce(name, entry);

        try {
          const bool = entry.listener(...args);

          if (bool === false) {
            return;
          }
        } catch (error) {}
      }

      return;
    }

    if (this.onError !== undefined) {
      for (const entry of entries) {
        this.removeEntryIfOnce(name, entry);

        try {
          const bool = entry.listener(...args);

          if (bool === false) {
            return;
          }
        } catch (error) {
          const bool = this.onError(error, name, ...args);

          if (bool === false) {
            return;
          }
        }
      }

      return;
    }

    for (const entry of entries) {
      this.removeEntryIfOnce(name, entry);

      const bool = entry.listener(...args);

      if (bool === false) {
        return;
      }
    }
  }
}
