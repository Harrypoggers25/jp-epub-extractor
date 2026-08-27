import { UnsureEntryState, UnsureWordBuffer } from "./api.helper.js";
import { asyncHandler, createElement, eventHandler, focusable, setClass, wordId } from "./tools.helper.js";

const getPermanentWordTargetId = word => `${word.w_basic_form}_${word.wt_name}`;

const KeydownHandlers = {
	sidebar: {
		searchInput: ev => {
			if (ev.key === 'Enter' || ev.key === 'Escape') {
				ev.preventDefault();
				sidebar.focus();
			}
		},
		card: async (card, wordBuffer, ev) => {
			switch (ev.key) {
				case 's': ev.preventDefault(); sidebar.elems.searchInput.focus(); break;
				case 'g':
				case 'Home': ev.preventDefault(); sidebar.focusCard(sidebar.getCards()[0]); break;
				case 'G':
				case 'End': {
					const cards = sidebar.getCards();
					ev.preventDefault();
					sidebar.focusCard(cards[cards.length - 1]);
					break;
				}
				case 'j':
				case 'J':
				case 'ArrowDown': ev.preventDefault(); sidebar.focusNextCard(card, 1); break;
				case 'k':
				case 'K':
				case 'ArrowUp': ev.preventDefault(); sidebar.focusNextCard(card, -1); break;
				case 'Enter':
				case ' ': ev.preventDefault(); await sidebar.selectWord(wordBuffer, true, true); break;
				case 'i': ev.preventDefault(); await buffer.toggleIgnore(); break;
				case 'm': ev.preventDefault(); await buffer.toggleMerge(); break;
				case 'c': ev.preventDefault(); sidebar.elems.btnConfirm.focus(); break;
			}
		},
		confirm: ev => {
			switch (ev.key) {
				case 'Escape':
				case 'q':
				case 'c': ev.preventDefault(); sidebar.focus(); break;
				case 'Enter':
				case ' ': ev.preventDefault(); confirmOverlay.open(); break;
			}
		}
	},
	buffer: {
		entry: async (card, index, ev) => {
			switch (ev.key) {
				case 'g':
				case 'Home': ev.preventDefault(); buffer.focusEntry(buffer.getEntries()[0]); break;
				case 'G':
				case 'End': {
					const cards = buffer.getEntries();
					ev.preventDefault();
					buffer.focusEntry(cards[cards.length - 1]);
					break;
				}
				case 'j':
				case 'J': ev.preventDefault(); buffer.focusNextEntry(card, 1); break;
				case 'k':
				case 'K': ev.preventDefault(); buffer.focusNextEntry(card, -1); break;
				case 'ArrowDown': ev.preventDefault(); buffer.scrollEntries(1); break;
				case 'ArrowUp': ev.preventDefault(); buffer.scrollEntries(-1); break;
				case 'Enter':
				case ' ': ev.preventDefault(); await buffer.toggleEntry(index); break;
				case 'i': ev.preventDefault(); await buffer.toggleIgnore(); break;
				case 'm': ev.preventDefault(); await buffer.toggleMerge(); break;
				case 'c': ev.preventDefault(); sidebar.elems.btnConfirm.focus(); break;
			}
		},
		button: (button, ev) => {
			switch (ev.key) {
				case 'Enter':
				case ' ': ev.preventDefault(); button.click(); break;
				case 'j':
				case 'ArrowDown': ev.preventDefault(); buffer.focusEntry(buffer.getEntries()[0]); break;
				case 'k':
				case 'ArrowUp': ev.preventDefault(); sidebar.focus(); break;
			}
		}
	},
	mergeModal: {
		searchInput: ev => {
			if (ev.key === 'Enter') {
				ev.preventDefault();
				mergeModal.focusFirstCandidate();
			}
			if (ev.key === 'Escape' || ev.key === 'q') {
				ev.preventDefault();
				mergeModal.close();
			}
		},
		card: (card, ev) => {
			switch (ev.key) {
				case 's': ev.preventDefault(); mergeModal.elems.searchInput.focus(); break;
				case 'j':
				case 'ArrowDown': ev.preventDefault(); mergeModal.focusNextCandidate(card, 1); break;
				case 'k':
				case 'ArrowUp': ev.preventDefault(); mergeModal.focusNextCandidate(card, -1); break;
				case 'Escape':
				case 'q':
				case 'm': ev.preventDefault(); mergeModal.close(); break;
				case 'Enter':
				case ' ': ev.preventDefault(); if (ev.ctrlKey) mergeModal.confirm(); else card.click(); break;
			}
		}
	}
}

