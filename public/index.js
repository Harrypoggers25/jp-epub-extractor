async function asyncHandler(header, handler) {
	try {
		return await handler();
	} catch (error) {
		console.error(`${header.toUpperCase()} ERROR:`, error.message ?? error);
		return undefined;
	}
}

function createElement(tag, className = null, text = null) {
	const element = document.createElement(tag);
	if (className !== null) element.className = className;
	if (text !== null) element.textContent = text;

	return element;
}

function wordId(a, b) {
	if (arguments.length === 2) return `${a}_${b}`;
	return `${a.w_basic_form}_${a.wt_name}`;
}


function focusCard(card) {
	card?.focus();
	card?.scrollIntoView({
		behavior: "smooth",
		block: "nearest"
	});
};

function focusModifiedCard(card, cardHandler) {
	let newCard = cardHandler(card);
	while (newCard) {
		if (newCard.classList.contains('modified')) {
			focusCard(newCard);
			break;
		}
		newCard = cardHandler(newCard);
	}
}

function focusUnmodifiedCard(card, cardHandler) {
	let newCard = cardHandler(card);
	while (newCard) {
		if (!newCard.classList.contains('modified')) {
			focusCard(newCard);
			break;
		}
		newCard = cardHandler(newCard);
	}
}

class Sidebar {
	constructor() {
		this.words = null;
		this.searchInput = document.getElementById('searchInput')
		this.searchResults = document.getElementById('searchResults')

		this.selectedWord = null;
	}
	async findWords(word) {
		const url = !word ? '/api/cleaned-buffers' : `/api/cleaned-buffers/${word}`
		const response = await fetch(url, {
			method: 'GET',
		})
		if (!response.ok) throw new Error(`Failed to find words. Internal error`);

		const words = await response.json();
		if (!words) throw new Error(`Failed to find words. Unable to find data`);

		return words;
	}
	async selectWord(word) {
		if (this.selectedWord) {
			const card = document.querySelector(`[data-id="${wordId(this.selectedWord)}"]`);
			card?.classList?.remove('active');
		}

		this.selectedWord = word;
		const card = document.querySelector(`[data-id="${wordId(this.selectedWord)}"]`);
		card?.classList?.add('active');
		focusCard(card);

		const params = new URLSearchParams(window.location.search);
		params.set('select', word.w_basic_form);
		params.set('wt_name', word.wt_name);
		window.history.replaceState({}, '', `${window.location.pathname}?${params}`);

		buffer.setWord(word);
	}
	focus() {
		const card = document.querySelector(`[data-id="${wordId(this.selectedWord)}"]`);
		if (card) {
			focusCard(card);
			return;
		}

		const cards = document.getElementsByClassName('search-item');
		if (!cards.length) return;

		focusCard(cards[0]);
	}
	renderSearchResults(words) {
		this.words = words;
		this.searchResults.innerHTML = '';
		for (const word of words) {
			this.searchResults.appendChild(this.createSearchItem(word));
		}
		if (this.selectedWord) {
			const card = document.querySelector(`[data-id="${wordId(this.selectedWord)}"]`);
			card?.classList?.add('active');
		}
	}
	createSearchItem(word) {
		const senseCount = JSON.parse(word.j_response).length;

		const card = createElement('div', 'search-item');
		card.dataset.id = wordId(word);
		card.appendChild(this.createSearchWord(word.w_basic_form));
		card.appendChild(this.createSearchWordType(word.wt_name));
		const isModified = (word) => {
			const senseState = buffer.senseStates[wordId(word)];
			if (!senseState) return false;

			const { state, ignore, merged_with } = senseState;
			return state.size || ignore || merged_with;
		}

		if (isModified(word)) card.classList.add('modified');
		if (senseCount === 1) card.classList.add('unique');
		if (senseCount === 0) card.classList.add('error');
		card.onclick = async e => {
			e.preventDefault();
			this.selectWord(word);
		}
		card.tabIndex = 0;
		card.addEventListener('keydown', ev => {
			switch (ev.key) {
				case 'j':
					ev.preventDefault();
					focusCard(card.nextElementSibling);
					break;
				case 'k':
					ev.preventDefault();
					focusCard(card.previousElementSibling);
					break;
				case 'l':
				case 'h':
					ev.preventDefault();
					buffer.focus();
					break;
				case 'w':
				case 'e':
					ev.preventDefault();
					focusUnmodifiedCard(card, card => card.nextElementSibling);

					break;
				case 'W':
				case 'E':
					ev.preventDefault();
					focusModifiedCard(card, card => card.nextElementSibling);

					break;
				case 'b':
					ev.preventDefault();
					focusUnmodifiedCard(card, card => card.previousElementSibling);

					break;
				case 'B':
					ev.preventDefault();
					focusModifiedCard(card, card => card.previousElementSibling);

					break;
				case 'Enter':
					ev.preventDefault();
					card.click();
					buffer.focus();
					break;
			}
		});

		return card;
	}
	createSearchWord(word) {
		return createElement('div', 'search-word', word);
	}
	createSearchWordType(wordType) {
		return createElement('div', 'search-word-type', wordType);
	}
}

