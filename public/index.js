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

		const params = new URLSearchParams(window.location.search);
		params.set('select', word.w_basic_form);
		params.set('wt_name', word.wt_name);
		window.history.replaceState({}, '', `${window.location.pathname}?${params}`);

		buffer.setWord(word);
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
		const card = createElement('div', 'search-item');
		card.dataset.id = wordId(word);
		card.appendChild(this.createSearchWord(word.w_basic_form));
		card.appendChild(this.createSearchWordType(word.wt_name));
		card.onclick = async e => {
			e.preventDefault();
			this.selectWord(word);
		}

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

		this.w_basic_form = '';
		this.token_ids = '';
		this.wt_name = '';
		this.j_response = '[]';
	}
	setWord(word) {
		this.w_basic_form = word.w_basic_form;
		this.token_ids = word.token_ids;
		this.wt_name = word.wt_name;
		this.j_response = JSON.parse(word.j_response);

		this.renderHeader();
		this.renderEntries();
	}
	renderHeader() {
		this.basicForm.textContent = this.w_basic_form;
		this.tokenId.textContent = `Token: ${this.token_ids}`;
		this.wordType.textContent = this.wt_name;
		this.count.textContent = `${this.j_response.length} Dictionary Entries`;
	}
	renderEntries() {
		this.container.innerHTML = '';
		this.j_response.forEach(entry => {
			this.container.appendChild(this.createEntry(entry));
		});
	}
	createEntry(entry) {
		const card = createElement("div", "entry");
		card.appendChild(this.createEntryHeader(entry));
		card.appendChild(this.createJapaneseSection(entry.japanese));
		card.appendChild(this.createMeaningSection(entry.senses));
		if (entry.tags.length > 0) card.appendChild(this.createDictionaryTags(entry.tags));

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
