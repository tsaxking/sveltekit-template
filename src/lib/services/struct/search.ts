import { type Subscriber, type Writable } from "svelte/store";
import { Struct, StructStream, type Blank, type ColTsType } from "./struct";
import { PaginationDataArr } from "./data-arr";


export class Search<T extends Blank> implements Writable<Group<T>> {
    static fromNode<T extends Blank>(struct: Struct<T>, node: FilterNode<T>) {
        const s = new Search(struct);
        s.query.nodes = [node];
        return s;
    }

    query = new Group<T>('and', [], this);

    constructor(public struct: Struct<T>) { }

    where<Col extends keyof T>(
        col: Col,
        op: 'contains' | 'equals' | '=' | '>' | '<' | '>=' | '<=',
        value: unknown
    ) {
        // this.query.nodes.push({
        //     type: 'condition',
        //     col,
        //     op,
        //     value,
        // });
        this.query.update(n => {
            n.nodes.push(new Condition(String(col), op, value, this.query));
            return n;
        })
        return this;
    }

    private subscribers = new Set<(value: Group<T>) => void>();

    subscribe(fn: Subscriber<Group<T>>) {
        fn(this.query);
        this.subscribers.add(fn);
        return () => this.subscribers.delete(fn);
    }

    set(value: Group<T>) {
        this.query = value;
        this.inform();
    }

    update(fn: (value: Group<T>) => Group<T>) {
        const value = fn(this.query);
        this.set(value);
    }

    inform() {
        this.subscribers.forEach(fn => fn(this.query));
    }

    toJson() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const serializeNode = (node: FilterNode<T>): any => {
            if (node.type === 'condition') {
                let val: unknown;
                if (this.struct.data.structure[node.col] === 'string') {
                    val = String(node.value);
                } else if (this.struct.data.structure[node.col] === 'number') {
                    val = Number(node.value);
                } else if (this.struct.data.structure[node.col] === 'boolean') {
                    val = Boolean(node.value);
                } else {
                    val = node.value;
                }
                return {
                    type: 'condition',
                    col: node.col,
                    op: node.op,
                    value: val,
                };
            } else {
                return {
                    type: 'group',
                    op: node.op,
                    nodes: node.nodes.map(serializeNode),
                };
            }
        };
        return serializeNode(this.query);
    }

    stream() {
        const stream = new StructStream(this.struct);
        const s = this.struct.getStream('search', this.toJson());
        s.pipe((data) => {
            stream.add(data);
        });
        s.on('error', (err) => stream.error(err));
        s.on('end', () => stream.end());
        return stream;
    }

    all() {
        const array = this.struct.arr();
        const s = this.struct.getStream('search', this.toJson());
        s.pipe((data) => {
            array.add(data);
        });
        return array;
    }

    paginated(config: {
        page: number;
        size: number;
        cache?: {
            expires: Date;
        }
    }) {
        let total = 0;
        return new PaginationDataArr(
            this.struct,
            config.page,
            config.size,
            async (page, size) => {
                const res = await this.struct.getPaginated(
                    'search',
                    this.toJson(),
                    {
                        cache: config.cache,
                        pagination: {
                            size: size,
                            page: page,
                        }
                    }
                ).unwrap();
                total = res.total;
                return res.items;
            },
            () => total,
        );
    }

    addCondition(col: string, op: 'contains' | 'equals' | '=' | '>' | '<' | '>=' | '<=' = 'equals', value: unknown) {
        this.query.addCondition(col, op, value);
    }

    addGroup() {
        this.query.addGroup();
    }

    or(nodes: {
        [K in keyof T]?: {
            op: 'contains' | 'equals' | '=' | '>' | '<' | '>=' | '<=';
            value: ColTsType<T[K]>;
        };
    }, fn?: (g: Group<T>) => void) {
        const group = new Group<T>('or', [], this);
        for (const col in nodes) {
            const condition = nodes[col];
            if (condition) {
                group.addCondition(
                    String(col),
                    condition.op,
                    condition.value
                );
            }
        }
        if (fn) {
            fn(group);
        }
        return this;
    }

    and(nodes: {
        [K in keyof T]?: {
            op: 'contains' | 'equals' | '=' | '>' | '<' | '>=' | '<=';
            value: ColTsType<T[K]>;
        }
    }, fn?: (g: Group<T>) => void) {
        const group = new Group<T>('and', [], this);
        for (const col in nodes) {
            const condition = nodes[col];
            if (condition) {
                group.addCondition(
                    String(col),
                    condition.op,
                    condition.value
                );
            }
        }
        if (fn) {
            fn(group);
        }
        return this;
    }
}


