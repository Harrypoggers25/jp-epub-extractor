async function asyncHandler(header, handler) {
	try {
		return await handler();
	} catch (error) {
		console.error(`${header.toUpperCase()} ERROR:`, error.message ?? error);
		return undefined;
	}
}

asyncHandler('PAGE', async () => {
	const allData = await asyncHandler('WORD FIND', async () => {
		const params = new URLSearchParams(window.location.search);
		const w_basic_form = params.get('search');
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
	if (!allData) throw new Error(`Failed to load data`);

	const data = allData[0];
	const entries = JSON.parse(data.j_response);

	const basicForm = document.getElementById("basicForm");
	const tokenId = document.getElementById("tokenId");
	const wordType = document.getElementById("wordType");
	const count = document.getElementById("count");
	const container = document.getElementById("entries");

	renderHeader();
	renderEntries();

	function renderHeader() {
		basicForm.textContent = data.w_basic_form;
		tokenId.textContent = `Token: ${data.token_ids}`;
		wordType.textContent = data.wt_name;
		count.textContent = `${entries.length} Dictionary Entries`;
	}

	function renderEntries() {
		entries.forEach((entry) => {
			container.appendChild(createEntry(entry));
		});
	}

	function createEntry(entry) {
		const card = createElement("div", "entry");

		card.appendChild(createEntryHeader(entry));
		card.appendChild(createJapaneseSection(entry.japanese));
		card.appendChild(createMeaningSection(entry.senses));

		if (entry.tags.length > 0) {
			card.appendChild(createDictionaryTags(entry.tags));
		}

		return card;
	}

	function createEntryHeader(entry) {
		const header = createElement("div", "entry-header");

		const slug = createElement("div", "slug");
		slug.textContent = entry.slug;

		const badges = document.createElement("div");

		if (entry.is_common) {
			badges.appendChild(createBadge("Common", "common"));
		}

		if (entry.jlpt) {
			badges.appendChild(createBadge(entry.jlpt, "jlpt"));
		}

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

		const text = document.createElement("strong");
		text.textContent = word.word;

		const reading = document.createElement("span");
		reading.textContent = word.reading;

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

		const definitions = createElement("div", "definitions");
		definitions.textContent = sense.english_definitions.join(", ");

		wrapper.appendChild(definitions);

		wrapper.appendChild(createTagContainer(sense.parts_of_speech));

		if (sense.tags.length > 0) {
			wrapper.appendChild(createTagContainer(sense.tags));
		}

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
		const tag = createElement("span", "tag");
		tag.textContent = text;

		return tag;
	}

	function createBadge(text, className) {
		return createElement("span", className, text);
	}

	function createSection(title) {
		const section = createElement("div", "section");

		const heading = document.createElement("h3");
		heading.textContent = title;

		section.appendChild(heading);

		return section;
	}

	function createElement(tag, className, text = null) {
		const element = document.createElement(tag);

		if (className) {
			element.className = className;
		}

		if (text !== null) {
			element.textContent = text;
		}

		return element;
	}
});
