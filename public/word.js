import { Word } from "./api.helper.js";
import { asyncHandler, createElement, eventHandler, focusElem, focusable, setClass } from "./tools.helper.js";

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
		this.sort = { column: null, direction: 'asc' };
		this.page = 1;
		this.wordPerPage = 25;
		this.collator = new Intl.Collator('ja', { numeric: true, sensitivity: 'base' });

		this.elems.wordSearch.oninput = eventHandler(ev => {
			this.searchText = ev.target.value.trim();
			this.page = 1;
			this.renderWords();
		});
		this.elems.btnExport.onclick = eventHandler(() => this.toggleExportMenu());
		this.elems.btnExportJson.onclick = eventHandler(() => this.exportWords());
		this.elems.btnExportFormatted.onclick = eventHandler(() => this.exportWords(true));
		document.addEventListener('click', ev => {
			if (!this.elems.wordExport.contains(ev.target)) this.closeExportMenu();
		});
		document.addEventListener('keydown', ev => {
			if (ev.key !== 'Escape' || !this.elems.exportMenu.classList.contains('open')) return;
			this.closeExportMenu();
			this.elems.btnExport.focus();
		});
	}
	async load() {
		this.renderLoading();
		await asyncHandler('WORD LIST LOAD', async () => {
			const words = await Word.findAll();
			if (!words) {
				this.renderError();
				return;
			}

			this.words = words;
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
		wordTable.innerHTML = '';

		const state = createElement('div', `word-table-state ${className}`);
		state.setAttribute('role', className === 'error' ? 'alert' : 'status');
		state.appendChild(createElement('h2', null, title));
		if (message) state.appendChild(createElement('span', null, message));
		wordTable.appendChild(state);
	}
	renderWords() {
		const { wordTable } = this.elems;
		wordTable.innerHTML = '';
		if (!this.words.length) {
			this.renderEmpty();
			return;
		}

		const filteredWords = this.getFilteredWords();
		if (!filteredWords.length) {
			this.renderState('No matching words');
			return;
		}

		const sortedWords = this.getSortedWords(filteredWords);
		const totalPages = Math.max(1, Math.ceil(sortedWords.length / this.wordPerPage));
		if (this.page > totalPages) this.page = totalPages;

		const start = (this.page - 1) * this.wordPerPage;
		const words = sortedWords.slice(start, start + this.wordPerPage);
		wordTable.appendChild(this.createTable(words));
		wordTable.appendChild(this.createPagination(totalPages));
	}
	getFilteredWords() {
		if (!this.searchText) return this.words;

		const searchText = this.searchText.toLowerCase();
		return this.words.filter(word => {
			const { reading, meaning } = this.getDisplayWord(word);
			return [word.w_basic_form, reading, word.wt_name, meaning].some(text => {
				return text.toLowerCase().includes(searchText);
			});
		});
	}
	getSortedWords(words) {
		if (!this.sort.column) return words;

		return [...words].sort((word1, word2) => {
			const value1 = this.getSortValue(word1);
			const value2 = this.getSortValue(word2);
			const result = this.sort.column === 'occurrence_count'
				? value1 - value2
				: this.collator.compare(value1, value2);
			if (result) return this.sort.direction === 'asc' ? result : -result;

			const basicFormResult = this.collator.compare(word1.w_basic_form, word2.w_basic_form);
			if (basicFormResult) return basicFormResult;

			return this.collator.compare(word1.wt_name, word2.wt_name);
		});
	}
	getSortValue(word) {
		const { reading, meaning } = this.getDisplayWord(word);
		switch (this.sort.column) {
			case 'word': return word.w_basic_form;
			case 'reading': return reading;
			case 'type': return word.wt_name;
			case 'meaning': return meaning;
			case 'occurrence_count': return word.occurrence_count;
			case 'status': return this.getStatus(word);
		}
	}
	sortBy(column) {
		if (this.sort.column === column) {
			this.sort.direction = this.sort.direction === 'asc' ? 'desc' : 'asc';
		} else {
			this.sort = { column, direction: 'asc' };
		}

		this.renderWords();
	}
	setPage(page) {
		this.page = page;
		this.renderWords();
	}
	createTable(words) {
		const table = createElement('table', 'word-table');
		const header = createElement('thead');
		const headerRow = createElement('tr');
		[
			['word', 'Word'],
			['reading', 'Reading'],
			['type', 'Type'],
			['meaning', 'Meaning'],
			['occurrence_count', 'Occurrences'],
			['status', 'Status'],
		].forEach(([column, text]) => {
			headerRow.appendChild(this.createTableHeader(column, text));
		});
		header.appendChild(headerRow);
		table.appendChild(header);

		const body = createElement('tbody');
		words.forEach(word => body.appendChild(this.createWordRow(word)));
		table.appendChild(body);

		return table;
	}
	createTableHeader(column, text) {
		const header = createElement('th');
		header.scope = 'col';
		const active = this.sort.column === column;
		header.setAttribute('aria-sort', active ? (this.sort.direction === 'asc' ? 'ascending' : 'descending') : 'none');

		const direction = active ? (this.sort.direction === 'asc' ? ' ↑' : ' ↓') : '';
		const button = createElement('button', `word-sort${active ? ' active' : ''}`, `${text}${direction}`);
		button.type = 'button';
		button.onclick = eventHandler(() => this.sortBy(column));
		header.appendChild(button);

		return header;
	}
	createPagination(totalPages) {
		const pagination = createElement('div', 'word-pagination');

		const previous = createElement('button', 'header-btn word-page-btn', 'Previous');
		previous.type = 'button';
		previous.disabled = this.page === 1;
		previous.onclick = eventHandler(() => this.setPage(this.page - 1));
		pagination.appendChild(previous);

		const pageInfo = createElement('span', 'word-page-info', `Page ${this.page} of ${totalPages}`);
		pageInfo.setAttribute('aria-live', 'polite');
		pagination.appendChild(pageInfo);

		const next = createElement('button', 'header-btn word-page-btn', 'Next');
		next.type = 'button';
		next.disabled = this.page === totalPages;
		next.onclick = eventHandler(() => this.setPage(this.page + 1));
		pagination.appendChild(next);

		return pagination;
	}
	createWordRow(word) {
		const row = createElement('tr', 'word-row');
		const openDetail = () => wordDetailModal.open(word, row);
		focusable(row);
		row.setAttribute('aria-haspopup', 'dialog');
		row.setAttribute('aria-label', `Show details for ${word.w_basic_form}`);
		row.onclick = eventHandler(openDetail);
		row.addEventListener('keydown', ev => {
			if (ev.key !== 'Enter' && ev.key !== ' ') return;
			ev.preventDefault();
			openDetail();
		});

		const { reading, meaning } = this.getDisplayWord(word);
		row.appendChild(createElement('td', null, word.w_basic_form));
		row.appendChild(createElement('td', null, reading));

		const wordType = createElement('td');
		wordType.appendChild(createElement('span', 'word-type', word.wt_name));
		row.appendChild(wordType);

		row.appendChild(createElement('td', 'word-meaning', meaning));
		row.appendChild(createElement('td', null, `${word.occurrence_count}`));

		const status = createElement('td');
		const statusText = this.getStatus(word);
		status.appendChild(createElement('span', word.ignore ? 'word-status ignored' : 'word-status', statusText));
		row.appendChild(status);

		return row;
	}
	getDisplayWord(word) {
		const entries = this.getEntries(word);
		return {
			reading: this.getReading(entries),
			meaning: this.getMeaning(entries),
		};
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
	getMeaning(entries) {
		for (const entry of entries) {
			if (!Array.isArray(entry?.senses)) continue;
			for (const sense of entry.senses) {
				if (!Array.isArray(sense?.english_definitions)) continue;
				const definition = sense.english_definitions.find(definition => {
					return typeof definition === 'string' && definition.trim();
				});
				if (definition) return definition;
			}
		}

		return '—';
	}
}

class WordDetailModal {
	constructor() {
		this.elems = {
			wordDetailModal: document.getElementById('wordDetailModal'),
		}

		this.opener = null;

		this.elems.wordDetailModal.onclick = eventHandler(ev => {
			if (ev.target === this.elems.wordDetailModal) this.close();
		});
		document.addEventListener('keydown', ev => {
			if (ev.key !== 'Escape' || !this.elems.wordDetailModal.classList.contains('open')) return;
			ev.preventDefault();
			this.close();
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

		const actions = createElement('div', 'modal-actions');
		const close = createElement('button', 'modal-btn', 'Close');
		close.type = 'button';
		close.onclick = eventHandler(() => this.close());
		actions.appendChild(close);

		const header = createElement('div', 'word-detail-modal-header');
		const title = createElement('h2', 'word-detail-title', word.w_basic_form);
		title.id = 'wordDetailTitle';
		header.appendChild(title);
		header.appendChild(actions);
		modalBox.appendChild(header);

		const scrollBody = createElement('div', 'word-detail-scroll-body');
		scrollBody.appendChild(this.createSummary(word, entries));
		scrollBody.appendChild(this.createDictionarySection(entries));

		const advancedMetadata = this.createAdvancedMetadata(word);
		if (advancedMetadata) scrollBody.appendChild(advancedMetadata);
		modalBox.appendChild(scrollBody);

		wordDetailModal.appendChild(modalBox);
		wordDetailModal.setAttribute('aria-hidden', 'false');
		this.opener = opener;
		setClass(wordDetailModal, 'open', true);
		focusElem(close);
	}
	close() {
		const { wordDetailModal } = this.elems;
		const opener = this.opener;
		this.opener = null;
		setClass(wordDetailModal, 'open', false);
		wordDetailModal.setAttribute('aria-hidden', 'true');
		wordDetailModal.innerHTML = '';
		if (opener?.isConnected) focusElem(opener);
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
		section.appendChild(createElement('h3', 'word-detail-section-title', 'Dictionary entries'));

		const dictionaryEntries = entries.filter(entry => entry && typeof entry === 'object');
		if (!dictionaryEntries.length) {
			section.appendChild(createElement('p', 'word-detail-empty', 'No dictionary entries available.'));
			return section;
		}

		dictionaryEntries.forEach(entry => section.appendChild(this.createEntry(entry)));
		return section;
	}
	createEntry(entry) {
		const card = createElement('div', 'entry');
		const header = createElement('div', 'entry-header');
		const slug = typeof entry.slug === 'string' && entry.slug.trim() ? entry.slug : '—';
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

		const section = this.createSection('Details', 'word-detail-advanced');
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
