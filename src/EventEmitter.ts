export type ListenerClosure = (...args) => any;

interface Listener {
  closure: ListenerClosure;
  once: boolean;
}

type ListenerArray = Listener[];

export type OnErrorClosure = (error: any, name: string, ...args) => any;

export interface EventEmitterOptions {
  ignoreErrors?: boolean;
  onError?: OnErrorClosure;
}

export class EventEmitter {
  private ignoreErrors: boolean;
  private onError?: OnErrorClosure;

  private events: Map<string, ListenerArray> = new Map();

  constructor(options?: EventEmitterOptions) {
    this.ignoreErrors = options?.ignoreErrors ?? false;
    this.onError = options?.onError;
  }

  on(name: string, closure: ListenerClosure) {
    let array = this.events.get(name);

    if (array === undefined) {
      array = [];

      this.events.set(name, array);
    }

    const listener: Listener = { closure, once: false };

    array.push(listener);
  }

  off(name: string, closure?: ListenerClosure) {
    let array = this.events.get(name);

    if (array === undefined) {
      return;
    }

    const newArray: ListenerArray =
      closure !== undefined
        ? array.filter((listener: Listener) => listener.closure !== closure)
        : [];

    this.events.set(name, newArray);
  }

  once(name: string, closure: ListenerClosure) {
    let array = this.events.get(name);

    if (array === undefined) {
      array = [];

      this.events.set(name, array);
    }

    const listener: Listener = { closure, once: true };

    array.push(listener);
  }

  private remove(name: string, listener: Listener) {
    let array = this.events.get(name);

    if (array === undefined) {
      return;
    }

    const newArray: ListenerArray = array.filter(
      (tmpListener) => tmpListener !== listener
    );

    this.events.set(name, newArray);
  }

  private run(name: string, array: ListenerArray, ...args) {
    for (const listener of array) {
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

  emit(name: string, ...args) {
    const array = this.events.get(name);

    if (array === undefined) {
      return;
    }

    const tmpArray = [...array];

    this.run(name, tmpArray, ...args);
  }

  emitReversed(name: string, ...args) {
    const array = this.events.get(name);

    if (array === undefined) {
      return;
    }

    const tmpArray = [...array].reverse();

    this.run(name, tmpArray, ...args);
  }
}
