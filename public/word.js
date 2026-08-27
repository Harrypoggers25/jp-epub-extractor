import { BookBuffer, Word } from "./api.helper.js";
import { filterItems } from "./table.helper.js";
import { Table } from "./table.js";
import { asyncHandler, createElement, eventHandler, focusElem, focusable, setClass } from "./tools.helper.js";

const KeydownHandlers = {
	wordList: {
		export: ev => {
			if (ev.key !== 'Escape' || !wordList.elems.exportMenu.classList.contains('open')) return;

			wordList.closeExportMenu();
			wordList.elems.btnExport.focus();
		},
	},
	wordDetailModal: {
		modal: ev => {
			if (ev.key !== 'Escape') return;

			ev.preventDefault();
			wordDetailModal.close();
		},
		dictionary: (ev, close) => {
			if (ev.key !== 'Tab' || ev.shiftKey) return;

			ev.preventDefault();
			focusElem(close);
		},
		card: (card, ev) => {
			const cards = wordDetailModal.getDictionaryCards();
			const index = cards.indexOf(card);
			switch (ev.key) {
				case 'j':
					if (!cards[index + 1]) return;

					ev.preventDefault();
					wordDetailModal.focusCard(cards[index + 1]);
					break;
				case 'k':
					if (!cards[index - 1]) return;

					ev.preventDefault();
					wordDetailModal.focusCard(cards[index - 1]);
					break;
				case 'g':
					ev.preventDefault();
					wordDetailModal.focusCard(cards[0]);
					break;
				case 'G':
					ev.preventDefault();
					wordDetailModal.focusCard(cards.at(-1));
					break;
				case 'ArrowDown':
					ev.preventDefault();
					wordDetailModal.scrollDictionary(1);
					break;
				case 'ArrowUp':
					ev.preventDefault();
					wordDetailModal.scrollDictionary(-1);
					break;
			}
		},
	},
	wordMergeModal: {
		modal: ev => {
			if (ev.key !== 'Escape') return;

			ev.preventDefault();
			wordMergeModal.close();
		},
		candidate: (candidate, ev) => {
			const candidates = wordMergeModal.getCandidates();
			const index = candidates.indexOf(candidate);
			switch (ev.key) {
				case 'j':
				case 'ArrowDown':
					ev.preventDefault();
					wordMergeModal.focusCandidate(candidates[index + 1]);
					break;
				case 'k':
				case 'ArrowUp':
					ev.preventDefault();
					wordMergeModal.focusCandidate(candidates[index - 1]);
					break;
				case 'g':
				case 'Home':
					ev.preventDefault();
					wordMergeModal.focusCandidate(candidates[0]);
					break;
				case 'G':
				case 'End':
					ev.preventDefault();
					wordMergeModal.focusCandidate(candidates.at(-1));
					break;
				case 'Enter':
				case ' ':
					ev.preventDefault();
					candidate.click();
					break;
			}
		},
	},
}

class BookEntry {
	constructor() {
		this.elems = {
			btnBook: document.getElementById('btnBook'),
		}
	}
	async load() {
		const bookBuffer = await BookBuffer.findCurrent();
		if (!bookBuffer) return;

		this.elems.btnBook.textContent = 'Continue entry';
		setClass(this.elems.btnBook, 'continue-entry', true);
	}
}

