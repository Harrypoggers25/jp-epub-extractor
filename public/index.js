import { SenseState, CleanedBuffer, WordType } from "./api.helper.js";
import { asyncHandler, eventHandler, createElement, wordId, nextElem, prevElem, focusElem, focusOnClassCard, focusOffClassCard } from "./tools.helper.js";

const KeydownHandlers = {
	sidebar: {
		searchInput: ev => {
			switch (ev.key) {
				case 'Enter':
				case 'Escape':
					sidebar.focus();
					break;
			}
		},
		card: async (card, ev, ss_key) => {
			const firstCard = () => document.getElementsByClassName('search-item')[0];
			const lastCard = () => {
				const cards = document.getElementsByClassName('search-item');
				return cards[cards.length - 1];
			}
			const buttonHandler = async (ss_key, i) => {
				const { buttons, handlers } = buffer.createButtons(ss_key);
				if (!buttons[i].disabled) {
					await handlers[i]();
					buffer.syncButtonState(wordId(buffer.w_basic_form, buffer.wt_name));
					focusElem(document.querySelector(`[data-id="${ss_key}"]`))
				}
				return;
			}
			switch (ev.key) {
				case 's':
					sidebar.searchInput.focus();
					break;
				case 'g':
				case 'Home':
					focusElem(firstCard());
					break;
				case 'G':
				case 'End':
					focusElem(lastCard());
					break;
				case 'ArrowDown':
				case 'j':
					if (!nextElem(card)) {
						focusElem(firstCard());
						break;
					}
					focusElem(nextElem(card));
					break;
				case 'J':
					if (!nextElem(card)) {
						focusElem(firstCard());
						firstCard().click();
						break;
					}
					focusElem(nextElem(card));
					nextElem(card).click();
					break;
				case 'ArrowUp':
				case 'k':
					if (!prevElem(card)) {
						focusElem(lastCard());
						break;
					}
					focusElem(prevElem(card));
					break;
				case 'K':
					if (!prevElem(card)) {
						focusElem(lastCard());
						lastCard().click();
						break;
					}
					focusElem(prevElem(card));
					prevElem(card).click();
					break;
				case 'ArrowRight':
				case 'ArrowLeft':
				case 'l':
				case 'h':
					buffer.focus();
					break;
				case 'w':
				case 'e':
					focusOffClassCard(card, 'modified', nextElem);
					break;
				case 'W':
				case 'E':
					focusOnClassCard(card, 'modified', nextElem);
					break;
				case 'b':
					focusOffClassCard(card, 'modified', prevElem);
					break;
				case 'B':
					focusOnClassCard(card, 'modified', prevElem);
					break;
				case 'Enter':
					card.click();
					buffer.focus();
					break;
				case 'u':
					await buttonHandler(ss_key, 1);
					break;
				case 'i':
					await buttonHandler(ss_key, 2);
					break;
			}
		},
	},
	buffer: {
		button: (button, ev) => {
			const canFocus = button => button && !button.disabled;
			switch (ev.key) {
				case 'ArrowDown':
				case 'j':
					if (!canFocus(nextElem(button))) {
						const cards = document.getElementsByClassName('entry');
						if (!cards) break;

						focusElem(cards[0]);
						break;
					}
					focusElem(nextElem(button));
					break;
				case 'ArrowUp':
				case 'k':
					if (!canFocus(prevElem(button))) {
						const cards = document.getElementsByClassName('entry');
						if (!cards) break;

						focusElem(cards[cards.length - 1]);
						break;
					}
					focusElem(prevElem(button));
					break;
				case 'Enter':
					button.click();
					break;
				default:
					KeydownHandlers.buffer.generic(ev);
					break;
			}
		},
		card: async (card, ev, clickHandler) => {
			const buttons = buffer.buttons;
			switch (ev.key) {
				case 'ArrowDown':
				case 'j':
					if (!nextElem(card)) {
						for (let i = buttons.length - 1; i >= 0; i--) {
							if (!buttons[i].disabled) focusElem(buttons[i]);
						}
						break;
					}
					focusElem(nextElem(card));
					break;
				case 'ArrowUp':
				case 'k':
					if (!prevElem(card)) {
						for (let i = 0; i < buttons.length; i++) {
							if (!buttons[i].disabled) focusElem(buttons[i]);
						}
						break;
					}
					focusElem(prevElem(card));
					break;
				case 'Enter':
					await clickHandler();
					if (!ev.shiftKey) sidebar.focus();
					break;
				default:
					KeydownHandlers.buffer.generic(ev);
					break;
			}
		},
		generic: ev => {
			const buttons = buffer.buttons;
			switch (ev.key) {
				case 'ArrowLeft':
				case 'ArrowRight':
				case 'Escape':
				case 'q':
				case 'l':
				case 'h':
					sidebar.focus();
					break;
				case 'm':
					if (!buttons[0].disabled) buttons[0].click();
					break;
				case 'u':
					if (!buttons[1].disabled) buttons[1].click();
					break;
				case 'i':
					if (!buttons[2].disabled) buttons[2].click();
					break;
			}
		}
	},
	mergeModal: {
		searchInput: ev => {
			switch (ev.key) {
				case 'Enter':
				case 'Escape':
					const cards = Object.values(mergeModal.modalItems);
					if (cards.length) focusElem(cards[0]);
					break;
			}
		},
		card: async (card, ev, clickHandler) => {
			switch (ev.key) {
				case 's':
					mergeModal.modalSearchInput.focus();
					break;
				case 'ArrowDown':
				case 'j':
					focusElem(nextElem(card));
					break;
				case 'ArrowUp':
				case 'k':
					focusElem(prevElem(card));
					break;
				case 'q':
				case 'Escape':
					mergeModal.cancel();
					break
				case 'Enter':
					if (ev.ctrlKey) await mergeModal.confirm();
					else clickHandler(ev);
					break;
			}
		}
	}
}