class EntryStates {
	constructor() {
		this.entryStates = {};
	}
	set(entryStates) {
		this.entryStates = Object.fromEntries(entryStates.map(entryState => [entryState.es_id, entryState]));
	}
	setOne(entryState) {
		if (entryState) this.entryStates[entryState.es_id] = entryState;
	}
	get(es_id) {
		return this.entryStates[es_id];
	}
	async update(es_id, body) {
		const entryState = await UnsureEntryState.update(es_id, body);
		if (!entryState) return;

		this.entryStates[es_id] = entryState;
		return entryState;
	}
	async merge(source_es_id, target_es_id) {
		const entryStates = await UnsureEntryState.merge(source_es_id, target_es_id);
		if (!entryStates) return;

		for (const entryState of Array.isArray(entryStates) ? entryStates : [entryStates]) this.setOne(entryState);
		return entryStates;
	}
	async unmerge(source_es_id) {
		const entryStates = await UnsureEntryState.unmerge(source_es_id);
		if (!entryStates) return;

		for (const entryState of Array.isArray(entryStates) ? entryStates : [entryStates]) this.setOne(entryState);
		return entryStates;
	}
	verify(wordBuffers) {
		return wordBuffers.every(wordBuffer => {
			const entryState = this.get(wordId(wordBuffer));
			return entryState && !entryState.state_invalid && (entryState.state.size || entryState.ignore || entryState.merged_with);
		});
	}
}

