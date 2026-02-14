import type { RequestEvent } from "../../../routes/fp/$types";

type ModuleConfig = {
    name: string;
    init?: () => Promise<void> | void;
    destroy?: () => Promise<void> | void;
};

export class Module {
    public static readonly modules = new Map<string, Module>();

    constructor(
        public readonly config: ModuleConfig
    ) {
        if (Module.modules.has(config.name)) {
            throw new Error(`Module with name ${config.name} already exists`);
        }
        Module.modules.set(config.name, this);
    }

    private initialized = false;
}


export class Middleware extends Module {
    constructor(
        public readonly config: ModuleConfig
    ) {
        super(config);
    }

    use(path: string, fn: (event: RequestEvent) => Promise<Response> | Response) {}

    get(path: string, fn: (event: RequestEvent) => Promise<Response> | Response) {}

    post(path: string, fn: (event: RequestEvent) => Promise<Response> | Response) {}

    put(path: string, fn: (event: RequestEvent) => Promise<Response> | Response) {}

    delete(path: string, fn: (event: RequestEvent) => Promise<Response> | Response) {}

    patch(path: string, fn: (event: RequestEvent) => Promise<Response> | Response) {}

    head(path: string, fn: (event: RequestEvent) => Promise<Response> | Response) {}
}