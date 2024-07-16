export type ListenerClosure = (...args) => any;

interface Listener {
  closure: ListenerClosure;
  once: boolean;
}

export type OnErrorClosure = (error: any, name: string, ...args) => any;

export interface EventEmitterOptions {
  ignoreErrors?: boolean;
  onError?: OnErrorClosure;
}

export class EventEmitter {
  private ignoreErrors: boolean;
  private onError?: OnErrorClosure;

  private events: Map<string, Listener[]> = new Map();

  constructor(options?: EventEmitterOptions) {
    this.ignoreErrors = options?.ignoreErrors ?? false;
    this.onError = options?.onError;
  }

  on(name: string, closure: ListenerClosure) {
    let listeners = this.events.get(name);

    if (listeners === undefined) {
      listeners = [];

      this.events.set(name, listeners);
    }

    const listener: Listener = { closure, once: false };

    listeners.push(listener);
  }

  once(name: string, closure: ListenerClosure) {
    let listeners = this.events.get(name);

    if (listeners === undefined) {
      listeners = [];

      this.events.set(name, listeners);
    }

    const listener: Listener = { closure, once: true };

    listeners.push(listener);
  }

  off(name?: string, closure?: ListenerClosure) {
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
        ? listeners.filter((listener) => listener.closure !== closure)
        : [];

    this.updateListeners(name, tmpListeners);
  }

  private remove(name: string, listener: Listener) {
    let listeners = this.events.get(name);

    if (listeners === undefined) {
      return;
    }

    const tmpListeners = listeners.filter(
      (tmpListener) => tmpListener !== listener
    );

    this.updateListeners(name, tmpListeners);
  }

  private updateListeners(name: string, listeners: Listener[]) {
    if (listeners.length === 0) {
      this.events.delete(name);
    } else {
      this.events.set(name, listeners);
    }
  }

  emit(name: string, ...args) {
    const listeners = this.events.get(name);

    if (listeners === undefined) {
      return;
    }

    const tmpListeners = [...listeners];

    this.runListeners(name, tmpListeners, ...args);
  }

  emitReversed(name: string, ...args) {
    const listeners = this.events.get(name);

    if (listeners === undefined) {
      return;
    }

    const tmpListeners = [...listeners].reverse();

    this.runListeners(name, tmpListeners, ...args);
  }

  private runListeners(name: string, listeners: Listener[], ...args) {
    for (const listener of listeners) {
      try {
        const bool = listener.closure(...args);

        if (bool === false) {
          return;
        }
      } catch (error) {
        if (this.ignoreErrors) {
          continue;
        }

        if (this.onError !== undefined) {
          const bool = this.onError(error, name, ...args);

          if (bool === false) {
            return;
          }
        } else {
          throw error;
        }
      } finally {
        if (listener.once) {
          this.remove(name, listener);
        }
      }
    }
  }
}