export class Condition<T extends Blank> implements Writable<{
    type: 'condition';
    col: string;
    op: 'contains' | 'equals' | '=' | '>' | '<' | '>=' | '<=';
    value: unknown;
}> {
    type = 'condition' as const;

    parent: Group<T> | Search<T>;

    constructor(
        public col: string,
        public op: 'contains' | 'equals' | '=' | '>' | '<' | '>=' | '<=',
        public value: unknown,
        parent: Group<T> | Search<T>
    ) {
        this.parent = parent;
    }

    private subscribers = new Set<(value: {
        type: 'condition';
        col: string;
        op: 'contains' | 'equals' | '=' | '>' | '<' | '>=' | '<=';
        value: unknown;
    }) => void>();

    subscribe(fn: Subscriber<{ type: "condition"; col: string; op: 'contains' | 'equals' | '=' | '>' | '<' | '>=' | '<='; value: unknown; }>) {
        fn({
            type: 'condition',
            col: this.col,
            op: this.op,
            value: this.value,
        });
        this.subscribers.add(fn);
        return () => this.subscribers.delete(fn);
    }

    set(value: { type: "condition"; col: string; op: 'contains' | 'equals' | '=' | '>' | '<' | '>=' | '<='; value: unknown; }) {
        this.col = value.col;
        this.op = value.op;
        this.value = value.value;
        this.inform();
    }

    update(fn: (value: { type: "condition"; col: string; op: 'contains' | 'equals' | '=' | '>' | '<' | '>=' | '<='; value: unknown; }) => { type: "condition"; col: string; op: 'contains' | 'equals' | '=' | '>' | '<' | '>=' | '<='; value: unknown; }) {
        const value = fn({
            type: 'condition',
            col: this.col,
            op: this.op,
            value: this.value,
        });
        this.set(value);
    }

    remove() {
        if (this.parent instanceof Search) {
            this.parent.query = new Group<T>('and', [], this.parent);
            this.parent.inform();
        } else {
            this.parent.update(p => {
                p.nodes = p.nodes.filter(n => n !== this);
                return p;
            });
        }
    }

    inform() {
        this.subscribers.forEach(fn => fn({
            type: 'condition',
            col: this.col,
            op: this.op,
            value: this.value,
        }));
        this.parent.inform();
    }
}

export class Group<T extends Blank> implements Writable<{
    type: 'group';
    op: 'and' | 'or';
    nodes: FilterNode<T>[];
}> {
    type = 'group' as const;
    parent: Group<T> | Search<T>;
    constructor(
        public op: 'and' | 'or',
        public nodes: FilterNode<T>[],
        parent: Group<T> | Search<T>,
    ) {
        this.parent = parent;
    }

    private subscribers = new Set<(value: {
        type: 'group';
        op: 'and' | 'or';
        nodes: FilterNode<T>[];
    }) => void>();

    subscribe(fn: Subscriber<{ type: "group"; op: "and" | "or"; nodes: FilterNode<T>[]; }>) {
        fn({
            type: 'group',
            op: this.op,
            nodes: this.nodes,
        });
        this.subscribers.add(fn);
        return () => this.subscribers.delete(fn);
    }

    set(value: { type: "group"; op: "and" | "or"; nodes: FilterNode<T>[]; }) {
        this.op = value.op;
        this.nodes = value.nodes;
        this.inform();
    }

    update(fn: (value: { type: "group"; op: "and" | "or"; nodes: FilterNode<T>[]; }) => { type: "group"; op: "and" | "or"; nodes: FilterNode<T>[]; }) {
        const value = fn({
            type: 'group',
            op: this.op,
            nodes: this.nodes,
        });
        this.set(value);
    }

    remove() {
        if (this.parent instanceof Search) {
            this.parent.query = new Group<T>('and', [], this.parent);
            this.parent.inform();
        } else {
            this.parent.update(p => {
                p.nodes = p.nodes.filter(n => n !== this);
                return p;
            });
        }
    }

    inform() {
        this.subscribers.forEach(fn => fn({
            type: 'group',
            op: this.op,
            nodes: this.nodes,
        }));
        this.parent.inform();
    }

    addCondition(col: string, op: 'contains' | 'equals' | '=' | '>' | '<' | '>=' | '<=' = 'equals', value: unknown) {
        this.update(g => {
            g.nodes.push(new Condition<T>(col, op, value, this));
            return g;
        });
    }

    addGroup() {
        this.update(g => {
            g.nodes.push(new Group<T>('and', [], this));
            return g;
        });
    }

    or(nodes: {
        [K in keyof T]?: {
            op: 'contains' | 'equals' |'=' | '>' | '<' | '>=' | '<=';
            value: ColTsType<T[K]>;
        };
    }, fn?: (g: Group<T>) => void) {
        const group = new Group<T>('or', [], this);
        for (const col in nodes) {
            const condition = nodes[col];
            if (condition) {
                group.addCondition(
                    String(col),
                    condition.op,
                    condition.value
                );
            }
        }
        if (fn) {
            fn(group);
        }
        this.update(g => {
            g.nodes.push(group);
            return g;
        });
        return this;
    }

    and(nodes: {
        [K in keyof T]?: {
            op: 'contains' | 'equals' | '=' | '>' | '<' | '>=' | '<=';
            value: ColTsType<T[K]>;
        }
    }, fn?: (g: Group<T>) => void) {
        const group = new Group<T>('and', [], this);
        for (const col in nodes) {
            const condition = nodes[col];
            if (condition) {
                group.addCondition(
                    String(col),
                    condition.op,
                    condition.value
                );
            }
        }
        if (fn) {
            fn(group);
        }
        this.update(g => {
            g.nodes.push(group);
            return g;
        });
        return this;
    }
}

export type FilterNode<T extends Blank> =
  Condition<T> | Group<T>;