const SenseState = {
	init: () => ({ state: new Set(), ignore: false, unimportant: false, merged_with: null }),
	create: async (body) => {
		return await asyncHandler('CREATE SENSE STATE', async () => {
			const response = await fetch('/api/sense-states', {
				method: 'POST',
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!response.ok) throw new Error(`Failed to create sense state. Internal error`);

			const senseState = await response.json();
			if (!senseState) throw new Error(`Failed to create sense state. Unable to create data`);

			return senseState;
		});
	},
	findAll: async () => {
		return await asyncHandler('FIND ALL SENSE STATES', async () => {
			const response = await fetch('/api/sense-states', { method: 'GET', });
			if (!response.ok) throw new Error(`Failed to find all sense states. Internal error`);

			const senseStates = await response.json();
			if (!senseStates) throw new Error(`Failed to find all sense states. Unable to find data`);

			return senseStates;
		})
	},
	update: async (ss_key, body) => {
		return await asyncHandler('UPDATE SENSE STATE', async () => {
			const response = await fetch(`/api/sense-states/${ss_key}`, {
				method: 'PATCH',
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!response.ok) throw new Error(`Failed to update sense state [${ss_key}]. Internal error`);

			const senseState = await response.json();
			if (!senseState) throw new Error(`Failed to update sense state [${ss_key}]. Unable to update data`);

			return senseState;
		});
	},
	removeAll: async () => {
		return await asyncHandler('DELETE ALL SENSE STATE', async () => {
			const response = await fetch('/api/sense-states', { method: 'DELETE' });
			if (!response.ok) throw new Error(`Failed to delete all sense states. Internal error`);

			const senseStates = await response.json();
			if (!senseStates) throw new Error(`Failed to delete all sense states. Unable to delete data`);

			return senseStates;
		});
	},
	remove: async (ss_key) => {
		return await asyncHandler('DELETE SENSE STATE', async () => {
			const response = await fetch(`/api/sense-states/${ss_key}`, { method: 'DELETE' });
			if (!response.ok) throw new Error(`Failed to delete sense state [${ss_key}]. Internal error`);

			const senseState = await response.json();
			if (!senseState) throw new Error(`Failed to delete sense state [${ss_key}]. Unable to delete data`);

			return senseState;
		});
	},
}

class Buffer {
	constructor() {
		this.basicForm = document.getElementById("basicForm");
		this.tokenId = document.getElementById("tokenId");
		this.wordType = document.getElementById("wordType");
		this.count = document.getElementById("count");
		this.container = document.getElementById("entries");
		this.headerActions = document.getElementById("headerActions");

		this.w_basic_form = '';
		this.token_ids = '';
		this.wt_name = '';
		this.j_response = '[]';

		this.senseStates = {};
	}
	async loadSenses() {
		const senseStates = await SenseState.findAll();
		if (!senseStates || !senseStates.length) {
			this.senseStates = {};
			return;
		}

		for (const { ss_key, state, unimportant, ignore, merged_with } of senseStates) {
			this.senseStates[ss_key] = { state: new Set(JSON.parse(state)), unimportant, ignore, merged_with };
		}
	}
	setWord(word) {
		this.w_basic_form = word.w_basic_form;
		this.token_ids = word.token_ids;
		this.wt_name = word.wt_name;
		this.j_response = JSON.parse(word.j_response);

		this.renderHeader();
		this.renderEntries();
	}
	focus() {
		const cards = document.getElementsByClassName('entry');
		if (!cards.length) return;

		focusCard(cards[0]);
	}
	renderHeader() {
		this.basicForm.textContent = this.w_basic_form;
		this.tokenId.textContent = `Token: ${this.token_ids}`;
		this.wordType.textContent = this.wt_name;
		this.count.textContent = `${this.j_response.length} Dictionary Entries`;

		this.headerActions.innerHTML = '';
		for (const button of this.createHeaderActions()) {
			this.headerActions.appendChild(button);
		}
	}
	renderEntries() {
		this.container.innerHTML = '';
		for (let i = 0; i < this.j_response.length; i++) {
			const entry = this.j_response[i];
			this.container.appendChild(this.createEntry(entry, i));
		}
	}
	createHeaderActions() {
		const btnUnimportant = createElement('button', 'header-btn', 'Unimportant');
		const btnIgnore = createElement('button', 'header-btn', 'Ignore');
		const btnMergeWith = createElement('button', 'header-btn', 'Merge with...');

		return [btnUnimportant, btnIgnore, btnMergeWith];
	}
	async toggleEntry(card, i) {
		const ss_key = wordId(this.w_basic_form, this.wt_name);
		if (!this.senseStates[ss_key]) {
			const createdSenseState = await SenseState.create({ ss_key });
			if (!createdSenseState) return;

			this.senseStates[ss_key] = SenseState.init();
		}

		const state = this.senseStates[ss_key].state ? new Set(this.senseStates[ss_key].state) : new Set();

		// Toggle off
		if (card.classList.contains('selected')) {
			if (!state.size) {
				card.classList.remove('selected');
				return;
			}

			state.delete(i);
			const updatedSenseState = await SenseState.update(ss_key, { state: Array.from(state) });
			if (!updatedSenseState) return;

			card.classList.remove('selected');
			this.senseStates[ss_key].state = state;
			return;
		}

		// Toggle on
		state.add(i);
		const updatedSenseState = await SenseState.update(ss_key, { state: Array.from(state) });
		if (!updatedSenseState) return;

		card.classList.add('selected');
		this.senseStates[ss_key].state = state;
	}
	createEntry(entry, i) {
		const card = createElement("div", "entry");
		card.appendChild(this.createEntryHeader(entry));
		card.appendChild(this.createJapaneseSection(entry.japanese));
		card.appendChild(this.createMeaningSection(entry.senses));
		const senseState = this.senseStates[wordId(this.w_basic_form, this.wt_name)];
		if (senseState?.state && senseState.state.has(i)) card.classList.add('selected');
		if (entry.tags.length > 0) card.appendChild(this.createDictionaryTags(entry.tags));

		const clickHandler = async ev => {
			ev.preventDefault();
			await this.toggleEntry(card, i);

			sidebar.renderSearchResults(sidebar.words);
		}
		card.onclick = clickHandler;
		card.tabIndex = 0;
		card.addEventListener('keydown', async ev => {
			switch (ev.key) {
				case 'j':
					ev.preventDefault();
					focusCard(card.nextElementSibling);
					break;
				case 'k':
					ev.preventDefault();
					focusCard(card.previousElementSibling);
					break;
				case 'Escape':
				case 'q':
				case 'l':
				case 'h':
					ev.preventDefault();
					sidebar.focus();
					break;
				case 'Enter':
					ev.preventDefault();
					await clickHandler(ev);
					if (!ev.shiftKey) {
						sidebar.focus();
					}
					break;
			}
		});

		return card;
	}
	createEntryHeader(entry) {
		const header = createElement("div", "entry-header");
		const slug = createElement("div", "slug", entry.slug);
		const badges = createElement("div");
		if (entry.is_common) badges.appendChild(this.createBadge("Common", "common"));
		if (entry.jlpt) badges.appendChild(this.createBadge(entry.jlpt, "jlpt"));

		header.appendChild(slug);
		header.appendChild(badges);

		return header;
	}
	createJapaneseSection(words) {
		const section = this.createSection("Forms");

		words.forEach((word) => {
			section.appendChild(this.createJapaneseWord(word));
		});

		return section;
	}
	createJapaneseWord(word) {
		const wrapper = createElement("div", "word");
		const text = createElement("strong", null, word.word);
		const reading = createElement("span", null, word.reading);
		wrapper.appendChild(text);
		wrapper.appendChild(reading);

		return wrapper;
	}
	createMeaningSection(senses) {
		const section = this.createSection("Meanings");

		senses.forEach((sense) => {
			section.appendChild(this.createSense(sense));
		});

		return section;
	}
	createSense(sense) {
		const wrapper = createElement("div", "sense");
		const definitions = createElement("div", "definitions", sense.english_definitions.join(", "));
		wrapper.appendChild(definitions);
		wrapper.appendChild(this.createTagContainer(sense.parts_of_speech));
		if (sense.tags.length > 0) wrapper.appendChild(this.createTagContainer(sense.tags));

		return wrapper;
	}
	createDictionaryTags(tags) {
		const section = this.createSection("Dictionary Tags");

		section.appendChild(this.createTagContainer(tags));

		return section;
	}
	createTagContainer(tags) {
		const container = createElement("div", "tags");

		tags.forEach((tag) => {
			container.appendChild(this.createTag(tag));
		});

		return container;
	}
	createTag(text) {
		return createElement("span", "tag", text);
	}
	createBadge(text, className) {
		return createElement("span", className, text);
	}
	createSection(title) {
		const section = createElement("div", "section");
		const heading = createElement("h3", null, title);
		section.appendChild(heading);

		return section;
	}
}

const buffer = new Buffer();
const sidebar = new Sidebar();

asyncHandler('MAIN INIT', async () => {
	await buffer.loadSenses()
	const words = await asyncHandler('SIDEBAR INIT', async () => {
		const words = await sidebar.findWords();
		sidebar.searchInput.oninput = async ev => {
			await asyncHandler('SIDEBAR SEARCH', async () => {
				const text = ev.target.value;
				const words = await sidebar.findWords(text);

				sidebar.renderSearchResults(words);
			})
		};

		sidebar.renderSearchResults(words);

		const params = new URLSearchParams(window.location.search);
		const select = params.get('select');
		const wt_name = params.get('wt_name');

		if (!select && !wt_name) return words;
		if (!wt_name) return words.filter(word => word.w_basic_form === select);
		return words.filter(word => word.w_basic_form === select && word.wt_name === wt_name);
	});
	if (!words.length) throw new Error(`Failed to load data. No data found`);

	const word = words[0];
	sidebar.selectWord(word);
	buffer.setWord(word);
});
