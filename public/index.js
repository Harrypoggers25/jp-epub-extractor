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

asyncHandler('SIDEBAR INIT', async () => {
	const allData = await asyncHandler('WORD FIND ALL', async () => {
		const response = await fetch('/api/cleaned-buffers', {
			method: 'GET',
		})
		if (!response.ok) throw new Error(`Failed to find all words. Internal error`);

		const result = await response.json();
		if (!result) throw new Error(`Failed to find words. Unable to find data`);
		if (!result.length) throw new Error(`Failed to find words. No data found`);

		return result;
	});
	if (!allData) throw new Error('Failed to load data');

	const searchInput = document.getElementById('searchInput');
	searchInput.oninput = ev => {
		const text = ev.target.value;
		console.log(text);
	};
	const searchResults = document.getElementById('searchResults');

	renderSearchResults();

	function renderSearchResults() {
		for (let i = 0; i < allData.length; i++) {
			const entry = allData[i];
			const searchItem = i === 0 ? createSearchItem(entry, true) : createSearchItem(entry);
			searchResults.appendChild(searchItem);
		}
	}

	function createSearchItem(entry, active = false) {
		const card = createElement('div', 'search-item');
		if (active) card.classList.add('active');

		card.appendChild(createSearchWord(entry.w_basic_form));
		card.appendChild(createSearchWordType(entry.wt_name));

		return card;
	}

	function createSearchWord(word) {
		return createElement('div', 'search-word', word);
	}

	function createSearchWordType(wordType) {
		return createElement('div', 'search-word-type', wordType);
	}
});

asyncHandler('MAIN INIT', async () => {
	const entries = await asyncHandler('WORD FIND', async () => {
		const params = new URLSearchParams(window.location.search);
		const w_basic_form = params.get('select');
		if (!w_basic_form) throw new Error(`Failed to find words. Missing search parameter`);

		const response = await fetch(`/api/cleaned-buffers/${w_basic_form}`, {
			method: 'GET',
		})
		if (!response.ok) throw new Error(`Failed to find words [${w_basic_form}]. Internal error`);

		const result = await response.json();
		if (!result) throw new Error(`Failed to find words [${w_basic_form}]. Unable to find data`);
		if (!result.length) throw new Error(`Failed to find words [${w_basic_form}]. No data found`);

		return result;
	});
	if (!entries) throw new Error(`Failed to load data`);

	const entry = entries[0];
	const j_response = JSON.parse(entry.j_response);

	const basicForm = document.getElementById("basicForm");
	const tokenId = document.getElementById("tokenId");
	const wordType = document.getElementById("wordType");
	const count = document.getElementById("count");
	const container = document.getElementById("entries");

	renderHeader();
	renderEntries();

	function renderHeader() {
		basicForm.textContent = entry.w_basic_form;
		tokenId.textContent = `Token: ${entry.token_ids}`;
		wordType.textContent = entry.wt_name;
		count.textContent = `${j_response.length} Dictionary Entries`;
	}

	function renderEntries() {
		j_response.forEach((entry) => {
			container.appendChild(createEntry(entry));
		});
	}

	function createEntry(entry) {
		const card = createElement("div", "entry");
		card.appendChild(createEntryHeader(entry));
		card.appendChild(createJapaneseSection(entry.japanese));
		card.appendChild(createMeaningSection(entry.senses));
		if (entry.tags.length > 0) card.appendChild(createDictionaryTags(entry.tags));

		return card;
	}

	function createEntryHeader(entry) {
		const header = createElement("div", "entry-header");
		const slug = createElement("div", "slug", entry.slug);

		const badges = document.createElement("div");
		if (entry.is_common) badges.appendChild(createBadge("Common", "common"));
		if (entry.jlpt) badges.appendChild(createBadge(entry.jlpt, "jlpt"));

		header.appendChild(slug);
		header.appendChild(badges);

		return header;
	}

	function createJapaneseSection(words) {
		const section = createSection("Japanese");

		words.forEach((word) => {
			section.appendChild(createJapaneseWord(word));
		});

		return section;
	}

	function createJapaneseWord(word) {
		const wrapper = createElement("div", "word");
		const text = createElement("strong", null, word.word);
		const reading = createElement("span", null, word.reading);
		wrapper.appendChild(text);
		wrapper.appendChild(reading);

		return wrapper;
	}

	function createMeaningSection(senses) {
		const section = createSection("Meanings");

		senses.forEach((sense) => {
			section.appendChild(createSense(sense));
		});

		return section;
	}

	function createSense(sense) {
		const wrapper = createElement("div", "sense");
		const definitions = createElement("div", "definitions", sense.english_definitions.join(", "));
		wrapper.appendChild(definitions);
		wrapper.appendChild(createTagContainer(sense.parts_of_speech));
		if (sense.tags.length > 0) wrapper.appendChild(createTagContainer(sense.tags));

		return wrapper;
	}

	function createDictionaryTags(tags) {
		const section = createSection("Dictionary Tags");

		section.appendChild(createTagContainer(tags));

		return section;
	}

	function createTagContainer(tags) {
		const container = createElement("div", "tags");

		tags.forEach((tag) => {
			container.appendChild(createTag(tag));
		});

		return container;
	}

	function createTag(text) {
		return createElement("span", "tag", text);
	}

	function createBadge(text, className) {
		return createElement("span", className, text);
	}

	function createSection(title) {
		const section = createElement("div", "section");
		const heading = createElement("h3", null, title);
		section.appendChild(heading);

		return section;
	}
});
