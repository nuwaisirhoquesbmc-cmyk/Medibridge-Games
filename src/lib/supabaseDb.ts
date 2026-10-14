import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// Document store on Supabase Postgres. Every record lives in the `app_documents`
// table (see schema.sql), keyed by its collection path + id, with the payload in
// a `data` jsonb column. This preserves the exact data shape the UI already
// consumes while all reads, writes, and realtime updates go through supabase-js.

const TABLE = "app_documents";
const TIMESTAMP_KEY = "__mb_ts";

export type DocumentData = Record<string, any>;
export type Unsubscribe = () => void;
export type WhereFilterOp =
  | "=="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "in"
  | "not-in"
  | "array-contains"
  | "array-contains-any";
export type OrderByDirection = "asc" | "desc";

export const db = { kind: "supabase-db" } as const;
export type Firestore = typeof db;

// ---------------------------------------------------------------------------
// Timestamp & field sentinels
// ---------------------------------------------------------------------------

export class Timestamp {
  constructor(public readonly seconds: number, public readonly nanoseconds: number) {}

  static now(): Timestamp {
    return Timestamp.fromMillis(Date.now());
  }

  static fromDate(date: Date): Timestamp {
    return Timestamp.fromMillis(date.getTime());
  }

  static fromMillis(ms: number): Timestamp {
    const seconds = Math.floor(ms / 1000);
    return new Timestamp(seconds, Math.round((ms - seconds * 1000) * 1e6));
  }

  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6);
  }

  toDate(): Date {
    return new Date(this.toMillis());
  }

  isEqual(other: Timestamp): boolean {
    return other instanceof Timestamp && other.toMillis() === this.toMillis();
  }

  valueOf(): string {
    return String(this.toMillis()).padStart(16, "0");
  }

  toJSON() {
    return { seconds: this.seconds, nanoseconds: this.nanoseconds };
  }
}

type SentinelKind = "serverTimestamp" | "increment" | "arrayUnion" | "arrayRemove" | "delete";

export class FieldValue {
  constructor(public readonly kind: SentinelKind, public readonly operand?: any) {}
}

export const serverTimestamp = () => new FieldValue("serverTimestamp");
export const increment = (n: number) => new FieldValue("increment", n);
export const arrayUnion = (...items: any[]) => new FieldValue("arrayUnion", items);
export const arrayRemove = (...items: any[]) => new FieldValue("arrayRemove", items);
export const deleteField = () => new FieldValue("delete");

// ---------------------------------------------------------------------------
// References & queries
// ---------------------------------------------------------------------------

type Constraint =
  | { type: "where"; field: string; op: WhereFilterOp; value: any }
  | { type: "orderBy"; field: string; direction: OrderByDirection }
  | { type: "limit"; count: number };

export class Query {
  readonly type: "query" | "collection" = "query";
  constructor(
    public readonly collectionPath: string,
    public readonly constraints: Constraint[] = [],
    public readonly isGroup = false
  ) {}
}

export class CollectionReference extends Query {
  override readonly type = "collection" as const;
  constructor(path: string) {
    super(path);
  }
  get path() {
    return this.collectionPath;
  }
  get id() {
    return lastSegment(this.collectionPath);
  }
}

export class DocumentReference {
  readonly type = "document" as const;
  constructor(public readonly path: string) {}
  get id() {
    return lastSegment(this.path);
  }
  get parent(): CollectionReference {
    return new CollectionReference(this.path.split("/").slice(0, -1).join("/"));
  }
}

type Parent = Firestore | CollectionReference | DocumentReference;

function lastSegment(path: string) {
  const parts = path.split("/");
  return parts[parts.length - 1];
}

function joinPath(parent: Parent, segments: string[]): string {
  const base = parent instanceof DocumentReference || parent instanceof CollectionReference ? parent.path : "";
  return [base, ...segments]
    .filter(Boolean)
    .join("/")
    .split("/")
    .filter(Boolean)
    .join("/");
}

export function generateId(length = 20): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function collection(parent: Parent, path: string, ...segments: string[]): CollectionReference {
  return new CollectionReference(joinPath(parent, [path, ...segments]));
}

export function collectionGroup(_db: Firestore, collectionId: string): Query {
  return new Query(collectionId, [], true);
}

export function doc(parent: Parent, path?: string, ...segments: string[]): DocumentReference {
  if (parent instanceof CollectionReference && path === undefined) {
    return new DocumentReference(`${parent.path}/${generateId()}`);
  }
  return new DocumentReference(joinPath(parent, [path ?? generateId(), ...segments]));
}

export function where(field: string, op: WhereFilterOp, value: any): Constraint {
  return { type: "where", field, op, value };
}

