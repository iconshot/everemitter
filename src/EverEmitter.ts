interface Listener {
  closure: (...args: any[]) => any;
  once: boolean;
}

export type SignatureRecord = Record<string, (...args: any[]) => any>;

export type OnErrorClosure = (error: any, name: string, ...args: any[]) => any;

export interface EverEmitterOptions {
  ignoreErrors?: boolean;
  onError?: OnErrorClosure;
}

export class EverEmitter<K extends SignatureRecord> {
  private ignoreErrors: boolean;
  private onError?: OnErrorClosure;

  private events: Map<string, Listener[]> = new Map();

  constructor(options?: EverEmitterOptions) {
    this.ignoreErrors = options?.ignoreErrors ?? false;
    this.onError = options?.onError;
  }

  on<N extends keyof K>(name: N, closure: K[N]): this {
    let listeners = this.events.get(name as string);

    if (listeners === undefined) {
      listeners = [];

      this.events.set(name as string, listeners);
    }

    const listener: Listener = { closure, once: false };

    listeners.push(listener);

    return this;
  }

  once<N extends keyof K>(name: N, closure: K[N]): this {
    let listeners = this.events.get(name as string);

    if (listeners === undefined) {
      listeners = [];

      this.events.set(name as string, listeners);
    }

    const listener: Listener = { closure, once: true };

    listeners.push(listener);

    return this;
  }

  off<N extends keyof K>(name?: N, closure?: K[N]): this {
    if (name === undefined) {
      this.events.clear();

      return this;
    }

    let listeners = this.events.get(name as string);

    if (listeners === undefined) {
      return this;
    }

    const tmpListeners =
      closure !== undefined
        ? listeners.filter((listener): boolean => listener.closure !== closure)
        : [];

    this.updateListeners(name as string, tmpListeners);

    return this;
  }

  emit<N extends keyof K>(name: N, ...args: Parameters<K[N]>): void {
    const listeners = this.events.get(name as string);

    if (listeners === undefined) {
      return;
    }

    const tmpListeners = [...listeners];

    this.runListeners(name as string, tmpListeners, ...args);
  }

  emitReversed<N extends keyof K>(name: N, ...args: Parameters<K[N]>): void {
    const listeners = this.events.get(name as string);

    if (listeners === undefined) {
      return;
    }

    const tmpListeners = [...listeners].reverse();

    this.runListeners(name as string, tmpListeners, ...args);
  }

  private removeListenerIfOnce(name: string, listener: Listener): void {
    if (!listener.once) {
      return;
    }

    let listeners = this.events.get(name);

    if (listeners === undefined) {
      return;
    }

    const tmpListeners = listeners.filter(
      (tmpListener): boolean => tmpListener !== listener
    );

    this.updateListeners(name, tmpListeners);
  }

  private updateListeners(name: string, listeners: Listener[]): void {
    if (listeners.length === 0) {
      this.events.delete(name);
    } else {
      this.events.set(name, listeners);
    }
  }

  private runListeners(
    name: string,
    listeners: Listener[],
    ...args: any[]
  ): void {
    if (this.ignoreErrors) {
      for (const listener of listeners) {
        this.removeListenerIfOnce(name, listener);

        try {
          const bool = listener.closure(...args);

          if (bool === false) {
            return;
          }
        } catch (error) {}
      }

      return;
    }

    if (this.onError !== undefined) {
      for (const listener of listeners) {
        this.removeListenerIfOnce(name, listener);

        try {
          const bool = listener.closure(...args);

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

    for (const listener of listeners) {
      this.removeListenerIfOnce(name, listener);

      const bool = listener.closure(...args);

      if (bool === false) {
        return;
      }
    }
  }
}