class Sidebar {
	constructor() {
		this.elems = {
			searchInput: document.getElementById('unsureSearchInput'),
			searchResults: document.getElementById('unsureSearchResults'),
			searchResultCount: document.getElementById('unsureSearchResultCount'),
			btnConfirm: document.getElementById('btnConfirm'),
		}

		this.allWordBuffers = [];
		this.wordBuffers = [];
		this.selected = null;
		this.searchRequestId = 0;
		this.searchError = false;
		this.elems.searchInput.oninput = async ev => await this.search(ev.target.value);
		this.elems.searchInput.addEventListener('keydown', KeydownHandlers.sidebar.searchInput);
		this.elems.btnConfirm.onclick = eventHandler(() => confirmOverlay.open());
		this.elems.btnConfirm.addEventListener('keydown', KeydownHandlers.sidebar.confirm);
	}
	set(wordBuffers) {
		this.allWordBuffers = wordBuffers;
		this.wordBuffers = wordBuffers;
		this.elems.searchInput.disabled = !wordBuffers.length;
	}
	async search(text) {
		const requestId = ++this.searchRequestId;
		const w_basic_form = text.trim();
		if (!w_basic_form) {
			this.wordBuffers = this.allWordBuffers;
			this.searchError = false;
			this.renderSearchResults();
			return;
		}

		const wordBuffers = await UnsureWordBuffer.findMany(w_basic_form);
		if (requestId !== this.searchRequestId) return;
		if (!wordBuffers) {
			this.wordBuffers = this.allWordBuffers;
			this.searchError = true;
			this.renderSearchResults();
			return;
		}

		this.wordBuffers = wordBuffers;
		this.searchError = false;
		this.renderSearchResults();
	}
	async selectWord(wordBuffer, focus = true, focusContent = false) {
		const selectedId = wordId(wordBuffer);
		const previous = this.selected;
		this.selected = wordBuffer;
		this.renderSearchResults();
		const card = this.getCard(wordBuffer);
		if (focus) card?.focus({ preventScroll: true });
		buffer.renderLoading();
		const [selectedWord, entryState] = await Promise.all([
			UnsureWordBuffer.find(wordBuffer.w_basic_form, wordBuffer.wt_name),
			UnsureEntryState.find(selectedId),
		]);
		if (wordId(this.selected ?? {}) !== selectedId) return;
		if (!selectedWord || !entryState) {
			this.selected = previous;
			this.renderSearchResults();
			if (previous) {
				await buffer.setWord(previous);
				if (focus) this.getCard(previous)?.focus({ preventScroll: true });
			} else buffer.renderError();
			return;
		}

		this.selected = selectedWord;
		this.allWordBuffers = this.allWordBuffers.map(item => wordId(item) === selectedId ? selectedWord : item);
		this.wordBuffers = this.wordBuffers.map(item => wordId(item) === selectedId ? selectedWord : item);
		entryStates.setOne(entryState);
		this.renderSearchResults();
		if (focus) this.getCard(selectedWord)?.focus({ preventScroll: true });
		await buffer.setWord(selectedWord, focusContent);
	}
	renderLoading() {
		this.elems.searchInput.disabled = true;
		this.elems.searchResults.innerHTML = '';
		this.elems.searchResults.appendChild(this.createState('Loading unsure words...'));
		this.elems.searchResultCount.textContent = '';
		this.syncConfirm();
	}
	renderError() {
		this.elems.searchInput.disabled = false;
		this.elems.searchResults.innerHTML = '';
		this.elems.searchResults.appendChild(this.createState('Unable to load unsure words', 'error'));
		this.elems.searchResultCount.textContent = '';
		this.syncConfirm();
	}
	renderSearchResults() {
		setClass(this.elems.searchInput, 'error', this.searchError);
		this.elems.searchResults.innerHTML = '';
		if (!this.wordBuffers.length) {
			this.elems.searchResults.appendChild(this.createState('No unsure words'));
			this.elems.searchResultCount.textContent = '0 / 0';
			this.syncConfirm();
			return;
		}

		for (let i = 0; i < this.wordBuffers.length; i++) this.elems.searchResults.appendChild(this.createSearchItem(i + 1, this.wordBuffers[i]));
		const selectedIndex = this.wordBuffers.findIndex(wordBuffer => wordId(wordBuffer) === wordId(this.selected ?? {}));
		if (selectedIndex >= 0) this.setResultCount(selectedIndex + 1);
		else this.setResultCount(0);
		this.syncConfirm();
	}
	createState(text, className = '') {
		const state = createElement('div', `unsure-sidebar-state ${className}`);
		state.textContent = text;
		state.setAttribute('role', className === 'error' ? 'alert' : 'status');
		return state;
	}
	createSearchItem(index, wordBuffer) {
		const card = createElement('div', 'unsure-search-item');
		card.dataset.id = wordId(wordBuffer);
		if (wordId(wordBuffer) === wordId(this.selected ?? {})) card.classList.add('active');
		const entryState = entryStates.get(wordId(wordBuffer));
		if (!entryState || entryState.state_invalid) card.classList.add('inconsistent');
		if (entryState?.ignore) card.classList.add('ignore');
		if (entryState?.merged_with) card.classList.add('merged');

		const contents = createElement('div', 'unsure-search-item-contents');
		contents.appendChild(createElement('div', 'unsure-search-word', wordBuffer.w_basic_form));
		contents.appendChild(createElement('div', 'unsure-search-word-type', wordBuffer.wt_name));
		card.appendChild(contents);
		card.onclick = eventHandler(async () => await this.selectWord(wordBuffer));
		card.addEventListener('keydown', ev => KeydownHandlers.sidebar.card(card, wordBuffer, ev));
		card.onfocus = () => this.setResultCount(index);
		card.onmouseenter = () => this.setResultCount(index);
		focusable(card);
		return card;
	}
	getCards() {
		return Array.from(this.elems.searchResults.getElementsByClassName('unsure-search-item'));
	}
	getCard(wordBuffer) {
		if (!wordBuffer) return;
		return this.getCards().find(card => card.dataset.id === wordId(wordBuffer));
	}
	focusCard(card) {
		if (card) card.focus({ preventScroll: true });
	}
	focusNextCard(card, direction) {
		const cards = this.getCards();
		if (!cards.length) return;
		const index = cards.indexOf(card);
		this.focusCard(cards[(index + direction + cards.length) % cards.length]);
	}
	setResultCount(index) {
		this.elems.searchResultCount.textContent = `${index} / ${this.wordBuffers.length}`;
	}
	focus() {
		this.focusCard(this.getCard(this.selected) ?? this.getCards()[0]);
	}
	syncConfirm() {
		this.elems.btnConfirm.disabled = confirmOverlay?.isConfirming || !this.allWordBuffers.length || !entryStates.verify(this.allWordBuffers);
	}
}

