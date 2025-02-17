export function debug(context: string, data: unknown): void {
    console.log(`\n[DEBUG] ${context}:`, JSON.stringify(data, null, 2));
}