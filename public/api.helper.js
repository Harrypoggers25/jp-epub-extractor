import { asyncHandler, PostEventSource } from "./tools.helper.js";

export const WordType = {
	find: async () => {
		return await asyncHandler('FIND WORD TYPES', async () => {
			const response = await fetch('/api/word-types', { method: 'GET' });
			if (!response.ok) throw new Error('Failed to find word types. Internal error');

			const wordTypes = await response.json();
			if (!wordTypes) throw new Error('Failed to find word types. Unable to find data');

			return wordTypes;
		});
	}
}

export const WordBuffer = {
	transform: async (w_basic_form, wt_name, body = {}) => {
		body.state = body.state ? Array.from(body.state) : body.state;
		return await asyncHandler('TRANSFORM WORD BUFFERS', async () => {
			const response = await fetch(`/api/word-buffers/transform/${w_basic_form}/${wt_name}`, {
				method: 'POST',
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!response.ok) throw new Error('Failed to find word buffers. Internal error');

			const data = await response.json();
			if (!data) throw new Error('Failed to find word buffers. Unable to find data');

			return {
				top: data.top.map(wordBuffer => {
					wordBuffer.j_response = JSON.parse(wordBuffer.j_response);
					return wordBuffer;
				}),
				bottom: data.bottom.map(wordBuffer => {
					wordBuffer.j_response = JSON.parse(wordBuffer.j_response);
					return wordBuffer;
				}),
			}
		});
	},
	find: async (w_basic_form) => {
		return await asyncHandler('FIND WORD BUFFERS', async () => {
			const url = !w_basic_form ? '/api/word-buffers' : `/api/word-buffers/${w_basic_form}`
			const response = await fetch(url, { method: 'GET' });
			if (!response.ok) throw new Error('Failed to find word buffers. Internal error');

			const wordBuffers = await response.json();
			if (!wordBuffers) throw new Error('Failed to find word buffers. Unable to find data');

			return wordBuffers.map(wordBuffer => {
				wordBuffer.j_response = JSON.parse(wordBuffer.j_response);
				return wordBuffer;
			});
		});
	},
	findOne: async (w_basic_form, wt_name) => {
		return await asyncHandler('FIND WORD BUFFER', async () => {
			const response = await fetch(`/api/word-buffers/${w_basic_form}/${wt_name}`, { method: 'GET' });
			if (!response.ok) throw new Error('Failed to find word buffer. Internal error');

			const wordBuffer = await response.json();
			if (!wordBuffer) throw new Error('Failed to find word buffer. Unable to find data');

			wordBuffer.j_response = JSON.parse(wordBuffer.j_response);
			return wordBuffer;
		});
	},
	confirm: (onmessage) => {
		return asyncHandler('CONFIRM BUFFER', () => {
			const eventSource = new PostEventSource('/api/word-buffers/confirm');

			eventSource.onmessage = async (event) => {
				await onmessage(JSON.parse(event.data), eventSource);
			};
		});
	}
}

export const SentenceBuffer = {
	find: async (w_basic_form, wt_name) => {
		return await asyncHandler('FIND SENTENCE BUFFERS', async () => {
			const response = await fetch(`/api/sentence-buffers/word-buffer/${w_basic_form}/${wt_name}?highlight=true`, { method: 'GET' });
			if (!response.ok) throw new Error('Failed to find sentence buffers. Internal error');

			const sentenceBuffers = await response.json();
			if (!sentenceBuffers) throw new Error('Failed to find sentence buffers. Unable to find data');

			return sentenceBuffers;
		});
	}
}

export const EntryState = {
	create: async (body) => {
		body.state = body.state ? Array.from(body.state) : body.state;
		return await asyncHandler('CREATE ENTRY STATE', async () => {
			const response = await fetch('/api/entry-states', {
				method: 'POST',
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!response.ok) throw new Error(`Failed to create entry state. Internal error`);

			const entryState = await response.json();
			if (!entryState) throw new Error(`Failed to create entry state. Unable to create data`);

			entryState.state = new Set(JSON.parse(entryState.state));
			return entryState;
		});
	},
	unmerge: async (es_id) => {
		return await asyncHandler('UNMERGE ENTRY STATE', async () => {
			const response = await fetch(`/api/entry-states/unmerge/${es_id}`, { method: 'POST' });
			if (!response.ok) throw new Error('Failed to unmerge entry state. Internal error');

			const entryStates = await response.json();
			if (!entryStates) throw new Error(`Failed to unmerge entry state. Unable to create data`);

			return entryStates.map(entryState => {
				entryState.state = new Set(JSON.parse(entryState.state));
				return entryState;
			});
		});
	},
	merge: async (es_id1, es_id2) => {
		return await asyncHandler('MERGE ENTRY STATES', async () => {
			const response = await fetch(`/api/entry-states/merge/${es_id1}/${es_id2}`, { method: 'POST' });
			if (!response.ok) throw new Error('Failed to merge entry state. Internal error');

			const entryStates = await response.json();
			if (!entryStates) throw new Error(`Failed to merge entry state. Unable to create data`);

			return entryStates.map(entryState => {
				entryState.state = new Set(JSON.parse(entryState.state));
				return entryState;
			});
		});
	},
	findAll: async () => {
		return await asyncHandler('FIND ALL ENTRY STATES', async () => {
			const response = await fetch('/api/entry-states', { method: 'GET', });
			if (!response.ok) throw new Error(`Failed to find all entry states. Internal error`);

			const entryStates = await response.json();
			if (!entryStates) throw new Error(`Failed to find all entry states. Unable to find data`);

			return entryStates.map(entryState => {
				entryState.state = new Set(JSON.parse(entryState.state));
				return entryState;
			});
		});
	},
	update: async (es_id, body) => {
		body.state = body.state ? Array.from(body.state) : body.state;
		return await asyncHandler('UPDATE ENTRY STATE', async () => {
			const response = await fetch(`/api/entry-states/${es_id}`, {
				method: 'PATCH',
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!response.ok) throw new Error(`Failed to update entry state [${es_id}]. Internal error`);

			const entryState = await response.json();
			if (!entryState) throw new Error(`Failed to update entry state [${es_id}]. Unable to update data`);

			entryState.state = new Set(JSON.parse(entryState.state));
			return entryState;
		});
	},
	removeAll: async () => {
		return await asyncHandler('DELETE ALL ENTRY STATE', async () => {
			const response = await fetch('/api/entry-states', { method: 'DELETE' });
			if (!response.ok) throw new Error(`Failed to delete all entry states. Internal error`);

			const entryStates = await response.json();
			if (!entryStates) throw new Error(`Failed to delete all entry states. Unable to delete data`);

			return entryStates.map(entryState => {
				entryState.state = new Set(JSON.parse(entryState.state));
				return entryState;
			});
		});
	},
	remove: async (es_id) => {
		return await asyncHandler('DELETE ENTRY STATE', async () => {
			const response = await fetch(`/api/entry-states/${es_id}`, { method: 'DELETE' });
			if (!response.ok) throw new Error(`Failed to delete entry state [${es_id}]. Internal error`);

			const entryState = await response.json();
			if (!entryState) throw new Error(`Failed to delete entry state [${es_id}]. Unable to delete data`);

			entryState.state = new Set(JSON.parse(entryState.state));
			return entryState;
		});
	},
}