class Buffer {
	constructor() {
		this.elems = { content: document.getElementById('unsureReviewContent'), entries: null, mergeCount: null, mergeWith: null, btnMerge: null, btnIgnore: null };
		this.selected = null;
		this.candidates = { top: [], bottom: [] };
		this.candidateRequestId = 0;
	}
	async setWord(wordBuffer, focus = false) {
		this.candidateRequestId += 1;
		this.selected = wordBuffer;
		this.candidates = { top: [], bottom: [] };
		this.renderWord();
		if (focus) this.focusEntry(this.getEntries()[0]);
	}
	getEntryState() {
		return this.selected ? entryStates.get(wordId(this.selected)) : undefined;
	}
	isEditable() {
		const entryState = this.getEntryState();
		return entryState && !entryState.state_invalid && !entryState.ignore && !entryState.merged_with && !this.selected.j_response_invalid;
	}
	renderLoading() {
		this.renderState('Loading unsure word...');
	}
	renderEmpty() {
		this.renderState('No unsure words', 'There are no unsure words to review.');
	}
	renderError() {
		this.renderState('Unable to load unsure word', 'Please try again.', 'error');
	}
	renderState(title, message, className = '') {
		this.elems.content.innerHTML = '';
		this.elems.entries = null;
		const state = createElement('div', `unsure-review-state ${className}`);
		state.setAttribute('role', className === 'error' ? 'alert' : 'status');
		state.appendChild(createElement('h2', null, title));
		if (message) state.appendChild(createElement('span', null, message));
		this.elems.content.appendChild(state);
	}
	renderWord() {
		if (!this.selected) return this.renderEmpty();
		const entryState = this.getEntryState();
		if (!entryState || entryState.state_invalid) return this.renderState('Inconsistent unsure record', 'This unsure word has no usable UnsureEntryState and cannot be edited.', 'error');

		const { w_basic_form, wt_name, occurrence_count, w_character_type, token_ids, j_response, j_response_invalid } = this.selected;
		this.elems.content.innerHTML = '';
		const header = createElement('div', 'unsure-word-header');
		const headerTop = createElement('div', 'unsure-word-header-top');
		headerTop.appendChild(createElement('h2', null, w_basic_form));
		const actions = createElement('div', 'unsure-word-actions');
		const btnMerge = createElement('button', 'header-btn', entryState.merged_with ? 'Unmerge' : 'Merge');
		const btnIgnore = createElement('button', 'header-btn', 'Ignore');
		const btnReturn = createElement('a', 'header-btn', 'Return');
		btnReturn.href = '/';
		btnMerge.onclick = eventHandler(async () => await this.toggleMerge());
		btnIgnore.onclick = eventHandler(async () => await this.toggleIgnore());
		[btnMerge, btnIgnore].forEach(button => button.addEventListener('keydown', ev => KeydownHandlers.buffer.button(button, ev)));
		actions.append(btnMerge, btnIgnore, btnReturn);
		headerTop.appendChild(actions);
		header.appendChild(headerTop);
		const meta = createElement('div', 'meta');
		meta.appendChild(createElement('div', 'badge', `Type: ${wt_name}`));
		meta.appendChild(createElement('div', 'badge', `Occurrences: ${occurrence_count}`));
		meta.appendChild(createElement('div', 'badge', `Character type: ${w_character_type}`));
		meta.appendChild(createElement('div', 'badge', `Tokens: ${token_ids}`));
		header.appendChild(meta);
		const status = createElement('div', 'meta unsure-word-status');
		const mergeCount = createElement('div', 'badge hidden');
		const mergeWith = createElement('div', 'badge hidden');
		status.append(mergeCount, mergeWith);
		header.appendChild(status);
		this.elems.mergeCount = mergeCount;
		this.elems.mergeWith = mergeWith;
		this.elems.btnMerge = btnMerge;
		this.elems.btnIgnore = btnIgnore;
		this.elems.content.appendChild(header);
		const entries = createElement('div', 'unsure-entries');
		if (j_response_invalid) entries.appendChild(this.createEntriesState('Dictionary entries could not be read', 'error'));
		else if (!j_response.length) entries.appendChild(this.createEntriesState('No dictionary entries available'));
		else j_response.forEach((entry, index) => entries.appendChild(this.createEntry(entry, index)));
		this.elems.entries = entries;
		this.elems.content.appendChild(entries);
		this.syncActionState();
	}
	renderMergeStatus() {
		const entryState = this.getEntryState();
		if (!entryState || !this.elems.mergeCount || !this.elems.mergeWith) return;
		setClass(this.elems.mergeCount, 'hidden', true);
		setClass(this.elems.mergeWith, 'hidden', true);
		if (entryState.merged_with) {
			this.elems.mergeWith.textContent = `Merged with: ${entryState.merged_with}`;
			setClass(this.elems.mergeWith, 'hidden', false);
		} else if (this.candidates.top.length) {
			this.elems.mergeCount.textContent = `Merge possibilities: ${this.candidates.top.length}`;
			setClass(this.elems.mergeCount, 'hidden', false);
		}
	}
	syncActionState() {
		const entryState = this.getEntryState();
		if (!entryState || !this.elems.btnMerge || !this.elems.btnIgnore) return;
		setClass(this.elems.btnIgnore, 'success', entryState.ignore);
		setClass(this.elems.btnMerge, 'selected', Boolean(entryState.merged_with));
		this.elems.btnMerge.textContent = entryState.merged_with ? 'Unmerge' : 'Merge';
		this.elems.btnIgnore.textContent = 'Ignore';
		this.elems.btnIgnore.disabled = Boolean(entryState.merged_with);
		this.elems.btnMerge.disabled = entryState.ignore || (!entryState.merged_with && !entryState.state.size);
		this.renderMergeStatus();
	}
	async transformCandidates() {
		const entryState = this.getEntryState();
		const requestId = ++this.candidateRequestId;
		if (!this.selected || !entryState || entryState.ignore || entryState.merged_with || !entryState.state.size || this.selected.j_response_invalid) {
			this.candidates = { top: [], bottom: [] };
			this.syncActionState();
			return;
		}

		const transformed = await UnsureWordBuffer.transform(this.selected.w_basic_form, this.selected.wt_name, { state: entryState.state });
		if (requestId !== this.candidateRequestId || !transformed) return;
		this.candidates = { top: transformed.top ?? [], bottom: transformed.bottom ?? [] };
		this.syncActionState();
		return this.candidates;
	}
	async toggleEntry(index) {
		if (!this.isEditable() || index < 0 || index >= this.selected.j_response.length) return;
		const selectedId = wordId(this.selected);
		const state = new Set(this.getEntryState().state);
		if (state.has(index)) state.delete(index);
		else state.add(index);
		const updatedEntryState = await entryStates.update(selectedId, { state });
		if (!updatedEntryState || wordId(this.selected ?? {}) !== selectedId) return;

		this.renderWord();
		sidebar.renderSearchResults();
		this.focusEntry(this.getEntries()[index] ?? this.getEntries()[0]);
	}
	async toggleIgnore() {
		const entryState = this.getEntryState();
		if (!entryState || entryState.merged_with) return;
		const selectedId = wordId(this.selected);
		const updatedEntryState = await entryStates.update(selectedId, { ignore: !entryState.ignore });
		if (!updatedEntryState || wordId(this.selected ?? {}) !== selectedId) return;

		this.renderWord();
		sidebar.renderSearchResults();
		this.elems.btnIgnore?.focus({ preventScroll: true });
	}
	async toggleMerge() {
		const entryState = this.getEntryState();
		if (!entryState || entryState.ignore) return;
		const selectedId = wordId(this.selected);
		if (entryState.merged_with) {
			const updatedEntryState = await entryStates.unmerge(selectedId);
			if (!updatedEntryState || wordId(this.selected ?? {}) !== selectedId) return;
			this.renderWord();
			sidebar.renderSearchResults();
			this.elems.btnMerge?.focus({ preventScroll: true });
			return;
		}
		await mergeModal.open();
	}
	createEntriesState(text, className = '') {
		const state = createElement('div', `unsure-entries-state ${className}`, text);
		state.setAttribute('role', className === 'error' ? 'alert' : 'status');
		return state;
	}
	createEntry(entry, index) {
		const card = createElement('article', 'entry unsure-entry');
		const entryState = this.getEntryState();
		const disabled = !this.isEditable();
		if (entryState.state.has(index)) card.classList.add('selected');
		if (disabled) card.classList.add('disabled');
		const japanese = Array.isArray(entry?.japanese) ? entry.japanese : [];
		const senses = Array.isArray(entry?.senses) ? entry.senses : [];
		const tags = Array.isArray(entry?.tags) ? entry.tags : [];
		card.appendChild(this.createEntryHeader(entry));
		if (japanese.length) card.appendChild(this.createJapaneseSection(japanese));
		if (senses.length) card.appendChild(this.createMeaningSection(senses));
		if (tags.length) card.appendChild(this.createDictionaryTags(tags));
		if (!japanese.length && !senses.length && !tags.length) card.appendChild(this.createEntriesState('No dictionary entry details available'));
		if (!disabled) card.onclick = eventHandler(async () => await this.toggleEntry(index));
		card.addEventListener('keydown', ev => KeydownHandlers.buffer.entry(card, index, ev));
		focusable(card);
		return card;
	}
	createEntryHeader(entry) {
		const header = createElement('div', 'entry-header');
		const badges = createElement('div');
		if (entry?.is_common) badges.appendChild(this.createBadge('Common', 'common'));
		if (entry?.jlpt) badges.appendChild(this.createBadge(entry.jlpt, 'jlpt'));
		header.append(createElement('div', 'slug', entry?.slug ?? '—'), badges);
		return header;
	}
	createJapaneseSection(japaneseWords) {
		const section = this.createSection('Forms');
		japaneseWords.forEach(word => section.appendChild(this.createJapaneseWord(word)));
		return section;
	}
	createJapaneseWord(word) {
		const wrapper = createElement('div', 'word');
		wrapper.appendChild(createElement('strong', null, word?.word ?? '—'));
		wrapper.appendChild(createElement('span', null, word?.reading ?? '—'));
		return wrapper;
	}
	createMeaningSection(senses) {
		const section = this.createSection('Meanings');
		senses.forEach(sense => section.appendChild(this.createSense(sense)));
		return section;
	}
	createSense(sense) {
		const wrapper = createElement('div', 'sense');
		const definitions = Array.isArray(sense?.english_definitions) ? sense.english_definitions : [];
		const partsOfSpeech = Array.isArray(sense?.parts_of_speech) ? sense.parts_of_speech : [];
		const tags = Array.isArray(sense?.tags) ? sense.tags : [];
		wrapper.appendChild(createElement('div', 'definitions', definitions.length ? definitions.join(', ') : '—'));
		if (partsOfSpeech.length) wrapper.appendChild(this.createTagContainer(partsOfSpeech));
		if (tags.length) wrapper.appendChild(this.createTagContainer(tags));
		return wrapper;
	}
	createDictionaryTags(tags) {
		const section = this.createSection('Dictionary Tags');
		section.appendChild(this.createTagContainer(tags));
		return section;
	}
	createTagContainer(tags) {
		const container = createElement('div', 'tags');
		tags.forEach(tag => container.appendChild(this.createTag(tag)));
		return container;
	}
	createTag(text) {
		return createElement('span', 'tag', text);
	}
	createBadge(text, className) {
		return createElement('span', className, text);
	}
	createSection(title) {
		const section = createElement('div', 'section');
		section.appendChild(createElement('h3', null, title));
		return section;
	}
	getEntries() {
		return this.elems.entries ? Array.from(this.elems.entries.getElementsByClassName('unsure-entry')) : [];
	}
	focusEntry(card) {
		if (!card || !this.elems.entries) return;
		card.focus({ preventScroll: true });
		const cardRect = card.getBoundingClientRect();
		const entriesRect = this.elems.entries.getBoundingClientRect();
		this.elems.entries.scrollTo({ top: this.elems.entries.scrollTop + cardRect.top - entriesRect.top - 12, behavior: 'smooth' });
	}
	focusNextEntry(card, direction) {
		const cards = this.getEntries();
		if (!cards.length) return;
		const index = cards.indexOf(card);
		this.focusEntry(cards[(index + direction + cards.length) % cards.length]);
	}
	scrollEntries(direction) {
		if (this.elems.entries) this.elems.entries.scrollBy({ top: direction * this.elems.entries.clientHeight * .25, behavior: 'smooth' });
	}
	focus() {
		this.focusEntry(this.getEntries().find(card => card.classList.contains('selected')) ?? this.getEntries()[0]);
	}
}

