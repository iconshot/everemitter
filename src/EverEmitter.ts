export type ListenerClosure = (...args: any[]) => any;

interface Listener {
  closure: ListenerClosure;
  once: boolean;
}

export type OnErrorClosure = (error: any, name: string, ...args: any[]) => any;

export interface EverEmitterOptions {
  ignoreErrors?: boolean;
  onError?: OnErrorClosure;
}

export class EverEmitter {
  private ignoreErrors: boolean;
  private onError?: OnErrorClosure;

  private events: Map<string, Listener[]> = new Map();

  constructor(options?: EverEmitterOptions) {
    this.ignoreErrors = options?.ignoreErrors ?? false;
    this.onError = options?.onError;
  }

  on(name: string, closure: ListenerClosure): void {
    let listeners = this.events.get(name);

    if (listeners === undefined) {
      listeners = [];

      this.events.set(name, listeners);
    }

    const listener: Listener = { closure, once: false };

    listeners.push(listener);
  }

  once(name: string, closure: ListenerClosure): void {
    let listeners = this.events.get(name);

    if (listeners === undefined) {
      listeners = [];

      this.events.set(name, listeners);
    }

    const listener: Listener = { closure, once: true };

    listeners.push(listener);
  }

  off(name?: string, closure?: ListenerClosure): void {
    if (name === undefined) {
      this.events.clear();

      return;
    }

    let listeners = this.events.get(name);

    if (listeners === undefined) {
      return;
    }

    const tmpListeners =
      closure !== undefined
        ? listeners.filter((listener): boolean => listener.closure !== closure)
        : [];

    this.updateListeners(name, tmpListeners);
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

  emit(name: string, ...args: any[]): void {
    const listeners = this.events.get(name);

    if (listeners === undefined) {
      return;
    }

    const tmpListeners = [...listeners];

    this.runListeners(name, tmpListeners, ...args);
  }

  emitReversed(name: string, ...args: any[]): void {
    const listeners = this.events.get(name);

    if (listeners === undefined) {
      return;
    }

    const tmpListeners = [...listeners].reverse();

    this.runListeners(name, tmpListeners, ...args);
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