class WordList {
	constructor() {
		this.elems = {
			wordTable: document.getElementById('wordTable'),
			wordSearch: document.getElementById('wordSearch'),
			wordExport: document.getElementById('wordExport'),
			btnExport: document.getElementById('btnExport'),
			exportMenu: document.getElementById('exportMenu'),
			btnExportJson: document.getElementById('btnExportJson'),
			btnExportFormatted: document.getElementById('btnExportFormatted'),
		}

		this.words = null;
		this.searchText = '';
		this.collator = new Intl.Collator('ja', { numeric: true, sensitivity: 'base' });
		this.table = new Table(this.elems.wordTable, {
			columns: [
				{ key: 'word', label: 'Word' },
				{ key: 'type', label: 'Type' },
				{ key: 'w_character_type', label: 'Character\nType' },
				{ key: 'occurrence_count', label: 'Occurrences' },
				{ key: 'created_at', label: 'Created' },
				{ key: 'status', label: 'Status', align: 'center' },
			],
			createRow: word => this.createWordRow(word),
			compareItems: (word1, word2, column) => this.compareWords(word1, word2, column.key),
			onActivate: (word, row) => wordDetailModal.open(word, row),
		});

		this.elems.wordSearch.oninput = eventHandler(ev => {
			this.searchText = ev.target.value.trim();
			this.table.resetPage();
			this.renderWords();
		});
		this.elems.btnExport.onclick = eventHandler(() => this.toggleExportMenu());
		this.elems.btnExportJson.onclick = eventHandler(() => this.exportWords());
		this.elems.btnExportFormatted.onclick = eventHandler(() => this.exportWords(true));
		document.addEventListener('click', ev => {
			if (!this.elems.wordExport.contains(ev.target)) this.closeExportMenu();
		});
		this.elems.btnExport.addEventListener('keydown', KeydownHandlers.wordList.export);
		this.elems.exportMenu.addEventListener('keydown', KeydownHandlers.wordList.export);
	}
	async load() {
		this.renderLoading();
		await asyncHandler('WORD LIST LOAD', async () => {
			const words = await Word.findAll();
			if (!words) {
				this.renderError();
				return;
			}

			this.words = [...words];
			this.elems.wordSearch.disabled = !words.length;
			this.setExportEnabled(words.length);
			this.renderWords();
		});
	}
	renderLoading() {
		this.elems.wordSearch.disabled = true;
		this.setExportEnabled(false);
		this.renderState('Loading words...');
	}
	renderEmpty() {
		this.elems.wordSearch.disabled = true;
		this.setExportEnabled(false);
		this.renderState('No words', 'Process and review a book to add words.');
	}
	renderError() {
		this.elems.wordSearch.disabled = true;
		this.setExportEnabled(false);
		this.renderState('Failed to load words', 'Please try again.', 'error');
	}
	setExportEnabled(enabled) {
		this.elems.btnExport.disabled = !enabled;
		if (!enabled) this.closeExportMenu();
	}
	toggleExportMenu() {
		if (this.elems.btnExport.disabled) return;
		this.setExportMenuOpen(!this.elems.exportMenu.classList.contains('open'));
	}
	closeExportMenu() {
		this.setExportMenuOpen(false);
	}
	setExportMenuOpen(open) {
		this.elems.exportMenu.classList.toggle('open', open);
		this.elems.exportMenu.setAttribute('aria-hidden', `${!open}`);
		this.elems.btnExport.setAttribute('aria-expanded', `${open}`);
	}
	exportWords(formatted = false) {
		if (!this.words?.length) return;

		const text = formatted ? JSON.stringify(this.words, null, 2) : JSON.stringify(this.words);
		const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = formatted ? 'words-formatted.json' : 'words.json';
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
		this.closeExportMenu();
	}
	renderState(title, message, className = '') {
		const { wordTable } = this.elems;
		this.table.clear();

		const state = createElement('div', `table-state ${className}`);
		state.setAttribute('role', className === 'error' ? 'alert' : 'status');
		state.appendChild(createElement('h2', null, title));
		if (message) state.appendChild(createElement('span', null, message));
		wordTable.appendChild(state);
	}
	renderWords() {
		if (!this.words.length) {
			this.renderEmpty();
			return;
		}

		const filteredWords = this.getFilteredWords();
		if (!filteredWords.length) {
			this.renderState('No matching words');
			return;
		}

		this.table.render(filteredWords);
	}
	getFilteredWords() {
		if (!this.searchText) return this.words;

		const searchText = this.searchText.toLowerCase();
		return filterItems(this.words, word => {
			return [word.w_basic_form, word.wt_name, word.w_character_type].some(text => {
				return text.toLowerCase().includes(searchText);
			});
		});
	}
	compareWords(word1, word2, column) {
		const value1 = this.getSortValue(word1, column);
		const value2 = this.getSortValue(word2, column);
		const result = ['occurrence_count', 'created_at'].includes(column)
			? value1 - value2
			: this.collator.compare(value1, value2);
		if (result) return result;

		const basicFormResult = this.collator.compare(word1.w_basic_form, word2.w_basic_form);
		if (basicFormResult) return basicFormResult;

		return this.collator.compare(word1.wt_name, word2.wt_name);
	}
	getSortValue(word, column) {
		switch (column) {
			case 'word': return word.w_basic_form;
			case 'type': return word.wt_name;
			case 'w_character_type': return word.w_character_type;
			case 'occurrence_count': return word.occurrence_count;
			case 'created_at': return this.getCreatedAtTimestamp(word);
			case 'status': return this.getStatus(word);
		}
	}
	createWordRow(word) {
		const row = createElement('tr');
		row.dataset.wordId = this.getWordId(word);
		row.setAttribute('aria-haspopup', 'dialog');
		row.setAttribute('aria-label', `Show details for ${word.w_basic_form}`);

		row.appendChild(createElement('td', null, word.w_basic_form));

		const wordType = createElement('td');
		wordType.appendChild(createElement('span', 'word-type', word.wt_name));
		row.appendChild(wordType);

		row.appendChild(createElement('td', 'word-character-type', word.w_character_type));
		row.appendChild(createElement('td', null, `${word.occurrence_count}`));
		row.appendChild(createElement('td', 'word-created-at', this.getCreatedAt(word)));

		const status = createElement('td');
		const statusText = this.getStatus(word);
		status.appendChild(createElement('span', word.ignore ? 'word-status ignored' : 'word-status', statusText));
		row.appendChild(status);

		return row;
	}
	getCreatedAtTimestamp(word) {
		const timestamp = Date.parse(word.created_at);
		return Number.isNaN(timestamp) ? 0 : timestamp;
	}
	getCreatedAt(word) {
		const timestamp = this.getCreatedAtTimestamp(word);
		if (!timestamp) return '—';

		const date = new Date(timestamp);
		return [date.getUTCDate(), date.getUTCMonth() + 1, date.getUTCFullYear()]
			.map(value => `${value}`.padStart(2, '0'))
			.join('-');
	}
	getStatus(word) {
		return word.ignore ? 'Ignored' : '—';
	}
	getWordId(word) {
		return `${word.w_basic_form}_${word.wt_name}`;
	}
	isSameWord(word1, word2) {
		return this.getWordId(word1) === this.getWordId(word2);
	}
	getRow(word) {
		return this.table.getRows().find(row => row.dataset.wordId === this.getWordId(word));
	}
	updateWord(updatedWord) {
		this.words = this.words.map(word => this.isSameWord(word, updatedWord) ? updatedWord : word);
		this.renderWords();

		return this.getRow(updatedWord);
	}
	mergeWords(sourceWord, updatedTargetWord) {
		this.words = this.words
			.filter(word => !this.isSameWord(word, sourceWord))
			.map(word => this.isSameWord(word, updatedTargetWord) ? updatedTargetWord : word);
		this.renderWords();

		return this.getRow(updatedTargetWord) ?? this.table.getRows()[0];
	}
	getEntries(word) {
		try {
			const entries = JSON.parse(word.j_response);
			return Array.isArray(entries) ? entries : [];
		} catch (_) {
			return [];
		}
	}
	getReading(entries) {
		for (const entry of entries) {
			if (!Array.isArray(entry?.japanese)) continue;
			const reading = entry.japanese.find(form => {
				return typeof form?.reading === 'string' && form.reading.trim();
			})?.reading;
			if (reading) return reading.trim();
		}

		return '—';
	}
}