export function orderBy(field: string, direction: OrderByDirection = "asc"): Constraint {
  return { type: "orderBy", field, direction };
}

export function limit(count: number): Constraint {
  return { type: "limit", count };
}

export function query(base: Query, ...constraints: Constraint[]): Query {
  return new Query(base.collectionPath, [...base.constraints, ...constraints], base.isGroup);
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

export class DocumentSnapshot<T = DocumentData> {
  constructor(public readonly ref: DocumentReference, protected readonly payload: T | undefined) {}
  get id() {
    return this.ref.id;
  }
  exists(): boolean {
    return this.payload !== undefined;
  }
  data(): T | undefined {
    return this.payload === undefined ? undefined : (revive(clone(this.payload)) as T);
  }
  get(field: string): any {
    return getPath(this.data() ?? {}, field.split("."));
  }
}

export class QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<T> {
  override data(): T {
    return revive(clone(this.payload)) as T;
  }
}

export class QuerySnapshot<T = DocumentData> {
  constructor(public readonly docs: QueryDocumentSnapshot<T>[]) {}
  get size() {
    return this.docs.length;
  }
  get empty() {
    return this.docs.length === 0;
  }
  forEach(callback: (doc: QueryDocumentSnapshot<T>) => void) {
    this.docs.forEach(callback);
  }
}

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

function clone<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function isPlainObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype;
}

function revive(value: any): any {
  if (Array.isArray(value)) return value.map(revive);
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === TIMESTAMP_KEY && typeof value[TIMESTAMP_KEY] === "number") {
      return Timestamp.fromMillis(value[TIMESTAMP_KEY]);
    }
    const out: Record<string, any> = {};
    for (const key of keys) out[key] = revive(value[key]);
    return out;
  }
  return value;
}

function serialize(value: any): any {
  if (value instanceof Timestamp) return { [TIMESTAMP_KEY]: value.toMillis() };
  if (value instanceof Date) return { [TIMESTAMP_KEY]: value.getTime() };
  if (value instanceof DocumentReference) return value.path;
  if (Array.isArray(value)) return value.map(serialize);
  if (value !== null && typeof value === "object" && !(value instanceof FieldValue)) {
    const out: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      if (val !== undefined) out[key] = serialize(val);
    }
    return out;
  }
  return value;
}

function getPath(obj: any, parts: string[]): any {
  return parts.reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function sameValue(a: any, b: any) {
  return JSON.stringify(serialize(a)) === JSON.stringify(serialize(b));
}

function resolveSentinel(sentinel: FieldValue, current: any): any {
  switch (sentinel.kind) {
    case "serverTimestamp":
      return { [TIMESTAMP_KEY]: Date.now() };
    case "increment":
      return (typeof current === "number" ? current : 0) + Number(sentinel.operand || 0);
    case "arrayUnion": {
      const base = Array.isArray(current) ? [...current] : [];
      for (const item of sentinel.operand as any[]) {
        if (!base.some((existing) => sameValue(existing, item))) base.push(serialize(item));
      }
      return base;
    }
    case "arrayRemove": {
      const base = Array.isArray(current) ? current : [];
      return base.filter((existing) => !(sentinel.operand as any[]).some((item) => sameValue(existing, item)));
    }
    default:
      return undefined;
  }
}

function setPath(target: Record<string, any>, parts: string[], value: any) {
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!isPlainObject(cursor[parts[i]])) cursor[parts[i]] = {};
    cursor = cursor[parts[i]];
  }
  const last = parts[parts.length - 1];
  if (value instanceof FieldValue) {
    if (value.kind === "delete") delete cursor[last];
    else cursor[last] = resolveSentinel(value, cursor[last]);
  } else {
    cursor[last] = serialize(value);
  }
}

function deepMerge(target: Record<string, any>, patch: Record<string, any>) {
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (isPlainObject(value) && !(value instanceof FieldValue)) {
      if (!isPlainObject(target[key])) target[key] = {};
      deepMerge(target[key], value);
    } else {
      setPath(target, [key], value);
    }
  }
}

function hasSentinel(value: any): boolean {
  if (value instanceof FieldValue) return value.kind !== "serverTimestamp";
  if (isPlainObject(value)) return Object.values(value).some(hasSentinel);
  return false;
}

// ---------------------------------------------------------------------------
// Supabase access
// ---------------------------------------------------------------------------

function splitDocPath(path: string) {
  const parts = path.split("/");
  const collectionPath = parts.slice(0, -1).join("/");
  return { collectionPath, collectionName: lastSegment(collectionPath), id: parts[parts.length - 1] };
}

const warned = new Set<string>();
function warnOnce(context: string, error: { message?: string } | null) {
  const message = `${context}: ${error?.message ?? "unknown error"}`;
  if (warned.has(message)) return;
  warned.add(message);
  console.warn("[supabaseDb]", message);
}

