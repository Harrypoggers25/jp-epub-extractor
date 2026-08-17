// API
export async function asyncHandler(header, handler) {
	try {
		return await handler();
	} catch (error) {
		console.error(`${header.toUpperCase()} ERROR:`, error.message ?? error);
		return undefined;
	}
}

export const eventHandler = (handler) => {
	return async ev => {
		ev.preventDefault();
		await handler?.(ev);
	}
}

export class PostEventSource {
	constructor(url, options = {}) {
		this.url = url;
		this.options = options; // { method, headers, body }
		this.onmessage = null;
		this.onerror = null;
		this.onclose = null;

		this._controller = new AbortController();
		this._connect();
	}

	async _connect() {
		try {
			const response = await fetch(this.url, {
				method: this.options.method || 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(this.options.headers || {}),
				},
				body: this.options.body,
				signal: this._controller.signal,
			});

			if (!response.ok || !response.body) {
				throw new Error(`SSE connection failed: ${response.status}`);
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });

				const chunks = buffer.split('\n\n');
				buffer = chunks.pop();

				for (const chunk of chunks) {
					this._handleChunk(chunk);
				}
			}

			if (this.onclose) this.onclose();
		} catch (err) {
			if (err.name === 'AbortError') return;
			if (this.onerror) this.onerror(err);
		}
	}

	async _handleChunk(chunk) {
		const lines = chunk.split('\n');
		let data = '';
		let eventType = 'message';
		let id;

		for (const line of lines) {
			if (line.startsWith('data:')) {
				data += line.slice(5).trim();
			} else if (line.startsWith('event:')) {
				eventType = line.slice(6).trim();
			} else if (line.startsWith('id:')) {
				id = line.slice(3).trim();
			}
		}

		if (data && this.onmessage) {
			await this.onmessage({ data, event: eventType, id });
		}
	}

	close() {
		this._controller.abort();
	}
}

// UI
export function createElement(tag, className = null, text = null) {
	const element = document.createElement(tag);
	if (className !== null) element.className = className;
	if (text !== null) element.textContent = text;

	return element;
}

export function hasClass(elem, className) {
	return elem.classList.contains(className);
}

export function setClass(elem, className, toggle) {
	if (toggle) {
		if (!elem.classList.contains(className)) {
			elem.classList.add(className);
			return true;
		}
	} else {
		if (elem.classList.contains(className)) {
			elem.classList.remove(className);
			return true;
		}
	}
	return false;
}

export function unsetClass(elem, className) {
	if (!elem.classList.contains(className)) elem.classList.add(className);
}

export const nextElem = elem => elem.nextElementSibling;
export const prevElem = elem => elem.previousElementSibling;

export function focusable(elem) {
	elem.tabIndex = 0;
}

export function focusElem(elem) {
	elem?.focus();
	elem?.scrollIntoView({
		behavior: "smooth",
		block: "nearest"
	});
};

export function focusOnClassCard(card, className, cardHandler) {
	let newCard = cardHandler(card);
	while (newCard) {
		if (newCard.classList.contains(className)) {
			focusElem(newCard);
			break;
		}
		newCard = cardHandler(newCard);
	}
}

export function focusOffClassCard(card, className, cardHandler) {
	let newCard = cardHandler(card);
	while (newCard) {
		if (!newCard.classList.contains(className)) {
			focusElem(newCard);
			break;
		}
		newCard = cardHandler(newCard);
	}
}

// OTHERS
export const wordId = (wordBuffer) => `${wordBuffer.w_basic_form}_${wordBuffer.wt_name}`; // returns es_id