class WordDetailModal {
	constructor() {
		this.elems = {
			wordDetailModal: document.getElementById('wordDetailModal'),
			dictionary: null,
		}

		this.opener = null;

		this.elems.wordDetailModal.onclick = eventHandler(ev => {
			if (ev.target === this.elems.wordDetailModal) this.close();
		});
	}
	open(word, opener) {
		this.opener = opener;
		this.render(word);
	}
	render(word) {
		const { wordDetailModal } = this.elems;
		const entries = wordList.getEntries(word);
		wordDetailModal.innerHTML = '';

		const modalBox = createElement('div', 'modal-box word-detail-box');
		modalBox.setAttribute('role', 'dialog');
		modalBox.setAttribute('aria-modal', 'true');
		modalBox.setAttribute('aria-labelledby', 'wordDetailTitle');
		modalBox.addEventListener('keydown', KeydownHandlers.wordDetailModal.modal);

		const actions = createElement('div', 'modal-actions');
		const merge = createElement('button', 'header-btn', 'Merge');
		merge.type = 'button';
		merge.onclick = eventHandler(async () => {
			await wordMergeModal.open(word, merge);
		});
		actions.appendChild(merge);

		const ignore = createElement('button', 'header-btn', 'Ignore');
		setClass(ignore, 'selected', word.ignore);
		ignore.type = 'button';
		ignore.onclick = eventHandler(async () => {
			await this.toggleIgnore(word, ignore);
		});
		actions.appendChild(ignore);

		const close = createElement('button', 'header-btn', 'Close');
		close.type = 'button';
		close.onclick = eventHandler(() => this.close());
		actions.appendChild(close);

		const header = createElement('div', 'word-detail-modal-header');
		const title = createElement('h2', 'word-detail-title', word.w_basic_form);
		title.id = 'wordDetailTitle';
		header.appendChild(title);
		header.appendChild(actions);

		const summary = this.createSummary(word, entries);
		summary.prepend(header);
		const advancedMetadata = this.createAdvancedMetadata(word);
		if (advancedMetadata) summary.appendChild(advancedMetadata);
		modalBox.appendChild(summary);
		const dictionary = this.createDictionarySection(entries);
		dictionary.addEventListener('keydown', ev => KeydownHandlers.wordDetailModal.dictionary(ev, close));
		modalBox.appendChild(dictionary);

		wordDetailModal.appendChild(modalBox);
		wordDetailModal.setAttribute('aria-hidden', 'false');
		this.elems.dictionary = dictionary;
		setClass(wordDetailModal, 'open', true);
		const [card] = this.getDictionaryCards();
		if (card) this.focusCard(card);
		else focusElem(close);
	}
	async toggleIgnore(word, button) {
		button.disabled = true;
		const updatedWord = await Word.toggleIgnore(word.w_basic_form, word.wt_name);
		if (!updatedWord) {
			button.disabled = false;
			return;
		}

		const opener = wordList.updateWord(updatedWord);
		this.opener = opener ?? wordList.table.getRows()[0] ?? wordList.elems.wordSearch;
		this.render(updatedWord);
		focusElem(this.elems.wordDetailModal.querySelector('.word-detail-modal-header .modal-actions button'));
	}
	close(restoreFocus = true) {
		const { wordDetailModal } = this.elems;
		const opener = this.opener;
		this.opener = null;
		this.elems.dictionary = null;
		setClass(wordDetailModal, 'open', false);
		wordDetailModal.setAttribute('aria-hidden', 'true');
		wordDetailModal.innerHTML = '';
		if (restoreFocus && opener?.isConnected) focusElem(opener);
	}
	getDictionaryCards() {
		return Array.from(this.elems.dictionary?.getElementsByClassName('entry') ?? []);
	}
	focusCard(card) {
		const { dictionary } = this.elems;
		if (!card || !dictionary) return;

		card.focus({ preventScroll: true });
		const cardRect = card.getBoundingClientRect();
		const dictionaryRect = dictionary.getBoundingClientRect();
		const top = dictionary.scrollTop + cardRect.top - dictionaryRect.top - 12;
		dictionary.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
	}
	scrollDictionary(direction) {
		const { dictionary } = this.elems;
		if (!dictionary) return;

		dictionary.scrollBy({
			top: dictionary.clientHeight * .25 * direction,
			behavior: 'smooth',
		});
	}
	createSummary(word, entries) {
		const summary = createElement('div', 'word-detail-summary');
		const metadata = createElement('div', 'word-detail-meta');
		metadata.appendChild(this.createSummaryBadge(`Reading: ${wordList.getReading(entries)}`));
		metadata.appendChild(this.createSummaryBadge(word.wt_name));
		metadata.appendChild(this.createSummaryBadge(`${word.occurrence_count} occurrences`));
		metadata.appendChild(this.createSummaryBadge(word.w_character_type));
		if (word.ignore) metadata.appendChild(this.createSummaryBadge('Ignored', 'ignored'));
		summary.appendChild(metadata);

		return summary;
	}
	createDictionarySection(entries) {
		const section = createElement('section', 'word-detail-dictionary');
		section.setAttribute('role', 'region');
		section.setAttribute('aria-label', 'Dictionary entries');

		const dictionaryEntries = entries.filter(entry => this.isDictionaryEntry(entry));
		if (!dictionaryEntries.length) {
			section.appendChild(createElement('p', 'word-detail-empty', 'No dictionary entries available.'));
			return section;
		}

		dictionaryEntries.forEach(entry => section.appendChild(this.createEntry(entry)));
		return section;
	}
	isDictionaryEntry(entry) {
		if (!entry || typeof entry !== 'object') return false;
		if (typeof entry.slug === 'string' && entry.slug.trim()) return true;
		if (this.getItems(entry.japanese).some(word => {
			return typeof word?.word === 'string' && word.word.trim()
				|| typeof word?.reading === 'string' && word.reading.trim();
		})) return true;
		if (this.getItems(entry.senses).some(sense => {
			return this.getStrings(sense?.english_definitions).length
				|| this.getStrings(sense?.parts_of_speech).length
				|| this.getStrings(sense?.tags).length;
		})) return true;

		return !!this.getStrings(entry.tags).length;
	}
	createEntry(entry) {
		const card = createElement('div', 'entry');
		const header = createElement('div', 'entry-header');
		const slug = typeof entry.slug === 'string' && entry.slug.trim() ? entry.slug : '—';
		focusable(card);
		card.setAttribute('aria-label', `Dictionary entry ${slug}`);
		card.addEventListener('keydown', ev => KeydownHandlers.wordDetailModal.card(card, ev));
		header.appendChild(createElement('div', 'slug', slug));

		const badges = createElement('div');
		if (entry.is_common) badges.appendChild(this.createEntryBadge('Common', 'common'));
		if (typeof entry.jlpt === 'string' && entry.jlpt.trim()) {
			badges.appendChild(this.createEntryBadge(entry.jlpt, 'jlpt'));
		}
		if (badges.childElementCount) header.appendChild(badges);
		card.appendChild(header);

		const japaneseWords = this.getItems(entry.japanese);
		if (japaneseWords.length) card.appendChild(this.createJapaneseSection(japaneseWords));

		const senses = this.getItems(entry.senses);
		if (senses.length) card.appendChild(this.createMeaningSection(senses));

		const tags = this.getStrings(entry.tags);
		if (tags.length) card.appendChild(this.createTagSection('Dictionary tags', tags));

		return card;
	}
	createJapaneseSection(japaneseWords) {
		const section = this.createSection('Forms');

		japaneseWords.forEach(word => {
			if (!word || typeof word !== 'object') return;
			const text = typeof word.word === 'string' && word.word.trim() ? word.word : null;
			const reading = typeof word.reading === 'string' && word.reading.trim() ? word.reading : null;
			if (!text && !reading) return;

			const form = createElement('div', 'word');
			if (text) form.appendChild(createElement('strong', null, text));
			if (reading) form.appendChild(createElement('span', null, reading));
			section.appendChild(form);
		});

		return section;
	}
	createMeaningSection(senses) {
		const section = this.createSection('Meanings');

		senses.forEach(sense => {
			if (!sense || typeof sense !== 'object') return;
			const definitions = this.getStrings(sense.english_definitions);
			const partsOfSpeech = this.getStrings(sense.parts_of_speech);
			const tags = this.getStrings(sense.tags);
			if (!definitions.length && !partsOfSpeech.length && !tags.length) return;

			const wrapper = createElement('div', 'sense');
			if (definitions.length) {
				wrapper.appendChild(createElement('div', 'definitions', definitions.join(', ')));
			}
			if (partsOfSpeech.length) wrapper.appendChild(this.createTagContainer(partsOfSpeech));
			if (tags.length) wrapper.appendChild(this.createTagContainer(tags));
			section.appendChild(wrapper);
		});

		return section;
	}
	createTagSection(title, tags) {
		const section = this.createSection(title);
		section.appendChild(this.createTagContainer(tags));
		return section;
	}
	createTagContainer(tags) {
		const container = createElement('div', 'tags');
		tags.forEach(tag => container.appendChild(createElement('span', 'tag', tag)));
		return container;
	}
	createAdvancedMetadata(word) {
		const details = [];
		if (typeof word.token_ids === 'string' && word.token_ids.trim()) details.push(['Token IDs', word.token_ids]);
		if (typeof word.created_at === 'string' && word.created_at.trim()) details.push(['Created', wordList.getCreatedAt(word)]);
		if (!details.length) return;

		const section = createElement('div', 'word-detail-advanced');
		details.forEach(([label, value]) => {
			const item = createElement('div', 'word-detail-detail');
			item.appendChild(createElement('span', null, label));
			item.appendChild(createElement('span', null, value));
			section.appendChild(item);
		});

		return section;
	}
	createSummaryBadge(text, className = '') {
		return createElement('span', `word-detail-badge ${className}`, text);
	}
	createEntryBadge(text, className) {
		return createElement('span', className, text);
	}
	createSection(title, className = '') {
		const section = createElement('div', `section ${className}`);
		section.appendChild(createElement('h3', null, title));
		return section;
	}
	getItems(value) {
		return Array.isArray(value) ? value : [];
	}
	getStrings(value) {
		return this.getItems(value).filter(item => typeof item === 'string' && item.trim());
	}
}