class Sidebar {
	constructor() {
		this.searchInput = document.getElementById('searchInput');
		this.searchResults = document.getElementById('searchResults');
		this.searchResultCount = document.getElementById('searchResultCount');

		this.wordTypes = {};
		this.words = null;
		this.selectedWord = null;

		this.searchInput.oninput = eventHandler(async ev => {
			await asyncHandler('SIDEBAR SEARCH', async () => {
				const text = ev.target.value;
				const words = await CleanedBuffer.find(text);
				if (!words) throw new Error(`Failed to search word '${text}'`);

				this.renderSearchResults(words);
			})
		});
		this.searchInput.addEventListener('keydown', ev => {
			KeydownHandlers.sidebar.searchInput(ev);
		});

		document.querySelector('div.sidebar-header').onclick = eventHandler(ev => {
			if (ev.target !== this.searchInput) this.focus();
		});
	}
	async load() {
		const wordTypes = await asyncHandler('SIDEBAR LOAD WORD TYPES', async () => {
			return await WordType.find();
		});
		if (!wordTypes) return;

		wordTypes.forEach(({ wt_name, wt_description }) => {
			this.wordTypes[wt_name] = wt_description ? `${wt_name} - ${wt_description}` : wt_name;
		});
	}
	async selectWord(word) {
		if (this.selectedWord) {
			const card = document.querySelector(`[data-id="${wordId(this.selectedWord)}"]`);
			card?.classList?.remove('active');
		}

		this.selectedWord = word;
		const card = document.querySelector(`[data-id="${wordId(this.selectedWord)}"]`);
		card?.classList?.add('active');
		focusElem(card);

		const params = new URLSearchParams(window.location.search);
		params.set('select', word.w_basic_form);
		params.set('wt_name', word.wt_name);
		window.history.replaceState({}, '', `${window.location.pathname}?${params}`);

		await buffer.setWord(word);
	}
	focus() {
		const card = document.querySelector(`[data-id="${wordId(this.selectedWord)}"]`);
		if (card) {
			focusElem(card);
			return;
		}

		const cards = document.getElementsByClassName('search-item');
		if (!cards.length) return;

		focusElem(cards[0]);
	}
	renderSearchResults(words) {
		this.words = words;
		this.searchResults.innerHTML = '';
		for (let i = 0; i < words.length; i++) {
			this.searchResults.appendChild(this.createSearchItem(i + 1, words[i]));
		}
		if (this.selectedWord) {
			const card = document.querySelector(`[data-id="${wordId(this.selectedWord)}"]`);
			card?.classList?.add('active');
		}
	}
	createSearchItem(index, word) {
		const senseCount = JSON.parse(word.j_response).length;

		const card = createElement('div', 'search-item');
		const ss_key = wordId(word);
		card.dataset.id = ss_key;
		const searchItemContents = createElement('div', 'search-item-contents');
		searchItemContents.appendChild(createElement('div', 'search-word', word.w_basic_form));
		searchItemContents.appendChild(createElement('div', 'search-word-type', `${this.wordTypes[word.wt_name]}`));
		card.appendChild(searchItemContents);
		const searchItemTags = createElement('div', 'search-item-tags');
		[['M', 'merged'], ['U', 'unsure'], ['I', 'ignore']].forEach(([text, className]) => {
			const tag = createElement('div', `search-tag-${className}`, text);
			searchItemTags.appendChild(tag);
		});
		card.appendChild(searchItemTags);

		const senseState = buffer.senseStates.get(ss_key);
		const isModified = () => {
			if (!senseState) return false;

			const { state, ignore, merged_with } = senseState;
			return state.size || ignore || merged_with;
		}

		if (isModified(word)) card.classList.add('modified');
		(() => {
			if (!senseState) return;
			if (senseState.ignore) {
				card.classList.add('ignore');
				return;
			}
			if (senseState.merged_with) {
				card.classList.add('merged');
				return;
			}
			if (senseState.unsure) card.classList.add('unsure');
		})();
		if (senseCount === 1) card.classList.add('unique');
		if (senseCount === 0) card.classList.add('error');
		card.onclick = async e => {
			e.preventDefault();
			this.selectWord(word);
		}
		const countUpdateHandler = () => {
			this.searchResultCount.textContent = `${index} / ${this.words.length}`
		}
		card.onfocus = countUpdateHandler;
		card.onmouseenter = countUpdateHandler;
		card.tabIndex = 0;
		card.addEventListener('keydown', eventHandler(async ev => {
			await KeydownHandlers.sidebar.card(card, ev, ss_key);
		}));

		return card;
	}
}

