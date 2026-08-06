import { SenseState, CleanedBuffer } from "./api.helper.js";
import { asyncHandler, eventHandler, createElement, wordId, nextElem, prevElem, focusElem, focusModifiedCard, focusUnmodifiedCard } from "./tools.helper.js";

class Sidebar {
	constructor() {
		this.searchInput = document.getElementById('searchInput')
		this.searchResults = document.getElementById('searchResults')

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
		this.searchInput.addEventListener('keydown', async ev => {
			if (['Enter', 'Escape'].includes(ev.key)) {
				const cards = document.getElementsByClassName('search-item');
				if (!cards || !cards.length) return;

				focusElem(cards[0]);
			}
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
		card.addEventListener('keydown', eventHandler(async ev => {
			const firstCard = () => document.getElementsByClassName('search-item')[0];
			const lastCard = () => {
				const cards = document.getElementsByClassName('search-item');
				return cards[cards.length - 1];
			}
			switch (ev.key) { // Sidebar
				case 's':
					this.searchInput.focus();
					break;
				case 'Home':
					focusElem(firstCard());
					break;
				case 'End':
					focusElem(lastCard());
					break;
				case 'j':
					if (!nextElem(card)) {
						focusElem(firstCard());
						break;
					}
					focusElem(nextElem(card));
					break;
				case 'k':
					if (!prevElem(card)) {
						focusElem(lastCard());
						break;
					}
					focusElem(prevElem(card));
					break;
				case 'l':
				case 'h':
					buffer.focus();
					break;
				case 'w':
				case 'e':
					focusUnmodifiedCard(card, nextElem);
					break;
				case 'W':
				case 'E':
					focusModifiedCard(card, nextElem);
					break;
				case 'b':
					focusUnmodifiedCard(card, prevElem);
					break;
				case 'B':
					focusModifiedCard(card, prevElem);
					break;
				case 'Enter':
					card.click();
					buffer.focus();
					break;
			}
		}));

		return card;
	}
	createSearchWord(word) {
		return createElement('div', 'search-word', word);
	}
	createSearchWordType(wordType) {
		return createElement('div', 'search-word-type', wordType);
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

		this.senseStates = {};
	}
	async loadSenses() {
		const senseStates = await SenseState.findAll();
		if (!senseStates || !senseStates.length) {
			this.senseStates = {};
			return;
		}

		for (const { ss_key, state, unsure, ignore, merged_with } of senseStates) {
			this.senseStates[ss_key] = { state: new Set(JSON.parse(state)), unsure, ignore, merged_with };
		}
	}
	async initSenseState(ss_key) {
		if (!this.senseStates[ss_key]) {
			const createdSenseState = await SenseState.create({ ss_key });
			if (!createdSenseState) return false;

			this.senseStates[ss_key] = SenseState.init();
		}

		return true
	}
	async setWord(word) {
		const ss_key = wordId(word);
		this.w_basic_form = word.w_basic_form;
		this.token_ids = word.token_ids;
		this.wt_name = word.wt_name;
		this.occurrence_count = word.count;
		this.entry_count = JSON.parse(word.j_response).length;

		this.renderHeader();
		if (this.senseStates[ss_key]?.merged_with) {
			this.container.innerHTML = '';
			const [w_basic_form, wt_name] = this.senseStates[ss_key]?.merged_with.split('_');
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
		this.wordType.textContent = this.wt_name;
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
	syncButtonState(ss_key) {
		const senseState = this.senseStates[ss_key];
		if (!senseState) return;

		const [btnMergeWith, btnUnsure, btnIgnore] = this.buttons;
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

		const btnMergeWith = createElement('button', 'header-btn', 'Merge');
		btnMergeWith.onclick = eventHandler(async () => {
			if (!(await this.initSenseState(ss_key))) return;

			if (this.senseStates[ss_key].merged_with) {
				const merged_with = null;
				const updatedSenseState = await SenseState.update(ss_key, { merged_with });
				if (!updatedSenseState) return;

				this.senseStates[ss_key].merged_with = merged_with;
				sidebar.renderSearchResults(sidebar.words);
				this.syncButtonState(ss_key);
				this.word = sidebar.selectedWord;
				this.renderEntries();
				focusElem(btnMergeWith);
				this.focus();
				return;
			}

			focusElem(btnMergeWith);
			this.focus();
			await mergeModal.open(this.w_basic_form, this.wt_name);
		});

		const btnUnsure = createElement('button', 'header-btn', 'Unsure');
		btnUnsure.onclick = eventHandler(async () => {
			if (!(await this.initSenseState(ss_key))) return;

			const unsure = !this.senseStates[ss_key].unsure;
			const updatedSenseState = await SenseState.update(ss_key, { unsure });
			if (!updatedSenseState) return;

			this.senseStates[ss_key].unsure = unsure;
			this.syncButtonState(ss_key);
			focusElem(btnUnsure);
			this.focus()
		});

		const btnIgnore = createElement('button', 'header-btn', 'Ignore');
		btnIgnore.onclick = eventHandler(async () => {
			if (!(await this.initSenseState(ss_key))) return;

			const ignore = !this.senseStates[ss_key].ignore;
			const updatedSenseState = await SenseState.update(ss_key, { ignore });
			if (!updatedSenseState) return;

			this.senseStates[ss_key].ignore = ignore;
			sidebar.renderSearchResults(sidebar.words);
			this.syncButtonState(ss_key);
			focusElem(btnIgnore); // Ensure button is visible
			this.focus();
		});

		this.buttons = [btnMergeWith, btnUnsure, btnIgnore];
		this.buttons.forEach(button => {
			button.tabIndex = 0;
			button.addEventListener('keydown', eventHandler(async ev => {
				const canFocus = (button) => {
					if (!button || button.disabled) return false;
					return true;
				}
				switch (ev.key) { // Buffer buttons
					case 'j':
						if (!canFocus(nextElem(button))) {
							const cards = document.getElementsByClassName('entry');
							if (!cards) break;

							focusElem(cards[0]);
							break;
						}
						focusElem(nextElem(button));
						break;
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
						await this.keyDownHandler(ev);
						break;
				}
			}));
		})

		this.syncButtonState(ss_key);

		return this.buttons;
	}
	async toggleEntry(card, i) {
		const ss_key = wordId(this.w_basic_form, this.wt_name);
		if (!(await this.initSenseState(ss_key))) return;

		const state = new Set(this.senseStates[ss_key].state);

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
	createEntry(entry, i, disabled) {
		const card = createElement("div", "entry");
		card.appendChild(this.createEntryHeader(entry));
		card.appendChild(this.createJapaneseSection(entry.japanese));
		card.appendChild(this.createMeaningSection(entry.senses));
		const senseState = this.senseStates[wordId(this.word)];
		if (senseState?.state && senseState.state.has(i)) card.classList.add('selected');
		if (entry.tags.length > 0) card.appendChild(this.createDictionaryTags(entry.tags));

		if (disabled) {
			card.classList.add('disabled');
			return card;
		}

		const clickHandler = eventHandler(async () => {
			await this.toggleEntry(card, i);

			sidebar.renderSearchResults(sidebar.words);
		});
		card.onclick = clickHandler;
		card.tabIndex = 0;
		card.addEventListener('keydown', eventHandler(async ev => {
			switch (ev.key) { // Buffer entry
				case 'j':
					if (!nextElem(card)) {
						for (let i = this.buttons.length - 1; i >= 0; i--) {
							if (!this.buttons[i].disabled) focusElem(this.buttons[i]);
						}
						break;
					}
					focusElem(nextElem(card));
					break;
				case 'k':
					if (!prevElem(card)) {
						for (let i = 0; i < this.buttons.length; i++) {
							if (!this.buttons[i].disabled) focusElem(this.buttons[i]);
						}
						break;
					}
					focusElem(prevElem(card));
					break;
				case 'Enter':
					await clickHandler(ev);
					if (!ev.shiftKey) {
						sidebar.focus();
					}
					break;
				default:
					await this.keyDownHandler(ev);
					break;
			}
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
		if (!this.senseStates[ss_key]?.merged_with) {
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
	async keyDownHandler(ev) {
		switch (ev.key) {
			case 'Escape':
			case 'q':
			case 'l':
			case 'h':
				sidebar.focus();
				break;
			case 'm':
				if (!this.buttons[0].disabled) {
					this.buttons[0].click();
				}
				break;
			case 'u':
				if (!this.buttons[1].disabled) {
					this.buttons[1].click();
				}
				break;
			case 'i':
				if (!this.buttons[2].disabled) {
					this.buttons[2].click();
				}
				break;
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

				this.renderModelItems(words);
			})
		});
		this.modalSearchInput.addEventListener('keydown', async ev => {
			if (['Enter', 'Escape'].includes(ev.key)) {
				const cards = Object.values(this.modalItems);
				if (cards.length) focusElem(cards[0]);
			}
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

			this.renderModelItems(words);

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
		const updatedSenseState = await SenseState.update(ss_key, { merged_with });
		if (!updatedSenseState) return;

		buffer.senseStates[ss_key].merged_with = merged_with;
		sidebar.renderSearchResults(sidebar.words);
		buffer.syncButtonState(ss_key);
		buffer.word = this.selectedWord;
		buffer.renderEntries(true);

		this.cancel();
	}
	renderModelItems(words) {
		this.modalList.innerHTML = '';
		this.modalItems = {};
		words.filter(word => word.w_basic_form !== this.w_basic_form || word.wt_name !== this.wt_name).forEach(word => {
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
		const clickHandler = eventHandler(async () => {
			const cards = document.getElementsByClassName('modal-item');
			if (!cards) return;

			this.selectedWord = word;
			this.modalSelectedWord.textContent = `${word.w_basic_form} [${word.wt_name}]`;
			this.modalConfirm.disabled = false;

			Object.values(cards).forEach(card => {
				if (card.classList.contains('selected')) card.classList.remove('selected');
			});

			card.classList.add('selected');
		});
		card.onclick = clickHandler
		card.addEventListener('keydown', eventHandler(async ev => {
			switch (ev.key) { // Merge modal
				case 's':
					this.modalSearchInput.focus();
					break;
				case 'j':
					focusElem(nextElem(card));
					break;
				case 'k':
					focusElem(prevElem(card));
					break;
				case 'q':
				case 'Escape':
					this.cancel();
					break
				case 'Enter':
					if (ev.ctrlKey) {
						await this.confirm();
						break;
					}
					clickHandler(ev);
					break;
			}
		}));

		return card;
	}
}

const buffer = new Buffer();
const sidebar = new Sidebar();
const mergeModal = new MergeModal();

asyncHandler('MAIN INIT', async () => {
	await buffer.loadSenses()
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
