import { asyncHandler, PostEventSource } from "./tools.helper.js";

export const BookBuffer = {
	findCurrent: async () => {
		return await asyncHandler('FIND CURRENT BOOK BUFFER', async () => {
			const response = await fetch('/api/book-buffers/current', { method: 'GET' });
			if (!response.ok) {
				const error = await response.json().catch(() => undefined);
				if (response.status === 500 && error?.message === 'Failed to find current book buffer') return null;

				throw new Error(error?.message ?? 'Failed to find current book buffer. Internal error');
			}

			const bookBuffer = await response.json();
			if (!bookBuffer) throw new Error('Failed to find current book buffer. Unable to find data');

			return bookBuffer;
		});
	},
	upload: async file => {
		return await asyncHandler('UPLOAD BOOK BUFFER', async () => {
			const body = new FormData();
			body.append('file', file);

			const response = await fetch('/api/book-buffers/upload', {
				method: 'POST',
				body,
			});
			if (!response.ok) throw new Error('Failed to upload book buffer. Internal error');

			const bookBuffer = await response.json();
			if (!bookBuffer) throw new Error('Failed to upload book buffer. Unable to create data');

			return bookBuffer;
		});
	},
	confirm: async body => {
		return await asyncHandler('CONFIRM BOOK BUFFER', async () => {
			const response = await fetch('/api/book-buffers/confirm', {
				method: 'POST',
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!response.ok) throw new Error('Failed to confirm book buffer. Internal error');

			const bookBuffer = await response.json();
			if (!bookBuffer) throw new Error('Failed to confirm book buffer. Unable to update data');

			return bookBuffer;
		});
	},
	removeCurrent: async () => {
		return await asyncHandler('DELETE CURRENT BOOK BUFFER', async () => {
			const response = await fetch('/api/book-buffers/current', { method: 'DELETE' });
			if (!response.ok) throw new Error('Failed to delete current book buffer. Internal error');

			const bookBuffer = await response.json();
			if (!bookBuffer) throw new Error('Failed to delete current book buffer. Unable to delete data');

			return bookBuffer;
		});
	},
}

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

export const Word = {
	findAll: async (limit, offset) => {
		return await asyncHandler('FIND ALL WORDS', async () => {
			const params = new URLSearchParams();
			if (limit !== undefined) params.set('limit', limit);
			if (offset !== undefined) params.set('offset', offset);

			const query = params.size ? `?${params}` : '';
			const response = await fetch(`/api/words${query}`, { method: 'GET' });
			if (!response.ok) throw new Error('Failed to find all words. Internal error');

			const words = await response.json();
			if (!words) throw new Error('Failed to find all words. Unable to find data');

			return words;
		});
	},
	findMany: async (w_basic_form) => {
		return await asyncHandler('FIND WORDS', async () => {
			const response = await fetch(`/api/words/${w_basic_form}`, { method: 'GET' });
			if (!response.ok) throw new Error('Failed to find words. Internal error');

			const words = await response.json();
			if (!words) throw new Error('Failed to find words. Unable to find data');

			return words;
		});
	},
	find: async (w_basic_form, wt_name) => {
		return await asyncHandler('FIND WORDS', async () => {
			const response = await fetch(`/api/words/${w_basic_form}/${wt_name}`, { method: 'GET' });
			if (!response.ok) throw new Error('Failed to find words. Internal error');

			const words = await response.json();
			if (!words) throw new Error('Failed to find words. Unable to find data');

			return words;
		});
	},
	toggleIgnore: async (w_basic_form, wt_name) => {
		return await asyncHandler('TOGGLE IGNORE WORD', async () => {
			const response = await fetch(`/api/words/toggle-ignore/${encodeURIComponent(w_basic_form)}/${encodeURIComponent(wt_name)}`, {
				method: 'POST',
			});
			if (!response.ok) throw new Error('Failed to toggle ignore word. Internal error');

			const word = await response.json();
			if (!word) throw new Error('Failed to toggle ignore word. Unable to update data');

			return word;
		});
	},
	transform: async (w_basic_form, wt_name) => {
		return await asyncHandler('TRANSFORM WORD', async () => {
			const response = await fetch(`/api/words/transform/${encodeURIComponent(w_basic_form)}/${encodeURIComponent(wt_name)}`, {
				method: 'POST',
			});
			if (!response.ok) throw new Error('Failed to transform word. Internal error');

			const words = await response.json();
			if (!words?.top || !words?.bottom) throw new Error('Failed to transform word. Unable to find data');

			return words;
		});
	},
	merge: async (sourceId, targetId) => {
		return await asyncHandler('MERGE WORD', async () => {
			const response = await fetch(`/api/words/merge/${encodeURIComponent(sourceId)}/${encodeURIComponent(targetId)}`, {
				method: 'POST',
			});
			if (!response.ok) throw new Error('Failed to merge word. Internal error');

			const word = await response.json();
			if (!word) throw new Error('Failed to merge word. Unable to update data');

			return word;
		});
	}
}

export const parseUnsureWordBuffer = wordBuffer => {
	let j_response = wordBuffer.j_response;
	let j_response_invalid = false;
	try {
		if (typeof j_response === 'string') j_response = JSON.parse(j_response);
		if (!Array.isArray(j_response)) throw new Error('j_response must be an array');
	} catch {
		j_response = [];
		j_response_invalid = true;
	}

	return { ...wordBuffer, j_response, j_response_invalid };
}

export const UnsureWordBuffer = {
	findAll: async () => {
		return await asyncHandler('FIND ALL UNSURE WORD BUFFERS', async () => {
			const response = await fetch('/api/word-buffers/unsure', { method: 'GET' });
			if (!response.ok) throw new Error('Failed to find all unsure word buffers. Internal error');

			const wordBuffers = await response.json();
			if (!wordBuffers) throw new Error('Failed to find all unsure word buffers. Unable to find data');

			return wordBuffers.map(parseUnsureWordBuffer);
		});
	},
	findMany: async (w_basic_form) => {
		return await asyncHandler('FIND UNSURE WORD BUFFERS', async () => {
			const response = await fetch(`/api/word-buffers/unsure/${encodeURIComponent(w_basic_form)}`, { method: 'GET' });
			if (!response.ok) throw new Error('Failed to find unsure word buffers. Internal error');

			const wordBuffers = await response.json();
			if (!wordBuffers) throw new Error('Failed to find unsure word buffers. Unable to find data');

			return wordBuffers.map(parseUnsureWordBuffer);
		});
	},
	find: async (w_basic_form, wt_name) => {
		return await asyncHandler('FIND UNSURE WORD BUFFER', async () => {
			const response = await fetch(`/api/word-buffers/unsure/${encodeURIComponent(w_basic_form)}/${encodeURIComponent(wt_name)}`, { method: 'GET' });
			if (!response.ok) throw new Error('Failed to find unsure word buffer. Internal error');

			const wordBuffer = await response.json();
			if (!wordBuffer) throw new Error('Failed to find unsure word buffer. Unable to find data');

			return parseUnsureWordBuffer(wordBuffer);
		});
	},
	count: async () => {
		return await asyncHandler('COUNT UNSURE WORD BUFFERS', async () => {
			const response = await fetch('/api/word-buffers/unsure/count', { method: 'GET' });
			if (!response.ok) throw new Error('Failed to count unsure word buffers. Internal error');

			const data = await response.json();
			if (!data) throw new Error('Failed to count unsure word buffers. Unable to find data');

			return data;
		});
	},
	transform: async (w_basic_form, wt_name, body = {}) => {
		body.state = body.state ? Array.from(body.state) : body.state;
		return await asyncHandler('TRANSFORM UNSURE WORD BUFFERS', async () => {
			const response = await fetch(`/api/word-buffers/unsure/transform/${encodeURIComponent(w_basic_form)}/${encodeURIComponent(wt_name)}`, {
				method: 'POST',
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!response.ok) throw new Error('Failed to transform unsure word buffers. Internal error');

			const transformed = await response.json();
			if (!transformed) throw new Error('Failed to transform unsure word buffers. Unable to find data');

			return transformed;
		});
	},
	confirm: (onmessage, onerror, onclose) => {
		return asyncHandler('CONFIRM UNSURE WORD BUFFERS', () => {
			const eventSource = new PostEventSource('/api/word-buffers/unsure/confirm');

			eventSource.onmessage = async event => {
				await onmessage(JSON.parse(event.data), eventSource);
			};
			eventSource.onerror = error => onerror?.(error, eventSource);
			eventSource.onclose = () => onclose?.(eventSource);

			return eventSource;
		});
	}
}

const parseUnsureEntryState = entryState => {
	if (Array.isArray(entryState)) entryState = entryState[0];
	if (!entryState) return;

	let state;
	let state_invalid = false;
	try {
		state = JSON.parse(entryState.state);
		if (!Array.isArray(state) || state.some(i => !Number.isInteger(i))) throw new Error('state must be an array of indexes');
	} catch {
		state = [];
		state_invalid = true;
	}

	return { ...entryState, state: new Set(state), state_invalid };
}

export const UnsureEntryState = {
	findAll: async () => {
		return await asyncHandler('FIND ALL UNSURE ENTRY STATES', async () => {
			const response = await fetch('/api/unsure-entry-states', { method: 'GET' });
			if (!response.ok) throw new Error('Failed to find all unsure entry states. Internal error');

			const entryStates = await response.json();
			if (!entryStates) throw new Error('Failed to find all unsure entry states. Unable to find data');

			return entryStates.map(parseUnsureEntryState).filter(Boolean);
		});
	},
	find: async es_id => {
		return await asyncHandler('FIND UNSURE ENTRY STATE', async () => {
			const response = await fetch(`/api/unsure-entry-states/${encodeURIComponent(es_id)}`, { method: 'GET' });
			if (!response.ok) throw new Error(`Failed to find unsure entry state [${es_id}]. Internal error`);

			const entryState = await response.json();
			if (!entryState) throw new Error(`Failed to find unsure entry state [${es_id}]. Unable to find data`);

			return parseUnsureEntryState(entryState);
		});
	},
	update: async (es_id, body) => {
		if (body.state) body.state = Array.from(body.state).sort((a, b) => a - b);
		return await asyncHandler('UPDATE UNSURE ENTRY STATE', async () => {
			const response = await fetch(`/api/unsure-entry-states/${encodeURIComponent(es_id)}`, {
				method: 'PATCH',
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!response.ok) throw new Error(`Failed to update unsure entry state [${es_id}]. Internal error`);

			const entryState = await response.json();
			if (!entryState) throw new Error(`Failed to update unsure entry state [${es_id}]. Unable to update data`);

			return parseUnsureEntryState(entryState);
		});
	},
	merge: async (source_es_id, target_word_id) => {
		return await asyncHandler('MERGE UNSURE ENTRY STATE', async () => {
			const response = await fetch(`/api/unsure-entry-states/merge/${encodeURIComponent(source_es_id)}/${encodeURIComponent(target_word_id)}`, { method: 'POST' });
			if (!response.ok) throw new Error(`Failed to merge unsure entry state [${source_es_id}]. Internal error`);

			const entryState = await response.json();
			if (!entryState) throw new Error(`Failed to merge unsure entry state [${source_es_id}]. Unable to update data`);

			return Array.isArray(entryState) ? entryState.map(parseUnsureEntryState).filter(Boolean) : parseUnsureEntryState(entryState);
		});
	},
	unmerge: async source_es_id => {
		return await asyncHandler('UNMERGE UNSURE ENTRY STATE', async () => {
			const response = await fetch(`/api/unsure-entry-states/unmerge/${encodeURIComponent(source_es_id)}`, { method: 'POST' });
			if (!response.ok) throw new Error(`Failed to unmerge unsure entry state [${source_es_id}]. Internal error`);

			const entryState = await response.json();
			if (!entryState) throw new Error(`Failed to unmerge unsure entry state [${source_es_id}]. Unable to update data`);

			return Array.isArray(entryState) ? entryState.map(parseUnsureEntryState).filter(Boolean) : parseUnsureEntryState(entryState);
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
	},
	count: async () => {
		return await asyncHandler('COUNT WORD BUFFERS', async () => {
			const response = await fetch('/api/word-buffers/count', { method: 'GET' });
			if (!response.ok) throw new Error('Failed to count word buffers. Internal error');

			const wordBuffers = await response.json();
			if (!wordBuffers) throw new Error('Failed to count word buffers. Unable to find data');

			return wordBuffers;
		});
	},
	filter: (onmessage, onerror, onclose) => {
		return asyncHandler('FILTER WORD BUFFERS', () => {
			const eventSource = new PostEventSource('/api/word-buffers/filter');

			eventSource.onmessage = async event => {
				await onmessage(JSON.parse(event.data), eventSource);
			};
			eventSource.onerror = error => onerror?.(error, eventSource);
			eventSource.onclose = () => onclose?.(eventSource);

			return eventSource;
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
	},
	findBySection: async (section_no, limit) => {
		return await asyncHandler('FIND SENTENCE BUFFERS BY SECTION', async () => {
			const response = await fetch(`/api/sentence-buffers/section/${section_no}?limit=${limit}`, { method: 'GET' });
			if (!response.ok) throw new Error('Failed to find sentence buffers by section. Internal error');

			const sentenceBuffers = await response.json();
			if (!sentenceBuffers) throw new Error('Failed to find sentence buffers by section. Unable to find data');

			return sentenceBuffers;
		});
	}
}

export const TokenBuffer = {
	count: async () => {
		return await asyncHandler('COUNT TOKEN BUFFERS', async () => {
			const response = await fetch('/api/token-buffers/count', { method: 'GET' });
			if (!response.ok) throw new Error('Failed to count token buffers. Internal error');

			const tokenBuffers = await response.json();
			if (!tokenBuffers) throw new Error('Failed to count token buffers. Unable to find data');

			return tokenBuffers;
		});
	},
	tokenize: (onmessage, onerror, onclose) => {
		return asyncHandler('TOKENIZE BOOK BUFFER', () => {
			const eventSource = new PostEventSource('/api/token-buffers/tokenize');

			eventSource.onmessage = async event => {
				await onmessage(JSON.parse(event.data), eventSource);
			};
			eventSource.onerror = error => onerror?.(error, eventSource);
			eventSource.onclose = () => onclose?.(eventSource);

			return eventSource;
		});
	}
}

export const JishoBuffer = {
	load: (onmessage, onerror, onclose) => {
		return asyncHandler('LOAD JISHO BUFFERS', () => {
			const eventSource = new PostEventSource('/api/jisho-buffers/load');

			eventSource.onmessage = async event => {
				await onmessage(JSON.parse(event.data), eventSource);
			};
			eventSource.onerror = error => onerror?.(error, eventSource);
			eventSource.onclose = () => onclose?.(eventSource);

			return eventSource;
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