async function fetchRow(ref: DocumentReference): Promise<DocumentData | undefined> {
  const { collectionPath, id } = splitDocPath(ref.path);
  const { data, error } = await supabase
    .from(TABLE)
    .select("data")
    .eq("collection_path", collectionPath)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    warnOnce(`read ${ref.path}`, error);
    return undefined;
  }
  return data ? ((data as { data: DocumentData }).data ?? {}) : undefined;
}

async function writeRow(ref: DocumentReference, payload: DocumentData) {
  const { collectionPath, collectionName, id } = splitDocPath(ref.path);
  const { error } = await supabase.from(TABLE).upsert(
    {
      collection_path: collectionPath,
      collection_name: collectionName,
      id,
      data: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "collection_path,id" }
  );
  if (error) throw new Error(`Supabase write failed for ${ref.path}: ${error.message}`);
  notifyLocal(collectionPath, collectionName);
}

function jsonPath(field: string, asText: boolean) {
  const parts = field.split(".");
  const last = parts.pop() as string;
  const prefix = ["data", ...parts].join("->");
  return `${prefix}${asText ? "->>" : "->"}${last}`;
}

function scalarText(value: any): string {
  if (value instanceof Timestamp) return String(value.toMillis());
  return typeof value === "string" ? value : JSON.stringify(value);
}

function applyWhere(builder: any, c: Extract<Constraint, { type: "where" }>) {
  const text = jsonPath(c.field, true);
  const json = jsonPath(c.field, false);
  const isTs = c.value instanceof Timestamp || c.value instanceof Date;
  const rangeValue = isTs
    ? c.value instanceof Date
      ? c.value.getTime()
      : c.value.toMillis()
    : c.value;
  const rangeColumn = isTs ? `${json}->${TIMESTAMP_KEY}` : typeof c.value === "number" ? json : text;

  switch (c.op) {
    case "==":
      return c.value === null ? builder.is(text, null) : builder.eq(text, scalarText(c.value));
    case "!=":
      return builder.neq(text, scalarText(c.value));
    case "<":
      return builder.lt(rangeColumn, rangeValue);
    case "<=":
      return builder.lte(rangeColumn, rangeValue);
    case ">":
      return builder.gt(rangeColumn, rangeValue);
    case ">=":
      return builder.gte(rangeColumn, rangeValue);
    case "in":
      return builder.in(text, (c.value as any[]).map(scalarText));
    case "not-in":
      return builder.not(text, "in", `(${(c.value as any[]).map((v) => `"${scalarText(v)}"`).join(",")})`);
    case "array-contains":
      return builder.filter(json, "cs", JSON.stringify([serialize(c.value)]));
    case "array-contains-any":
      return builder.or(
        (c.value as any[]).map((v) => `${json}.cs.${JSON.stringify([serialize(v)])}`).join(",")
      );
    default:
      return builder;
  }
}

async function runQuery(q: Query): Promise<QuerySnapshot> {
  let builder: any = supabase.from(TABLE).select("collection_path, id, data");
  builder = q.isGroup ? builder.eq("collection_name", q.collectionPath) : builder.eq("collection_path", q.collectionPath);

  for (const c of q.constraints) {
    if (c.type === "where") builder = applyWhere(builder, c);
  }
  for (const c of q.constraints) {
    if (c.type === "orderBy") {
      builder = builder.order(jsonPath(c.field, false), { ascending: c.direction !== "desc", nullsFirst: false });
    }
  }
  const limitConstraint = q.constraints.find((c) => c.type === "limit") as { count: number } | undefined;
  builder = builder.limit(limitConstraint ? limitConstraint.count : 1000);

  const { data, error } = await builder;
  if (error) {
    warnOnce(`query ${q.collectionPath}`, error);
    return new QuerySnapshot([]);
  }
  const rows = (data ?? []) as { collection_path: string; id: string; data: DocumentData }[];
  return new QuerySnapshot(
    rows.map(
      (row) => new QueryDocumentSnapshot(new DocumentReference(`${row.collection_path}/${row.id}`), row.data ?? {})
    )
  );
}

// ---------------------------------------------------------------------------
// Public read/write API
// ---------------------------------------------------------------------------

export async function getDoc(ref: DocumentReference): Promise<DocumentSnapshot> {
  return new DocumentSnapshot(ref, await fetchRow(ref));
}

export async function getDocs(q: Query): Promise<QuerySnapshot> {
  return runQuery(q);
}

export async function setDoc(ref: DocumentReference, data: DocumentData, options?: { merge?: boolean }) {
  if (options?.merge || hasSentinel(data)) {
    const existing = options?.merge ? (await fetchRow(ref)) ?? {} : {};
    deepMerge(existing, data);
    await writeRow(ref, existing);
    return;
  }
  const payload: Record<string, any> = {};
  deepMerge(payload, data);
  await writeRow(ref, payload);
}

