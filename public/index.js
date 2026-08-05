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

		buffer.setWord(word);
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
			switch (ev.key) { // Sidebar
				case 's':
					this.searchInput.focus();
					break;
				case 'j':
					focusElem(nextElem(card));
					break;
				case 'k':
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

		focusElem(cards[0]);
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
		const ss_key = wordId(this.w_basic_form, this.wt_name);

		const syncButtonState = (senseState) => {
			if (!senseState) return;

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
				if (!btnMergeWith.classList.contains('selected')) btnMergeWith.classList.add('selected');
				btnUnsure.disabled = true;
				return;
			}
			if (btnMergeWith.classList.contains('selected')) btnMergeWith.classList.remove('selected');
			btnUnsure.disabled = false

			if (unsure) {
				if (!btnUnsure.classList.contains('selected')) btnUnsure.classList.add('selected');
				return;
			}
			if (btnUnsure.classList.contains('selected')) btnUnsure.classList.remove('selected');
		}

		const btnMergeWith = createElement('button', 'header-btn', 'Merge with...');
		btnMergeWith.onclick = eventHandler(async () => {
			if (!this.initSenseState(ss_key)) return;


		});

		const btnUnsure = createElement('button', 'header-btn', 'Unsure');
		btnUnsure.onclick = eventHandler(async () => {
			if (!this.initSenseState(ss_key)) return;

			const unsure = !this.senseStates[ss_key].unsure;
			const updatedSenseState = await SenseState.update(ss_key, { unsure });
			if (!updatedSenseState) return;

			this.senseStates[ss_key].unsure = unsure;
			syncButtonState(this.senseStates[ss_key]);
		});

		const btnIgnore = createElement('button', 'header-btn', 'Ignore');
		btnIgnore.onclick = eventHandler(async () => {
			if (!this.initSenseState(ss_key)) return;

			const ignore = !this.senseStates[ss_key].ignore;
			const updatedSenseState = await SenseState.update(ss_key, { ignore });
			if (!updatedSenseState) return;

			this.senseStates[ss_key].ignore = ignore;
			syncButtonState(this.senseStates[ss_key]);
		});

		const buttons = [btnMergeWith, btnUnsure, btnIgnore]
		buttons.forEach(button => {
			button.tabIndex = 0;
		})

		syncButtonState(this.senseStates[ss_key]);

		return buttons;
	}
	async toggleEntry(card, i) {
		const ss_key = wordId(this.w_basic_form, this.wt_name);
		if (!this.initSenseState(ss_key)) return;

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
	createEntry(entry, i) {
		const card = createElement("div", "entry");
		card.appendChild(this.createEntryHeader(entry));
		card.appendChild(this.createJapaneseSection(entry.japanese));
		card.appendChild(this.createMeaningSection(entry.senses));
		const senseState = this.senseStates[wordId(this.w_basic_form, this.wt_name)];
		if (senseState?.state && senseState.state.has(i)) card.classList.add('selected');
		if (entry.tags.length > 0) card.appendChild(this.createDictionaryTags(entry.tags));

		const clickHandler = eventHandler(async () => {
			await this.toggleEntry(card, i);

			sidebar.renderSearchResults(sidebar.words);
		});
		card.onclick = clickHandler;
		card.tabIndex = 0;
		card.addEventListener('keydown', eventHandler(async ev => {
			switch (ev.key) { // Buffer Entry
				case 'j':
					focusElem(nextElem(card));
					break;
				case 'k':
					focusElem(prevElem(card));
					break;
				case 'Escape':
				case 'q':
				case 'l':
				case 'h':
					sidebar.focus();
					break;
				case 'Enter':
					await clickHandler(ev);
					if (!ev.shiftKey) {
						sidebar.focus();
					}
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
}

const buffer = new Buffer();
const sidebar = new Sidebar();

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
	buffer.setWord(word);
});
