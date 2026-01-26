import { Struct } from "drizzle-struct";

/**
 * Registry for all structs available to the front end.
 */
export default new (class FrontEndStructRegistry {
    /**
     * Internal map of struct name to struct definition.
     */
    private readonly structs = new Map<string, Struct>();

    /**
     * Register a struct by its name.
     *
     * @param {Struct} struct - The struct definition to register.
     */
    register(struct: Struct) {
        this.structs.set(struct.name, struct);
    }

    /**
     * Get a registered struct by name.
     *
     * @param {string} name - The struct name.
     * @returns The registered struct, if present.
     */
    get(name: string): Struct | undefined {
        return this.structs.get(name);
    }

    /**
     * Check if a struct is registered.
     *
     * @param {string} name - The struct name.
     * @returns True when the struct is registered.
     */
    has(name: string): boolean {
        return this.structs.has(name);
    }
})();