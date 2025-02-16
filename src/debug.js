export function debug(context, data) {
    console.log(`\n[DEBUG] ${context}:`, JSON.stringify(data, null, 2));
}