class MergeModal {
	constructor() {
		this.elems = {
			overlay: document.getElementById('mergeModal'),
			target: document.getElementById('mergeModalTargetWord'),
			selected: document.getElementById('mergeModalSelectedWord'),
			searchInput: document.getElementById('mergeModalSearchInput'),
			list: document.getElementById('mergeModalList'),
			cancel: document.getElementById('mergeModalCancel'),
			confirm: document.getElementById('mergeModalConfirm'),
		}
		this.candidates = { top: [], bottom: [] };
		this.selected = null;
		this.opener = null;
		this.elems.searchInput.oninput = () => this.renderCandidates();
		this.elems.searchInput.addEventListener('keydown', KeydownHandlers.mergeModal.searchInput);
		this.elems.cancel.onclick = eventHandler(() => this.close());
		this.elems.confirm.onclick = eventHandler(async () => await this.confirm());
		this.elems.overlay.onclick = eventHandler(ev => {
			if (ev.target === this.elems.overlay) this.close();
		});
	}
	async open() {
		this.opener = buffer.elems.btnMerge;
		this.elems.target.textContent = `${buffer.selected.w_basic_form} [${buffer.selected.wt_name}]`;
		this.elems.selected.textContent = '';
		this.elems.searchInput.value = '';
		this.elems.searchInput.disabled = true;
		this.selected = null;
		this.elems.confirm.disabled = true;
		this.renderLoading();
		setClass(this.elems.overlay, 'open', true);
		const candidates = await buffer.transformCandidates();
		if (!candidates) {
			this.close();
			return;
		}
		if (!this.elems.overlay.classList.contains('open')) return;
		this.candidates = buffer.candidates;
		this.elems.searchInput.disabled = false;
		this.renderCandidates();
		this.focusFirstCandidate();
	}
	close() {
		setClass(this.elems.overlay, 'open', false);
		this.elems.target.textContent = '';
		this.elems.selected.textContent = '';
		this.elems.searchInput.value = '';
		this.elems.searchInput.disabled = false;
		this.elems.list.innerHTML = '';
		this.candidates = { top: [], bottom: [] };
		this.selected = null;
		this.elems.confirm.disabled = true;
		this.opener?.focus({ preventScroll: true });
	}
	renderLoading() {
		this.elems.list.innerHTML = '';
		this.elems.list.appendChild(createElement('div', 'modal-candidate-empty', 'Loading merge candidates...'));
	}
	async confirm() {
		if (!this.selected || !buffer.selected) return;
		const updatedEntryStates = await entryStates.merge(wordId(buffer.selected), getPermanentWordTargetId(this.selected));
		if (!updatedEntryStates) return;
		buffer.renderWord();
		sidebar.renderSearchResults();
		this.close();
		buffer.elems.btnMerge?.focus({ preventScroll: true });
	}
	getVisibleCandidates() {
		const text = this.elems.searchInput.value.trim();
		const filter = word => !text || `${word.w_basic_form} ${word.wt_name}`.includes(text);
		return {
			top: this.candidates.top.filter(filter),
			bottom: this.candidates.bottom.filter(filter),
		};
	}
	renderCandidates() {
		this.elems.list.innerHTML = '';
		const { top, bottom } = this.getVisibleCandidates();
		this.elems.list.appendChild(this.createCandidateGroup('Compatible', top, true));
		this.elems.list.appendChild(this.createCandidateGroup('Incompatible', bottom, false));
	}
	createCandidateGroup(label, candidates, compatible) {
		const group = createElement('section', `modal-candidate-group ${compatible ? 'compatible' : 'incompatible'}`);
		group.appendChild(createElement('h4', 'modal-candidate-heading', `${label} (${candidates.length})`));
		if (!candidates.length) {
			group.appendChild(createElement('div', 'modal-candidate-empty', compatible ? 'No compatible permanent words returned.' : 'No incompatible permanent words returned.'));
			return group;
		}
		for (const candidate of candidates) group.appendChild(this.createCandidate(candidate, compatible));
		return group;
	}
	createCandidate(candidate, compatible) {
		const card = createElement('div', `modal-item ${compatible ? 'compatible' : 'incompatible'}`);
		card.dataset.id = getPermanentWordTargetId(candidate);
		card.appendChild(createElement('div', 'modal-item-word', candidate.w_basic_form));
		card.appendChild(createElement('div', 'modal-item-type', candidate.wt_name));
		const select = () => {
			if (!compatible) return;
			if (this.selected && getPermanentWordTargetId(this.selected) === getPermanentWordTargetId(candidate)) {
				this.selected = null;
				this.elems.selected.textContent = '';
				this.elems.confirm.disabled = true;
				Array.from(this.elems.list.getElementsByClassName('modal-item')).forEach(item => setClass(item, 'selected', false));
				return;
			}
			this.selected = candidate;
			this.elems.selected.textContent = `${candidate.w_basic_form} [${candidate.wt_name}]`;
			this.elems.confirm.disabled = false;
			Array.from(this.elems.list.getElementsByClassName('modal-item')).forEach(item => setClass(item, 'selected', item === card));
		};
		if (compatible) card.onclick = eventHandler(select);
		card.addEventListener('keydown', ev => KeydownHandlers.mergeModal.card(card, ev));
		if (!compatible) card.setAttribute('aria-disabled', 'true');
		focusable(card);
		return card;
	}
	focusFirstCandidate() {
		const card = this.elems.list.getElementsByClassName('modal-item')[0];
		if (card) card.focus({ preventScroll: true });
	}
	focusNextCandidate(card, direction) {
		const cards = Array.from(this.elems.list.getElementsByClassName('modal-item'));
		if (!cards.length) return;
		const index = cards.indexOf(card);
		cards[(index + direction + cards.length) % cards.length].focus({ preventScroll: true });
	}
}