class SenseStates {
	constructor() {
		this.states = {};
	}
	toModel(db_senseState) {
		const state = new Set(JSON.parse(db_senseState.state));
		delete db_senseState.ss_key;
		return { ...db_senseState, state };
	}
	async load() {
		await asyncHandler('SENSE STATE LOAD', async () => {
			const senseStates = await SenseState.findAll();
			if (!senseStates) throw new Error('Failed to load sense states');
			if (!senseStates.length) return;

			for (const senseState of senseStates) {
				const ss_key = senseState.ss_key;
				this.states[ss_key] = this.toModel(senseState);
			}
		})
	}
	async init(ss_key) {
		return await asyncHandler('SENSE STATE INIT', async () => {
			if (!this.states[ss_key]) {
				const createdSenseState = await SenseState.create({ ss_key });
				if (!createdSenseState) throw new Error('Failed to initialize sense state');

				this.states[ss_key] = this.toModel(createdSenseState);
			}

			return this.get(ss_key);
		});
	}
	get(ss_key) {
		return this.states[ss_key];
	}
	async set(ss_key, body) {
		return await asyncHandler('SENSE STATE SET', async () => {
			if (!this.states[ss_key]) throw new Error('Failed to set sense state. Sense state must be initialized');

			const senseState = this.states[ss_key];
			for (const [key, val] of Object.entries(body)) {
				if (senseState[key] === undefined) throw new Error(`Failed to set sense state. key '${key}' is invalid`);
				senseState[key] = val;
			}

			const updateBody = { ...body, ...{ state: body.state ? Array.from(body.state) : body.state } };
			const updatedSenseState = await SenseState.update(ss_key, updateBody);
			if (!updatedSenseState) throw new Error('Failed to set sense state');

			this.states[ss_key] = senseState;
			return senseState;
		})
	}
}

