import OpenAI from 'openai';
import type { LLMProvider, LLMMessage, LLMResponse, LLMStreamChunk } from '../types';

export class DeepSeekProvider implements LLMProvider {
	private client: OpenAI;
	model: string;

	constructor(apiKey: string, model: string = 'deepseek-chat') {
		this.client = new OpenAI({
			apiKey,
			baseURL: 'https://api.deepseek.com'
		});
		this.model = model;
	}

	async generate(messages: LLMMessage[]): Promise<LLMResponse> {
		const response = await this.client.chat.completions.create({
			model: this.model,
			temperature: 0,
			messages: messages.map((m) => ({
				role: m.role,
				content: m.content
			}))
		});

		const choice = response.choices[0];
		return {
			content: choice.message.content || '',
			usage: response.usage
				? {
						promptTokens: response.usage.prompt_tokens,
						completionTokens: response.usage.completion_tokens,
						totalTokens: response.usage.total_tokens
					}
				: undefined
		};
	}

	async *stream(messages: LLMMessage[]): AsyncGenerator<LLMStreamChunk> {
		const stream = await this.client.chat.completions.create({
			model: this.model,
			temperature: 0,
			messages: messages.map((m) => ({
				role: m.role,
				content: m.content
			})),
			stream: true,
			stream_options: { include_usage: true }
		});

		for await (const chunk of stream) {
			const delta = chunk.choices[0]?.delta;
			const content = delta?.content || '';
			if (content) {
				yield { content };
			}
			if (chunk.usage) {
				yield {
					usage: {
						promptTokens: chunk.usage.prompt_tokens,
						completionTokens: chunk.usage.completion_tokens,
						totalTokens: chunk.usage.total_tokens
					}
				};
			}
		}
	}
}