export async function updateDoc(ref: DocumentReference, fieldOrData: string | DocumentData, ...rest: any[]) {
  const existing = await fetchRow(ref);
  if (existing === undefined) throw new Error(`No document to update: ${ref.path}`);

  const updates: [string, any][] = [];
  if (typeof fieldOrData === "string") {
    updates.push([fieldOrData, rest[0]]);
    for (let i = 1; i + 1 < rest.length; i += 2) updates.push([rest[i], rest[i + 1]]);
  } else {
    updates.push(...Object.entries(fieldOrData));
  }
  for (const [field, value] of updates) {
    if (value === undefined) continue;
    setPath(existing, field.split("."), value);
  }
  await writeRow(ref, existing);
}

export async function addDoc(ref: CollectionReference, data: DocumentData): Promise<DocumentReference> {
  const docRef = doc(ref);
  await setDoc(docRef, data);
  return docRef;
}

export async function deleteDoc(ref: DocumentReference) {
  const { collectionPath, collectionName, id } = splitDocPath(ref.path);
  const { error } = await supabase.from(TABLE).delete().eq("collection_path", collectionPath).eq("id", id);
  if (error) throw new Error(`Supabase delete failed for ${ref.path}: ${error.message}`);
  notifyLocal(collectionPath, collectionName);
}

export function writeBatch(_db?: Firestore) {
  const ops: (() => Promise<void>)[] = [];
  const batch = {
    set(ref: DocumentReference, data: DocumentData, options?: { merge?: boolean }) {
      ops.push(() => setDoc(ref, data, options));
      return batch;
    },
    update(ref: DocumentReference, data: DocumentData) {
      ops.push(() => updateDoc(ref, data));
      return batch;
    },
    delete(ref: DocumentReference) {
      ops.push(() => deleteDoc(ref));
      return batch;
    },
    async commit() {
      for (let i = 0; i < ops.length; i += 25) {
        await Promise.all(ops.slice(i, i + 25).map((op) => op()));
      }
    },
  };
  return batch;
}
export type WriteBatch = ReturnType<typeof writeBatch>;

// ---------------------------------------------------------------------------
// Realtime (Supabase postgres_changes) listeners
// ---------------------------------------------------------------------------

type Listener = { collectionPath: string; isGroup: boolean; refresh: () => void };
const listeners = new Set<Listener>();
let channelCounter = 0;

function notifyLocal(collectionPath: string, collectionName: string) {
  listeners.forEach((l) => {
    if (l.isGroup ? l.collectionPath === collectionName : l.collectionPath === collectionPath) l.refresh();
  });
}

type ErrorHandler = (error: Error) => void;

export function onSnapshot(
  ref: DocumentReference,
  onNext: (snapshot: DocumentSnapshot) => void,
  onError?: ErrorHandler
): Unsubscribe;
export function onSnapshot(
  ref: Query,
  onNext: (snapshot: QuerySnapshot) => void,
  onError?: ErrorHandler
): Unsubscribe;
export function onSnapshot(
  target: DocumentReference | Query,
  onNext: (snapshot: any) => void,
  onError?: ErrorHandler
): Unsubscribe {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const isDoc = target instanceof DocumentReference;
  const collectionPath = isDoc ? splitDocPath(target.path).collectionPath : target.collectionPath;
  const isGroup = !isDoc && target.isGroup;

  const load = async () => {
    try {
      const snapshot = isDoc ? await getDoc(target) : await getDocs(target);
      if (active) onNext(snapshot);
    } catch (err) {
      if (active) onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  const refresh = () => {
    if (!active) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(load, 120);
  };

  const listener: Listener = { collectionPath, isGroup, refresh };
  listeners.add(listener);
  load();

  const column = isGroup ? "collection_name" : "collection_path";
  let channel: RealtimeChannel | null = null;
  try {
    channel = supabase
      .channel(`mbdb_${++channelCounter}_${collectionPath.replace(/[^a-zA-Z0-9_]/g, "_")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: TABLE, filter: `${column}=eq.${collectionPath}` },
        refresh
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: TABLE, filter: `${column}=eq.${collectionPath}` },
        refresh
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: TABLE }, (payload: any) => {
        if (!payload?.old?.[column] || payload.old[column] === collectionPath) refresh();
      })
      .subscribe();
  } catch (err) {
    warnOnce(`realtime ${collectionPath}`, err as Error);
  }

  return () => {
    active = false;
    if (timer) clearTimeout(timer);
    listeners.delete(listener);
    if (channel) supabase.removeChannel(channel);
  };
}