class Buffer {
	constructor() {
		this.basicForm = document.getElementById("basicForm");
		this.tokenId = document.getElementById("tokenId");
		this.wordType = document.getElementById("wordType");
		this.entryCount = document.getElementById("count");
		this.occurrenceCount = document.getElementById("occurrence");
		this.container = document.getElementById("entries");
		this.headerActions = document.getElementById("headerActions");
		this.buttons = [];

		this.w_basic_form = '';
		this.token_ids = '';
		this.wt_name = '';
		this.occurrence_count = '';
		this.entry_count = '';
		this.word = null;

		this.senseStates = new SenseStates();

		const mainContent = document.querySelector('main.content');
		mainContent.onclick = eventHandler(ev => {
			if (ev.target === mainContent) this.focus();
		});
	}
	async setWord(word) {
		const ss_key = wordId(word);
		this.w_basic_form = word.w_basic_form;
		this.token_ids = word.token_ids;
		this.wt_name = word.wt_name;
		this.occurrence_count = word.count;
		this.entry_count = JSON.parse(word.j_response).length;

		this.renderHeader();
		const senseState = this.senseStates.get(ss_key);
		if (senseState?.merged_with) {
			this.container.innerHTML = '';
			const [w_basic_form, wt_name] = senseState.merged_with.split('_');
			const word = await CleanedBuffer.findOne(w_basic_form, wt_name);
			if (!word) return;

			this.word = word;
			this.renderEntries(true);
			return;
		}
		this.word = word;
		this.renderEntries();
	}
	renderHeader() {
		this.basicForm.textContent = this.w_basic_form;
		this.tokenId.textContent = `Token: ${this.token_ids}`;
		this.wordType.textContent = sidebar.wordTypes[this.wt_name];
		this.occurrenceCount.textContent = this.occurrence_count === 1 ? `1 Book occurrence` : `${this.occurrence_count} Book occurrences`;
		this.entryCount.textContent = this.entry_count === 1 ? `1 Dictionary Entry` : `${this.entry_count} Dictionary Entries`;

		this.headerActions.innerHTML = '';
		for (const button of this.createHeaderActions()) {
			this.headerActions.appendChild(button);
		}
	}
	renderEntries(disabled) {
		const entries = JSON.parse(this.word.j_response);
		this.container.innerHTML = '';
		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i];
			this.container.appendChild(this.createEntry(entry, i, disabled));
		}
	}
	syncButtonState(ss_key, buttons) {
		const senseState = this.senseStates.get(ss_key);
		if (!senseState) return;

		const [btnMergeWith, btnUnsure, btnIgnore] = buttons ?? this.buttons;
		const { merged_with, unsure, ignore } = senseState;
		if (ignore) {
			if (!btnIgnore.classList.contains('selected')) btnIgnore.classList.add('selected');
			btnMergeWith.disabled = true;
			btnUnsure.disabled = true;
			return;
		}
		if (btnIgnore.classList.contains('selected')) btnIgnore.classList.remove('selected');
		btnMergeWith.disabled = false;

		if (merged_with) {
			if (!btnMergeWith.classList.contains('selected')) {
				btnMergeWith.classList.add('selected');
				btnMergeWith.textContent = 'Unmerge';
			}
			btnUnsure.disabled = true;
			btnIgnore.disabled = true;
			return;
		}
		if (btnMergeWith.classList.contains('selected')) {
			btnMergeWith.classList.remove('selected');
			btnMergeWith.textContent = 'Merge';
		}
		btnUnsure.disabled = false
		btnIgnore.disabled = false;

		if (unsure) {
			if (!btnUnsure.classList.contains('selected')) btnUnsure.classList.add('selected');
			return;
		}
		if (btnUnsure.classList.contains('selected')) btnUnsure.classList.remove('selected');
	}
	createHeaderActions() {
		const ss_key = wordId(this.w_basic_form, this.wt_name);

		this.buttons = this.createButtons(ss_key).buttons;
		this.buttons.forEach(button => {
			button.tabIndex = 0;
			button.addEventListener('keydown', eventHandler(ev => {
				KeydownHandlers.buffer.button(button, ev);
			}));
		})

		return this.buttons;
	}
	createButtons(ss_key) {
		const btnMergeWith = createElement('button', 'header-btn', 'Merge');
		const btnMergeWithHandler = async () => {
			const senseState = await this.senseStates.init(ss_key);
			if (!senseState) return;

			if (senseState.merged_with) {
				const merged_with = null;
				const updatedSenseState = await this.senseStates.set(ss_key, { merged_with });
				if (!updatedSenseState) return;

				sidebar.renderSearchResults(sidebar.words);
				this.syncButtonState(ss_key, buttons);
				this.word = sidebar.selectedWord;
				this.renderEntries();
				focusElem(btnMergeWith);
				this.focus();
				return;
			}

			focusElem(btnMergeWith);
			this.focus();
			await mergeModal.open(this.w_basic_form, this.wt_name);
		}
		btnMergeWith.onclick = eventHandler(btnMergeWithHandler);

		const btnUnsure = createElement('button', 'header-btn', 'Unsure');
		const btnUnsureHandler = async () => {
			const senseState = await this.senseStates.init(ss_key);
			if (!senseState) return;

			const unsure = !senseState.unsure;
			const updatedSenseState = this.senseStates.set(ss_key, { unsure });
			if (!updatedSenseState) return;

			sidebar.renderSearchResults(sidebar.words);
			this.syncButtonState(ss_key, buttons);
			focusElem(btnUnsure);
			this.focus()
		}
		btnUnsure.onclick = eventHandler(btnUnsureHandler);

		const btnIgnore = createElement('button', 'header-btn', 'Ignore');
		const btnIgnorHandler = async () => {
			const senseState = await this.senseStates.init(ss_key);
			if (!senseState) return;

			const ignore = !senseState.ignore;
			const updatedSenseState = this.senseStates.set(ss_key, { ignore });
			if (!updatedSenseState) return;

			sidebar.renderSearchResults(sidebar.words);
			this.syncButtonState(ss_key, buttons);
			focusElem(btnIgnore); // Ensure button is visible
			this.focus();
		}
		btnIgnore.onclick = eventHandler(btnIgnorHandler);

		const buttons = [btnMergeWith, btnUnsure, btnIgnore];
		const handlers = [btnMergeWithHandler, btnUnsureHandler, btnIgnorHandler];

		this.syncButtonState(ss_key, buttons);

		return { buttons, handlers };
	}
	async toggleEntry(card, i) {
		const ss_key = wordId(this.w_basic_form, this.wt_name);
		const senseState = await this.senseStates.init(ss_key);
		if (!senseState) return;

		const state = new Set(senseState.state);

		// Toggle off
		if (card.classList.contains('selected')) {
			if (!state.size) {
				card.classList.remove('selected');
				return;
			}

			state.delete(i);
			const updatedSenseState = await this.senseStates.set(ss_key, { state });
			if (!updatedSenseState) return;

			card.classList.remove('selected');
			return;
		}

		// Toggle on
		state.add(i);
		const updatedSenseState = await this.senseStates.set(ss_key, { state });
		if (!updatedSenseState) return;

		card.classList.add('selected');
	}
	createEntry(entry, i, disabled) {
		const card = createElement("div", "entry");
		card.appendChild(this.createEntryHeader(entry));
		card.appendChild(this.createJapaneseSection(entry.japanese));
		card.appendChild(this.createMeaningSection(entry.senses));

		const senseState = this.senseStates.get(wordId(this.word));
		if (senseState?.state && senseState.state.has(i)) card.classList.add('selected');
		if (entry.tags.length > 0) card.appendChild(this.createDictionaryTags(entry.tags));

		if (disabled) {
			card.classList.add('disabled');
			return card;
		}

		const clickHandler = async () => {
			await this.toggleEntry(card, i);
			sidebar.renderSearchResults(sidebar.words);
		}
		card.onclick = eventHandler(clickHandler);
		card.tabIndex = 0;
		card.addEventListener('keydown', eventHandler(async ev => {
			await KeydownHandlers.buffer.card(card, ev, clickHandler);
		}));

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
	focus() {
		const ss_key = wordId(this.w_basic_form, this.wt_name);
		if (!this.senseStates.get(ss_key)?.merged_with) {
			const cards = document.getElementsByClassName('entry');
			if (cards.length) {
				focusElem(cards[0]);
				return;
			}
		}

		for (const button of this.buttons) {
			if (!button.disabled) {
				focusElem(button);
				return;
			}
		}
	}
}

