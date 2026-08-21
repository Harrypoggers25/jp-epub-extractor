import { Word } from "./api.helper.js";
import { asyncHandler, createElement } from "./tools.helper.js";

class WordList {
	constructor() {
		this.elems = {
			wordTable: document.getElementById('wordTable'),
		}

		this.words = null;
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
			this.renderWords();
		});
	}
	renderLoading() {
		this.renderState('Loading words...');
	}
	renderEmpty() {
		this.renderState('No words', 'Process and review a book to add words.');
	}
	renderError() {
		this.renderState('Failed to load words', 'Please try again.', 'error');
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

		wordTable.appendChild(this.createTable());
	}
	createTable() {
		const table = createElement('table', 'word-table');
		const header = createElement('thead');
		const headerRow = createElement('tr');
		['Word', 'Reading', 'Type', 'Meaning', 'Occurrences', 'Status'].forEach(text => {
			headerRow.appendChild(createElement('th', null, text));
		});
		header.appendChild(headerRow);
		table.appendChild(header);

		const body = createElement('tbody');
		this.words.forEach(word => body.appendChild(this.createWordRow(word)));
		table.appendChild(body);

		return table;
	}
	createWordRow(word) {
		const row = createElement('tr');
		const entries = this.getEntries(word);
		row.appendChild(createElement('td', null, word.w_basic_form));
		row.appendChild(createElement('td', null, this.getReading(entries)));

		const wordType = createElement('td');
		wordType.appendChild(createElement('span', 'word-type', word.wt_name));
		row.appendChild(wordType);

		row.appendChild(createElement('td', 'word-meaning', this.getMeaning(entries)));
		row.appendChild(createElement('td', null, `${word.occurrence_count}`));

		const status = createElement('td');
		status.appendChild(createElement('span', word.ignore ? 'word-status ignored' : 'word-status', word.ignore ? 'Ignored' : '—'));
		row.appendChild(status);

		return row;
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

const wordList = new WordList();

asyncHandler('MAIN INIT', async () => {
	await wordList.load();
});
