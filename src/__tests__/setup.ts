class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }

  get length(): number {
    return Object.keys(this.store).length;
  }
}

const mockStorage = new LocalStorageMock();
(globalThis as any).localStorage = mockStorage;

const listeners: Record<string, Function[]> = {};

if (typeof window === 'undefined') {
  (globalThis as any).window = globalThis;
}

(globalThis as any).CustomEvent = class CustomEvent {
  type: string;
  detail: any;
  constructor(type: string, params?: any) {
    this.type = type;
    this.detail = params?.detail;
  }
};

(globalThis as any).window.CustomEvent = (globalThis as any).CustomEvent;

(globalThis as any).window.addEventListener = (type: string, cb: Function) => {
  listeners[type] = listeners[type] || [];
  listeners[type].push(cb);
};

(globalThis as any).window.removeEventListener = (type: string, cb: Function) => {
  if (listeners[type]) {
    listeners[type] = listeners[type].filter((fn) => fn !== cb);
  }
};

(globalThis as any).window.dispatchEvent = (event: any) => {
  const cbs = listeners[event.type] || [];
  for (const cb of cbs) {
    try {
      cb(event);
    } catch {}
  }
  return true;
};

// In-memory IndexedDB mock
const inMemoryStore = new Map<string, any>();

const mockIDB = {
  open: (_name: string, _version?: number) => {
    const req: any = {
      result: {
        objectStoreNames: { contains: () => true },
        createObjectStore: () => {},
        transaction: () => ({
          objectStore: () => ({
            put: (item: any) => {
              inMemoryStore.set(item.id, item);
              const r: any = {};
              setTimeout(() => r.onsuccess?.({ target: { result: item.id } }), 0);
              return r;
            },
            get: (id: string) => {
              const r: any = {};
              setTimeout(() => {
                r.result = inMemoryStore.get(id);
                r.onsuccess?.({ target: { result: r.result } });
              }, 0);
              return r;
            },
            delete: (id: string) => {
              inMemoryStore.delete(id);
              const r: any = {};
              setTimeout(() => r.onsuccess?.({ target: {} }), 0);
              return r;
            },
          }),
        }),
      },
    };
    setTimeout(() => {
      req.onupgradeneeded?.({ target: req });
      req.onsuccess?.({ target: req });
    }, 0);
    return req;
  },
};

(globalThis as any).indexedDB = mockIDB;
(globalThis as any).window.indexedDB = mockIDB;

if (!(globalThis as any).URL) {
  (globalThis as any).URL = {};
}
(globalThis as any).URL.createObjectURL = () => `blob:mock-${Math.random()}`;
(globalThis as any).URL.revokeObjectURL = () => {};
