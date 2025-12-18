/**
 * Shared utilities for data API endpoints
 */

// System fields that are always allowed (not user-defined)
const SYSTEM_FIELDS = ['id']

/**
 * Validate fields against collection schema and return unknown fields
 */
export function validate_schema(
	collection_data: any,
	fields: Record<string, any>
): { unknown_fields: string[], warnings: string[] } {
	const schema = collection_data?.schema || []
	const schema_fields = new Set(schema.map((f: any) => f.name))
	const unknown_fields: string[] = []
	const warnings: string[] = []

	for (const key of Object.keys(fields)) {
		// Skip system fields
		if (SYSTEM_FIELDS.includes(key)) continue
		// Check if field is in schema
		if (!schema_fields.has(key)) {
			unknown_fields.push(key)
		}
	}

	if (unknown_fields.length > 0) {
		const msg = `Unknown field(s) not in schema: ${unknown_fields.join(', ')}`
		warnings.push(msg)
		console.warn(`[Data API] ${msg}`)
	}

	return { unknown_fields, warnings }
}

/**
 * Generate a short random ID (5 chars, alphanumeric)
 */
export function generate_id(): string {
	const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
	let id = ''
	for (let i = 0; i < 5; i++) {
		id += chars[Math.floor(Math.random() * chars.length)]
	}
	return id
}
