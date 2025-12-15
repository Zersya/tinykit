import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { pb } from '$lib/server/pb'
import PocketBase from 'pocketbase'

const PB_URL = 'http://127.0.0.1:8091'

/**
 * Mask an API key, showing only the last 4 characters
 * Returns empty string if no key provided
 */
function mask_api_key(key: string | undefined): string {
	if (!key || key.length < 8) return ''
	return '•'.repeat(Math.min(key.length - 4, 20)) + key.slice(-4)
}

async function isAuthenticated(request: Request): Promise<boolean> {
	// Check for PB auth token in Authorization header or cookie
	const authHeader = request.headers.get('Authorization')
	const cookies = request.headers.get('Cookie') || ''

	// Extract token from cookie (PB stores as pb_auth)
	const pbAuthMatch = cookies.match(/pb_auth=([^;]+)/)
	const cookieData = pbAuthMatch ? decodeURIComponent(pbAuthMatch[1]) : null

	let token: string | null = null

	if (authHeader?.startsWith('Bearer ')) {
		token = authHeader.slice(7)
	} else if (cookieData) {
		try {
			const parsed = JSON.parse(cookieData)
			token = parsed.token
		} catch {}
	}

	if (!token) return false

	// Verify token with PB
	try {
		const testPb = new PocketBase(PB_URL)
		testPb.authStore.save(token, null)
		await testPb.collection('users').authRefresh()
		return true
	} catch {
		return false
	}
}

// GET /api/settings?key=llm
export const GET: RequestHandler = async ({ url, request }) => {
	if (!await isAuthenticated(request)) {
		return json({ error: 'Unauthorized' }, { status: 401 })
	}
	const key = url.searchParams.get('key')
	if (!key) {
		return json({ error: 'Missing key parameter' }, { status: 400 })
	}

	try {
		const record = await pb.collection('_tk_settings').getOne(key)
		let value = record.value

		// Mask API key for LLM settings
		if (key === 'llm' && value && typeof value === 'object') {
			value = {
				...value,
				api_key: mask_api_key(value.api_key),
				has_api_key: !!value.api_key
			}
		}

		return json({ value })
	} catch (err: any) {
		if (err.status === 404) {
			return json({ value: null })
		}
		console.error('Failed to get settings:', err)
		return json({ error: 'Failed to get settings' }, { status: 500 })
	}
}

// POST /api/settings
// Body: { key: string, value: any }
export const POST: RequestHandler = async ({ request }) => {
	if (!await isAuthenticated(request)) {
		return json({ error: 'Unauthorized' }, { status: 401 })
	}

	try {
		const { key, value } = await request.json()

		if (!key) {
			return json({ error: 'Missing key' }, { status: 400 })
		}

		let final_value = value

		// For LLM settings, merge with existing to preserve api_key if not provided
		if (key === 'llm' && value && typeof value === 'object') {
			try {
				const existing = await pb.collection('_tk_settings').getOne(key)
				if (existing?.value && !value.api_key) {
					// Preserve existing api_key
					final_value = { ...value, api_key: existing.value.api_key }
				}
			} catch {
				// No existing record, use value as-is
			}
		}

		try {
			// Try to update existing
			await pb.collection('_tk_settings').update(key, { value: final_value })
		} catch (err: any) {
			if (err.status === 404) {
				// Create new
				await pb.collection('_tk_settings').create({ id: key, value: final_value })
			} else {
				throw err
			}
		}

		return json({ success: true })
	} catch (err: any) {
		console.error('Failed to save settings:', err)
		return json({ error: err.message || 'Failed to save settings' }, { status: 500 })
	}
}