class ConfirmOverlay {
	constructor() {
		this.elems = {
			overlay: document.getElementById('confirmOverlay'),
			progress: document.getElementById('confirmOverlayProgress'),
			message: document.getElementById('confirmOverlayMessage'),
			close: document.getElementById('confirmOverlayClose'),
		}
		this.isConfirming = false;
		this.didSucceed = false;
		this.elems.close.onclick = eventHandler(() => this.close());
	}
	open() {
		if (this.isConfirming || !entryStates.verify(sidebar.allWordBuffers)) return;
		this.isConfirming = true;
		this.didSucceed = false;
		this.elems.progress.textContent = '0%';
		this.elems.message.textContent = 'Confirming unsure word entries...';
		this.elems.close.hidden = true;
		setClass(this.elems.overlay, 'open', true);
		sidebar.syncConfirm();
		UnsureWordBuffer.confirm(async (data, eventSource) => {
			const { percentage, message, success } = data;
			this.elems.progress.textContent = `${Math.round(percentage)}%`;
			this.elems.message.textContent = message;
			if (!success) return;
			this.didSucceed = true;
			eventSource.close();
			await loadPage();
			this.isConfirming = false;
			this.close();
		}, error => this.fail(error), () => {
			if (!this.didSucceed && this.isConfirming) this.fail(new Error('Confirmation ended before completion'));
		});
	}
	fail(error) {
		this.isConfirming = false;
		this.elems.message.textContent = error?.message ?? 'Unable to confirm unsure word entries.';
		this.elems.close.hidden = false;
		this.elems.close.focus({ preventScroll: true });
		sidebar.syncConfirm();
	}
	close() {
		if (this.isConfirming) return;
		setClass(this.elems.overlay, 'open', false);
		sidebar.syncConfirm();
	}
}

const entryStates = new EntryStates();
const buffer = new Buffer();
const sidebar = new Sidebar();
const mergeModal = new MergeModal();
const confirmOverlay = new ConfirmOverlay();

async function loadPage() {
	buffer.renderLoading();
	sidebar.renderLoading();
	const selectedId = sidebar.selected ? wordId(sidebar.selected) : undefined;
	const [wordBuffers, unsureEntryStates] = await Promise.all([UnsureWordBuffer.findAll(), UnsureEntryState.findAll()]);
	if (!wordBuffers || !unsureEntryStates) {
		buffer.renderError();
		sidebar.renderError();
		return;
	}

	entryStates.set(unsureEntryStates);
	sidebar.set(wordBuffers);
	if (!sidebar.allWordBuffers.length) {
		sidebar.selected = null;
		sidebar.renderSearchResults();
		buffer.renderEmpty();
		return;
	}

	sidebar.renderSearchResults();
	const selected = sidebar.allWordBuffers.find(wordBuffer => wordId(wordBuffer) === selectedId) ?? sidebar.allWordBuffers[0];
	await sidebar.selectWord(selected, false);
}

asyncHandler('MAIN INIT', loadPage);
