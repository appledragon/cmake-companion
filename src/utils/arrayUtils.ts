/**
 * Shared array utility functions
 */

/**
 * Merge two arrays, keeping unique values and preserving order.
 * @param existing First array (or undefined)
 * @param incoming Second array to merge in
 * @returns Merged array with unique values
 */
export function mergeUnique(existing: string[] | undefined, incoming: string[]): string[] {
    const set = new Set(existing ?? []);
    const result = existing ? [...existing] : [];
    for (const item of incoming) {
        if (!set.has(item)) {
            set.add(item);
            result.push(item);
        }
    }
    return result;
}

/**
 * Deduplicate an array, preserving order.
 * @param items The input array
 * @returns Array with duplicates removed
 */
export function uniqueArray(items: string[]): string[] {
    return [...new Set(items)];
}
