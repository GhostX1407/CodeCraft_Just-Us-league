/**
 * In-memory Mock Firestore for Local Standalone Execution & Unit Testing
 * 
 * Provides fast, synchronous/mock asynchronous operations matching Firestore API
 * without requiring the live emulator or network connectivity.
 */

export class MockDocumentSnapshot {
  constructor(
    public readonly id: string,
    private readonly _data: any,
    public readonly exists: boolean = _data !== undefined
  ) {}

  data() {
    return this._data ? JSON.parse(JSON.stringify(this._data)) : undefined;
  }
}

export class MockQuerySnapshot {
  constructor(public readonly docs: MockDocumentSnapshot[]) {}

  get empty(): boolean {
    return this.docs.length === 0;
  }

  get size(): number {
    return this.docs.length;
  }

  forEach(callback: (doc: MockDocumentSnapshot) => void): void {
    this.docs.forEach(callback);
  }
}

export class MockDocumentReference {
  constructor(
    public readonly id: string,
    private readonly store: Map<string, any>,
    private readonly path: string,
    private readonly rootDb: MockFirestore
  ) {}

  async get(): Promise<MockDocumentSnapshot> {
    const data = this.store.get(this.id);
    return new MockDocumentSnapshot(this.id, data, data !== undefined);
  }

  async set(data: any): Promise<void> {
    this.store.set(this.id, JSON.parse(JSON.stringify(data)));
  }

  async update(updates: any): Promise<void> {
    const existing = this.store.get(this.id);
    if (!existing) {
      throw new Error(`Document ${this.id} does not exist`);
    }
    const merged = { ...existing, ...JSON.parse(JSON.stringify(updates)) };
    this.store.set(this.id, merged);
  }

  async delete(): Promise<void> {
    this.store.delete(this.id);
  }

  collection(collectionName: string): MockCollectionReference {
    return this.rootDb.collection(`${this.path}/${this.id}/${collectionName}`);
  }
}

export class MockQuery {
  protected filters: Array<{ field: string; op: string; value: any }> = [];
  protected orderBys: Array<{ field: string; direction: 'asc' | 'desc' }> = [];
  protected limitCount?: number;

  constructor(
    protected readonly store: Map<string, any>,
    protected readonly path: string,
    protected readonly rootDb: MockFirestore
  ) {}

  where(field: string, op: string, value: any): MockQuery {
    const q = new MockQuery(this.store, this.path, this.rootDb);
    q.filters = [...this.filters, { field, op, value }];
    q.orderBys = [...this.orderBys];
    q.limitCount = this.limitCount;
    return q;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): MockQuery {
    const q = new MockQuery(this.store, this.path, this.rootDb);
    q.filters = [...this.filters];
    q.orderBys = [...this.orderBys, { field, direction }];
    q.limitCount = this.limitCount;
    return q;
  }

  limit(count: number): MockQuery {
    const q = new MockQuery(this.store, this.path, this.rootDb);
    q.filters = [...this.filters];
    q.orderBys = [...this.orderBys];
    q.limitCount = count;
    return q;
  }

  async get(): Promise<MockQuerySnapshot> {
    let items: Array<{ id: string; data: any }> = [];
    for (const [id, data] of this.store.entries()) {
      let match = true;
      for (const filter of this.filters) {
        const val = data[filter.field];
        if (filter.op === '==' && val !== filter.value) {
          match = false;
          break;
        }
      }
      if (match) {
        items.push({ id, data });
      }
    }

    for (const ob of this.orderBys) {
      items.sort((a, b) => {
        const valA = a.data[ob.field];
        const valB = b.data[ob.field];
        if (valA < valB) return ob.direction === 'asc' ? -1 : 1;
        if (valA > valB) return ob.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    if (this.limitCount !== undefined) {
      items = items.slice(0, this.limitCount);
    }

    const docs = items.map((i) => new MockDocumentSnapshot(i.id, i.data, true));
    return new MockQuerySnapshot(docs);
  }
}

export class MockCollectionReference extends MockQuery {
  constructor(
    store: Map<string, any>,
    path: string,
    rootDb: MockFirestore
  ) {
    super(store, path, rootDb);
  }

  doc(docId?: string): MockDocumentReference {
    const id = docId || `mock_id_${Math.random().toString(36).substring(2, 9)}`;
    return new MockDocumentReference(id, this.store, this.path, this.rootDb);
  }
}

export class MockFirestore {
  private collections = new Map<string, Map<string, any>>();

  collection(collectionPath: string): MockCollectionReference {
    if (!this.collections.has(collectionPath)) {
      this.collections.set(collectionPath, new Map<string, any>());
    }
    return new MockCollectionReference(
      this.collections.get(collectionPath)!,
      collectionPath,
      this
    );
  }

  async runTransaction<T>(updateFunction: (transaction: MockTransaction) => Promise<T>): Promise<T> {
    const tx = new MockTransaction(this);
    return updateFunction(tx);
  }

  batch() {
    return {
      update(ref: any, data: any) {
        ref.update(data);
        return this;
      },
      set(ref: any, data: any) {
        ref.set(data);
        return this;
      },
      delete(ref: any) {
        ref.delete();
        return this;
      },
      commit: async () => {},
    };
  }

  clear() {
    this.collections.clear();
  }
}

export class MockTransaction {
  constructor(protected readonly _db?: any) {}

  async get(docRef: any): Promise<MockDocumentSnapshot> {
    return docRef.get();
  }

  set(docRef: any, data: any): this {
    docRef.set(data);
    return this;
  }

  update(docRef: any, data: any): this {
    docRef.update(data);
    return this;
  }

  delete(docRef: any): this {
    docRef.delete();
    return this;
  }
}