class MergeModal {
	constructor() {
		this.mergeModal = document.getElementById('mergeModal');
		this.modalTargetWord = document.getElementById('modalTargetWord');
		this.modalSelectedWord = document.getElementById('modalSelectedWord');
		this.modalSearchInput = document.getElementById('modalSearchInput');
		this.modalList = document.getElementById('modalList');
		this.modalCancel = document.getElementById('modalCancel');
		this.modalConfirm = document.getElementById('modalConfirm');

		this.modalItems = {};
		this.selectedWord = null;
		this.w_basic_form = null;
		this.wt_name = null;

		this.modalSearchInput.oninput = eventHandler(async ev => {
			await asyncHandler('MERGE MODAL SEARCH', async () => {
				const text = ev.target.value;
				const words = await CleanedBuffer.find(text);
				if (!words) throw new Error(`Failed to search word '${text}'`);

				const isTargetWord = word => word.w_basic_form === this.w_basic_form && word.wt_name === this.wt_name;
				const isMergedWord = word => {
					const ss_key = wordId(word);
					const senseState = buffer.senseStates.get(ss_key);

					return senseState && senseState.merged_with;
				};
				const filteredWords = words.filter(word => !isTargetWord(word) && !isMergedWord(word));

				this.renderModelItems(filteredWords);
			})
		});
		this.modalSearchInput.addEventListener('keydown', async ev => {
			KeydownHandlers.mergeModal.searchInput(ev);
		});
		this.modalCancel.onclick = eventHandler(() => {
			this.cancel();
		});
		this.modalConfirm.onclick = eventHandler(async () => {
			await this.confirm();
		});
		this.modalConfirm.disabled = true;
	}
	async open(w_basic_form, wt_name) {
		this.modalTargetWord.textContent = `${w_basic_form} [${wt_name}]`;
		this.modalSelectedWord.textContent = '';
		this.w_basic_form = w_basic_form;
		this.wt_name = wt_name;
		await asyncHandler('MERGE MODAL OPEN', async () => {
			const words = await CleanedBuffer.find();
			if (!words) throw new Error('Failed to open merge modal. Unable to find words');

			const isTargetWord = word => word.w_basic_form === this.w_basic_form && word.wt_name === this.wt_name;
			const getEntries = (word) => {
				const ss_key = wordId(word);
				const senseState = buffer.senseStates.get(ss_key);
				if (!senseState) return undefined;

				return JSON.parse(word.j_response).filter((_, i) => Array.from(senseState.state).sort().includes(i));
			}
			const [targetWord] = words.filter(isTargetWord);
			const targetEntries = getEntries(targetWord);

			const filteredWords = words.filter(word => !isTargetWord(word));
			const isMergedWord = word => {
				const ss_key = wordId(word);
				const senseState = buffer.senseStates.get(ss_key);
				return senseState && senseState.merged_with;
			}
			const isTopWord = word => {
				if (isMergedWord(word)) return false;

				const entries = getEntries(word);
				if (!entries) return false;

				return targetEntries.every(targetEntry => entries.some(entry => entry.slug === targetEntry.slug));
			};
			const topWords = filteredWords.filter(isTopWord);
			const sortedWords = [...topWords, ...filteredWords.filter(word => !isTopWord(word))];

			this.renderModelItems(sortedWords);

			if (!this.mergeModal.classList.contains('open')) this.mergeModal.classList.add('open');
			const cards = Object.values(this.modalItems);
			if (cards.length) {
				focusElem(cards[0]);
				cards[0].click();
			}
		});
	}
	cancel() {
		this.modalTargetWord.textContent = '';
		this.modalSelectedWord.textContent = '';
		this.modalSearchInput.value = '';
		this.modalList.innerHTML = '';
		this.modalItems = {};
		this.w_basic_form = null;
		this.wt_name = null;
		this.selectedWord = null;

		if (this.mergeModal.classList.contains('open')) this.mergeModal.classList.remove('open');

		focusElem(buffer.buttons[0]);
	}
	async confirm() {
		if (!this.selectedWord) return;

		const ss_key = wordId(this.w_basic_form, this.wt_name);
		const merged_with = wordId(this.selectedWord);
		const updatedSenseState = await buffer.senseStates.set(ss_key, { merged_with });
		if (!updatedSenseState) return;

		sidebar.renderSearchResults(sidebar.words);
		buffer.syncButtonState(ss_key);
		buffer.word = this.selectedWord;
		buffer.renderEntries(true);

		this.cancel();
	}
	renderModelItems(words) {
		this.modalList.innerHTML = '';
		this.modalItems = {};
		words.forEach(word => {
			const ss_key = wordId(word.w_basic_form, word.wt_name);
			this.modalItems[ss_key] = this.createModalItem(word);
			this.modalList.appendChild(this.modalItems[ss_key]);
		});
		const firstModalItem = Object.values(this.modalItems)?.[0];
		if (firstModalItem) firstModalItem.click();
	}
	createModalItem(word) {
		const card = createElement('div', 'modal-item');
		card.appendChild(createElement('div', 'modal-item-word', word.w_basic_form));
		card.appendChild(createElement('div', 'modal-item-type', word.wt_name));
		card.tabIndex = 0;
		const clickHandler = () => {
			const cards = document.getElementsByClassName('modal-item');
			if (!cards) return;

			this.selectedWord = word;
			this.modalSelectedWord.textContent = `${word.w_basic_form} [${word.wt_name}]`;
			this.modalConfirm.disabled = false;

			Object.values(cards).forEach(card => {
				if (card.classList.contains('selected')) card.classList.remove('selected');
			});

			card.classList.add('selected');
		};
		card.onclick = eventHandler(clickHandler);
		card.addEventListener('keydown', eventHandler(async ev => {
			await KeydownHandlers.mergeModal.card(card, ev, clickHandler);
		}));

		return card;
	}
}

const buffer = new Buffer();
const sidebar = new Sidebar();
const mergeModal = new MergeModal();

asyncHandler('MAIN INIT', async () => {
	await sidebar.load();
	await buffer.senseStates.load();
	const words = await asyncHandler('SIDEBAR INIT', async () => {
		const words = await CleanedBuffer.find();
		if (!words) throw new Error('Failed to initialize sidebar. Unable to find words');

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
});
