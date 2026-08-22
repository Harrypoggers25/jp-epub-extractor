import { Word } from "./api.helper.js";
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
				{ key: 'w_character_type', label: 'Character type' },
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

		return new Date(timestamp).toLocaleDateString('en-GB', {
			timeZone: 'UTC',
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		});
	}
	getStatus(word) {
		return word.ignore ? 'Ignored' : '—';
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
		const { wordDetailModal } = this.elems;
		const entries = wordList.getEntries(word);
		wordDetailModal.innerHTML = '';

		const modalBox = createElement('div', 'modal-box word-detail-box');
		modalBox.setAttribute('role', 'dialog');
		modalBox.setAttribute('aria-modal', 'true');
		modalBox.setAttribute('aria-labelledby', 'wordDetailTitle');
		modalBox.addEventListener('keydown', KeydownHandlers.wordDetailModal.modal);

		const actions = createElement('div', 'modal-actions');
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
		this.opener = opener;
		this.elems.dictionary = dictionary;
		setClass(wordDetailModal, 'open', true);
		const [card] = this.getDictionaryCards();
		if (card) this.focusCard(card);
		else focusElem(close);
	}
	close() {
		const { wordDetailModal } = this.elems;
		const opener = this.opener;
		this.opener = null;
		this.elems.dictionary = null;
		setClass(wordDetailModal, 'open', false);
		wordDetailModal.setAttribute('aria-hidden', 'true');
		wordDetailModal.innerHTML = '';
		if (opener?.isConnected) focusElem(opener);
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
		if (typeof word.created_at === 'string' && word.created_at.trim()) details.push(['Created', word.created_at]);
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

const wordList = new WordList();
const wordDetailModal = new WordDetailModal();

asyncHandler('MAIN INIT', async () => {
	await wordList.load();
});