class WordMergeModal {
	constructor() {
		this.elems = {
			wordMergeModal: document.getElementById('wordMergeModal'),
		};
		this.source = null;
		this.selected = null;
		this.opener = null;

		this.elems.wordMergeModal.onclick = eventHandler(ev => {
			if (ev.target === this.elems.wordMergeModal) this.close();
		});
	}
	async open(source, opener) {
		this.source = source;
		this.opener = opener;
		this.selected = null;
		this.renderLoading();
		setClass(this.elems.wordMergeModal, 'open', true);
		this.elems.wordMergeModal.setAttribute('aria-hidden', 'false');

		const transformed = await Word.transform(source.w_basic_form, source.wt_name);
		if (!transformed) {
			this.renderError();
			focusElem(this.elems.wordMergeModal.querySelector('.word-merge-cancel'));
			return;
		}

		this.renderCandidates(transformed);
		const [candidate] = this.getCandidates();
		if (candidate) this.focusCandidate(candidate);
		else focusElem(this.elems.wordMergeModal.querySelector('.word-merge-cancel'));
	}
	close(restoreFocus = true) {
		const { wordMergeModal } = this.elems;
		const opener = this.opener;
		this.source = null;
		this.selected = null;
		this.opener = null;
		setClass(wordMergeModal, 'open', false);
		wordMergeModal.setAttribute('aria-hidden', 'true');
		wordMergeModal.innerHTML = '';
		if (restoreFocus && opener?.isConnected) focusElem(opener);
	}
	renderLoading() {
		this.renderBox('Loading merge candidates...');
	}
	renderError() {
		this.renderBox('Unable to load merge candidates', 'Please close this dialog and try again.', 'error');
	}
	renderBox(title, message, className = '') {
		const { wordMergeModal } = this.elems;
		wordMergeModal.innerHTML = '';
		const box = createElement('div', `modal-box word-merge-box ${className}`);
		box.setAttribute('role', 'dialog');
		box.setAttribute('aria-modal', 'true');
		box.setAttribute('aria-labelledby', 'wordMergeTitle');
		box.addEventListener('keydown', KeydownHandlers.wordMergeModal.modal);
		const heading = createElement('h3', null, title);
		heading.id = 'wordMergeTitle';
		box.appendChild(heading);
		if (message) box.appendChild(createElement('p', 'overlay-message', message));
		const actions = createElement('div', 'modal-actions');
		const cancel = createElement('button', 'header-btn word-merge-cancel', 'Close');
		cancel.type = 'button';
		cancel.onclick = eventHandler(() => this.close());
		actions.appendChild(cancel);
		box.appendChild(actions);
		wordMergeModal.appendChild(box);
	}
	renderCandidates(transformed) {
		const { top, bottom } = transformed;
		const { wordMergeModal } = this.elems;
		wordMergeModal.innerHTML = '';

		const box = createElement('div', 'modal-box word-merge-box');
		box.setAttribute('role', 'dialog');
		box.setAttribute('aria-modal', 'true');
		box.setAttribute('aria-labelledby', 'wordMergeTitle');
		box.addEventListener('keydown', KeydownHandlers.wordMergeModal.modal);
		const heading = createElement('h3', null, 'Merge permanent word');
		heading.id = 'wordMergeTitle';
		box.appendChild(heading);
		box.appendChild(createElement('p', 'word-merge-source', `${this.source.w_basic_form} [ ${this.source.wt_name} ] will be merged into the selected compatible word.`));

		const list = createElement('div', 'word-merge-list');
		list.appendChild(this.createCandidateGroup('Compatible merge targets', top, true));
		list.appendChild(this.createCandidateGroup('Incompatible words', bottom, false));
		box.appendChild(list);

		const actions = createElement('div', 'modal-actions');
		const cancel = createElement('button', 'header-btn word-merge-cancel', 'Cancel');
		cancel.type = 'button';
		cancel.onclick = eventHandler(() => this.close());
		actions.appendChild(cancel);
		const confirm = createElement('button', 'header-btn success word-merge-confirm', 'Merge');
		confirm.type = 'button';
		confirm.disabled = true;
		confirm.onclick = eventHandler(async () => {
			await this.confirm(confirm);
		});
		actions.appendChild(confirm);
		box.appendChild(actions);
		wordMergeModal.appendChild(box);
	}
	createCandidateGroup(title, words, selectable) {
		const group = createElement('section', `word-merge-group${selectable ? ' compatible' : ' incompatible'}`);
		group.appendChild(createElement('h4', null, title));
		if (!words.length) {
			group.appendChild(createElement('p', 'word-merge-empty', selectable ? 'No compatible merge targets.' : 'No incompatible words.'));
			return group;
		}

		words.forEach(word => group.appendChild(this.createCandidate(word, selectable)));
		return group;
	}
	createCandidate(word, selectable) {
		const card = createElement('div', `word-merge-candidate${selectable ? '' : ' disabled'}`);
		card.appendChild(createElement('div', 'word-merge-candidate-word', word.w_basic_form));
		card.appendChild(createElement('div', 'word-merge-candidate-type', word.wt_name));
		const metadata = createElement('div', 'word-merge-candidate-meta');
		metadata.appendChild(createElement('span', null, `${word.occurrence_count} occurrences`));
		metadata.appendChild(createElement('span', null, word.w_character_type));
		if (word.ignore) metadata.appendChild(createElement('span', 'word-merge-candidate-ignored', 'Ignored'));
		card.appendChild(metadata);
		if (!selectable) {
			card.setAttribute('aria-disabled', 'true');
			return card;
		}

		focusable(card);
		card.setAttribute('aria-label', `Select ${word.w_basic_form} [ ${word.wt_name} ] as merge target`);
		card.onclick = eventHandler(() => this.selectCandidate(word, card));
		card.addEventListener('keydown', ev => KeydownHandlers.wordMergeModal.candidate(card, ev));
		return card;
	}
	selectCandidate(word, card) {
		const selected = this.selected === word;
		this.selected = selected ? null : word;
		this.getCandidates().forEach(candidate => setClass(candidate, 'selected', false));
		setClass(card, 'selected', !selected);
		this.elems.wordMergeModal.querySelector('.word-merge-confirm').disabled = !this.selected;
	}
	getCandidates() {
		return Array.from(this.elems.wordMergeModal.getElementsByClassName('word-merge-candidate'))
			.filter(card => !card.classList.contains('disabled'));
	}
	focusCandidate(candidate) {
		if (candidate) focusElem(candidate);
	}
	async confirm(button) {
		if (!this.source || !this.selected) return;

		button.disabled = true;
		const updatedTarget = await Word.merge(wordList.getWordId(this.source), wordList.getWordId(this.selected));
		if (!updatedTarget) {
			button.disabled = false;
			return;
		}

		const focusTarget = wordList.mergeWords(this.source, updatedTarget);
		wordDetailModal.close(false);
		this.close(false);
		focusElem(focusTarget ?? wordList.elems.wordSearch);
	}
}

const bookEntry = new BookEntry();
const wordList = new WordList();
const wordDetailModal = new WordDetailModal();
const wordMergeModal = new WordMergeModal();

asyncHandler('MAIN INIT', async () => {
	await Promise.all([bookEntry.load(), wordList.load()]);
});
