import { EntryState, SentenceBuffer, WordBuffer, WordType } from "./api.helper.js";
import {
	asyncHandler,
	createElement,
	eventHandler,
	focusElem,
	focusable,
	focusOffClassCard,
	focusOnClassCard,
	hasClass,
	nextElem,
	prevElem,
	setClass,
	wordId,
} from "./tools.helper.js";

const KeydownHandlers = {
	sidebar: {
		searchInput: ev => {
			switch (ev.key) {
				case 'Enter':
				case 'Escape':
					sidebar.focus();
					break;
			}
		},
		card: async (card, ev, es_id, clickHandler) => {
			const firstCard = () => document.getElementsByClassName('search-item')[0];
			const lastCard = () => {
				const cards = document.getElementsByClassName('search-item');
				return cards[cards.length - 1];
			}
			const buttonHandler = async (es_id, i) => {
				const { buttons, handlers } = buffer.createButtons(es_id);
				if (!buttons[i].disabled) {
					await handlers[i]();
					buffer.syncButtonState(wordId(buffer.selected));
					focusElem(document.querySelector(`[data-id="${es_id}"]`))
				}
				return;
			}
			switch (ev.key) {
				case 's':
					sidebar.elems.searchInput.focus();
					break;
				case 'g':
				case 'Home':
					focusElem(firstCard());
					break;
				case 'G':
				case 'End':
					focusElem(lastCard());
					break;
				case 'ArrowDown':
				case 'j':
				case 'J':
					const cardUp = nextElem(card) ?? firstCard();
					focusElem(cardUp);
					if (ev.shiftKey) cardUp.click();
					break;
				case 'ArrowUp':
				case 'k':
				case 'K':
					const cardDown = prevElem(card) ?? lastCard();
					focusElem(cardDown);
					if (ev.shiftKey) cardDown.click();
					break;
				case 'ArrowRight':
				case 'ArrowLeft':
				case 'l':
				case 'h':
					buffer.focus(true);
					break;
				case 'w':
					focusOffClassCard(card, 'modified', nextElem);
					break;
				case 'W':
					focusOnClassCard(card, 'modified', nextElem);
					break;
				case 'e':
					focusOnClassCard(card, 'can_merge', nextElem)
					break;
				case 'E':
					focusOnClassCard(card, 'can_merge', prevElem)
					break;
				case 'b':
					focusOffClassCard(card, 'modified', prevElem);
					break;
				case 'B':
					focusOnClassCard(card, 'modified', prevElem);
					break;
				case 'Enter':
					await clickHandler();
					buffer.focus();
					break;
				case 'u':
					await buttonHandler(es_id, 1);
					break;
				case 'i':
					await buttonHandler(es_id, 2);
					break;
			}
		},
	},
	buffer: {
		button: async (button, ev) => {
			const canFocus = button => button && !button.disabled;
			const cards = () => document.getElementsByClassName('entry');
			switch (ev.key) {
				case 'ArrowDown':
				case 'j':
					const nextTarget = canFocus(nextElem(button)) ? nextElem(button) : cards()[0];
					if (!nextTarget) break;
					focusElem(nextTarget);
					break;
				case 'ArrowUp':
				case 'k':
					const prevTarget = canFocus(prevElem(button)) ? prevElem(button) : cards()[cards().length - 1];
					if (!prevTarget) break;
					focusElem(prevTarget);
					break;
				case 'Enter':
					button.click();
					break;
				default:
					await KeydownHandlers.buffer.generic(ev);
					break;
			}
		},
		card: async (card, ev, clickHandler) => {
			const canFocus = (card) => card && !card.classList.contains('disabled');
			const buttons = buffer.buttons.filter(button => !button.disabled);
			switch (ev.key) {
				case 'ArrowDown':
				case 'j':
					const nextTarget = nextElem(card);
					if (canFocus(nextTarget)) {
						focusElem(nextTarget);
						break;
					}
					if (buttons[0]) focusElem(buttons[0]);
					break;
				case 'ArrowUp':
				case 'k':
					const prevTarget = prevElem(card);
					if (canFocus(prevTarget)) {
						focusElem(prevTarget);
						break;
					}
					if (buttons.at(-1)) focusElem(buttons.at(-1));
					break;
				case 'Enter':
					await clickHandler();
					if (!ev.shiftKey) sidebar.focus();
					break;
				default:
					await KeydownHandlers.buffer.generic(ev);
					break;
			}
		},
		generic: async ev => {
			const buttons = buffer.buttons;
			const clickButton = (i) => {
				if (!buttons[i].disabled) buttons[i].click();
			}
			switch (ev.key) {
				case 'ArrowLeft':
				case 'ArrowRight':
				case 'Escape':
				case 'q':
				case 'l':
				case 'h':
					sidebar.focus();
					break;
				case 'm':
					clickButton(0);
					break;
				case 'u':
					clickButton(1);
					break;
				case 'i':
					clickButton(2);
					break;
				case 'o':
					await sentenceModal.open();
					break;
			}
		}
	},
	mergeModal: {
		searchInput: ev => {
			switch (ev.key) {
				case 'Enter':
				case 'Escape':
					const cards = Object.values(mergeModal.modalItems);
					if (cards.length) focusElem(cards[0]);
					break;
			}
		},
		card: async (card, ev, clickHandler) => {
			switch (ev.key) {
				case 's':
					mergeModal.modalSearchInput.focus();
					break;
				case 'ArrowDown':
				case 'j':
					focusElem(nextElem(card));
					break;
				case 'ArrowUp':
				case 'k':
					focusElem(prevElem(card));
					break;
				case 'q':
				case 'Escape':
					mergeModal.cancel();
					break
				case 'Enter':
					if (ev.ctrlKey) await mergeModal.confirm();
					else clickHandler(ev);
					break;
			}
		}
	},
	sentenceModal: {
		modal: (ev) => {
			switch (ev.key) {
				case 'o':
				case 'Escape':
					sentenceModal.close();
					break;
			}
		}
	}
}

class Sidebar {
	constructor() {
		this.elems = {
			searchInput: document.getElementById('searchInput'),
			searchResults: document.getElementById('searchResults'),
			searchResultCount: document.getElementById('searchResultCount')
		}

		this.wordTypes = {};
		this.allWordBuffers = null
		this.wordBuffers = null;
		this.selected = null;

		this.elems.searchInput.oninput = eventHandler(async ev => {
			await asyncHandler('SIDEBAR SEARCH', async () => {
				const text = ev.target.value;
				const wordBuffers = !text ? this.allWordBuffers : await WordBuffer.find(text);
				if (!wordBuffers) throw new Error(`Failed to search word '${text}'`);

				this.wordBuffers = wordBuffers;
				this.renderSearchResults();
			})
		});
		this.elems.searchInput.addEventListener('keydown', ev => {
			KeydownHandlers.sidebar.searchInput(ev);
		});

		document.querySelector('div.sidebar-header').onclick = eventHandler(ev => {
			if (ev.target !== this.elems.searchInput) this.focus();
		});
	}
	async load() {
		const wordTypes = await asyncHandler('SIDEBAR LOAD WORD TYPES', async () => await WordType.find());
		if (!wordTypes) return;

		wordTypes.forEach(({ wt_name, wt_description }) => {
			this.wordTypes[wt_name] = wt_description ? `${wt_name} - ${wt_description}` : wt_name;
		});

		const wordBuffers = await asyncHandler('SIDEBAR LOAD ALL WORDS', async () => await WordBuffer.find());
		if (!wordBuffers) return;

		this.allWordBuffers = wordBuffers;
		this.wordBuffers = wordBuffers;
	}
	async selectWord(wordBuffer) {
		if (this.selected) {
			const card = document.querySelector(`[data-id="${wordId(this.selected)}"]`);
			card?.classList?.remove('active');
		}

		this.selected = wordBuffer;
		const card = document.querySelector(`[data-id="${wordId(this.selected)}"]`);
		card?.classList?.add('active');
		focusElem(card);

		const params = new URLSearchParams(window.location.search);
		params.set('select', this.selected.w_basic_form);
		params.set('wt_name', this.selected.wt_name);
		window.history.replaceState({}, '', `${window.location.pathname}?${params}`);

		await buffer.setWord(this.selected);
	}
	renderSearchResults() {
		this.elems.searchResults.innerHTML = '';
		for (let i = 0; i < this.wordBuffers.length; i++) {
			this.elems.searchResults.appendChild(this.createSearchItem(i + 1, this.wordBuffers[i]));
		}
		if (this.selected) {
			const card = document.querySelector(`[data-id="${wordId(this.selected)}"]`);
			card?.classList?.add('active');
		}
	}
	createSearchItem(index, wordBuffer) {
		const { w_basic_form, wt_name, j_response } = wordBuffer;
		const es_id = wordId(wordBuffer);

		const card = createElement('div', 'search-item');
		card.dataset.id = es_id;

		const searchItemContents = createElement('div', 'search-item-contents');
		searchItemContents.appendChild(createElement('div', 'search-word', w_basic_form));
		searchItemContents.appendChild(createElement('div', 'search-word-type', `${this.wordTypes[wt_name]}`));
		card.appendChild(searchItemContents);

		const searchItemTags = createElement('div', 'search-item-tags');
		[['M', 'merged'], ['U', 'unsure'], ['I', 'ignore']].forEach(([text, className]) => {
			const tag = createElement('div', `search-tag-${className}`, text);
			searchItemTags.appendChild(tag);
		});
		card.appendChild(searchItemTags);

		const entryState = buffer.entryStates.get(es_id);
		(() => {
			if (!entryState) return;

			const { state, ignore, merged_with, can_merge } = entryState;
			if (state.size || ignore || merged_with) setClass(card, 'modified', true);
			if (can_merge) setClass(card, 'can_merge', true);
			if (entryState.ignore) return setClass(card, 'ignore', true);
			if (entryState.merged_with) return setClass(card, 'merged', true);
			if (entryState.unsure) setClass(card, 'unsure', true);
		})();
		if (j_response.length === 1) setClass(card, 'unique', true);
		if (j_response.length === 0) setClass(card, 'error', true);

		const clickHandler = async () => {
			await this.selectWord(wordBuffer);
		}
		card.onclick = eventHandler(async () => await clickHandler());
		card.addEventListener('keydown', eventHandler(async ev => {
			await KeydownHandlers.sidebar.card(card, ev, es_id, clickHandler);
		}));

		const countUpdateHandler = () => {
			this.elems.searchResultCount.textContent = `${index} / ${this.wordBuffers.length}`
		}
		card.onfocus = countUpdateHandler;
		card.onmouseenter = countUpdateHandler;
		focusable(card);

		return card;
	}
	focus() {
		const card = document.querySelector(`[data-id="${wordId(this.selected)}"]`);
		if (card) return focusElem(card);

		const cards = document.getElementsByClassName('search-item');
		if (!cards.length) return;

		focusElem(cards[0]);
	}
}

class EntryStates {
	constructor() {
		this.entryStates = {};
	}
	async load() {
		await asyncHandler('ENTRY STATE LOAD', async () => {
			const entryStates = await EntryState.findAll();
			if (!entryStates) throw new Error('Failed to load entry states');
			if (!entryStates.length) return;

			for (const entryState of entryStates) {
				const es_id = entryState.es_id;
				this.entryStates[es_id] = this.toModel(entryState);
			}
		})
	}
	async init(es_id) {
		return await asyncHandler('ENTRY STATE INIT', async () => {
			if (!this.entryStates[es_id]) {
				const entryState = await EntryState.create({ es_id });
				if (!entryState) throw new Error('Failed to initialize entry state');

				this.entryStates[es_id] = this.toModel(entryState);
			}

			return this.get(es_id);
		});
	}
	get(es_id) {
		return this.entryStates[es_id];
	}
	async set(es_id, body) {
		return await asyncHandler('ENTRY STATE SET', async () => {
			if (!this.entryStates[es_id]) throw new Error('Failed to set entry state. Entry state must be initialized');

			const updatedEntryState = await EntryState.update(es_id, body);
			if (!updatedEntryState) throw new Error(`Failed to set entry state [${es_id}]`);

			this.entryStates[es_id] = this.toModel(updatedEntryState);
			return this.entryStates[es_id];
		})
	}
	toModel(entryState) {
		delete entryState.es_id;
		return entryState;
	}
}

class Buffer {
	constructor() {
		this.elems = {
			mainContent: document.querySelector('main.content'),
			basicForm: document.getElementById("basicForm"),
			tokenId: document.getElementById("tokenId"),
			wordType: document.getElementById("wordType"),
			entryCount: document.getElementById("count"),
			occurrenceCount: document.getElementById("occurrence"),
			mergeCount: document.getElementById("mergeCount"),
			mergeWith: document.getElementById("mergeWith"),
			container: document.getElementById("entries"),
			headerActions: document.getElementById("headerActions")
		}

		this.selected = null;
		this.wordBuffer = null;
		this.entryStates = new EntryStates();
		this.buttons = [];

		this.elems.mainContent.onclick = eventHandler(ev => {
			if (ev.target === this.elems.mainContent) this.focus();
		});
	}
	async setWord(wordBuffer) {
		this.selected = wordBuffer;
		const es_id = wordId(this.selected);

		const entryState = this.entryStates.get(es_id);
		if (entryState?.merged_with) {
			this.elems.container.innerHTML = '';
			const [w_basic_form, wt_name] = entryState.merged_with.split('_');
			const wordBuffer = await WordBuffer.findOne(w_basic_form, wt_name);
			if (!wordBuffer) return;

			this.wordBuffer = wordBuffer;
			this.renderHeader();
			this.renderEntries(true);
			return;
		}
		this.wordBuffer = this.selected;
		this.renderHeader();
		this.renderEntries();
	}
	renderHeader() {
		const { token_ids, w_basic_form, wt_name, j_response, occurrence_count } = this.selected;
		const { basicForm, tokenId, wordType, occurrenceCount, entryCount, headerActions } = this.elems;
		basicForm.textContent = w_basic_form;
		tokenId.textContent = `Tokens: ${token_ids}`;
		wordType.textContent = sidebar.wordTypes[wt_name];
		occurrenceCount.textContent = `Book occurrences: ${occurrence_count}`;
		entryCount.textContent = `Dictionary entries: ${j_response.length}`;

		this.renderMergeBadges();

		headerActions.innerHTML = '';
		for (const button of this.createHeaderActions()) {
			headerActions.appendChild(button);
		}
	}
	renderMergeBadges() {
		const { w_basic_form, wt_name } = this.wordBuffer;
		const { mergeCount, mergeWith } = this.elems;
		const entryState = this.entryStates.get(wordId(this.selected));

		const showBadge = (badge, text) => {
			setClass(badge, 'hidden', false);
			badge.textContent = text;
		}
		const hideBadge = (badge) => {
			setClass(badge, 'hidden', true);
			badge.textContent = '';
		}

		if (entryState?.merged_with) {
			hideBadge(mergeCount);
			showBadge(mergeWith, `Merged with: ${w_basic_form}  [ ${wt_name} ]`);
			return;
		}
		hideBadge(mergeWith);

		if (entryState?.can_merge) showBadge(mergeCount, `Merge possibilities: ${entryState.can_merge}`);
		else hideBadge(mergeCount);
	}
	renderEntries(disabled) {
		const { j_response } = this.wordBuffer;
		this.elems.container.innerHTML = '';
		for (let i = 0; i < j_response.length; i++) {
			const entry = j_response[i];
			this.elems.container.appendChild(this.createEntry(entry, i, disabled));
		}
	}
	syncButtonState(es_id, buttons) {
		if (es_id !== wordId(this.selected)) return;

		const entryState = this.entryStates.get(es_id);
		if (!entryState) return;

		const [btnMergeWith, btnUnsure, btnIgnore] = buttons ?? this.buttons;
		const { merged_with, unsure, ignore } = entryState;
		if (ignore) {
			setClass(btnIgnore, 'selected', true);
			btnMergeWith.disabled = true;
			btnUnsure.disabled = true;
			return;
		}
		setClass(btnIgnore, 'selected', false);
		btnMergeWith.disabled = false;

		if (merged_with) {
			if (setClass(btnMergeWith, 'selected', true)) btnMergeWith.textContent = 'Unmerge';
			btnUnsure.disabled = true;
			btnIgnore.disabled = true;
			return;
		}
		if (setClass(btnMergeWith, 'selected', false)) btnMergeWith.textContent = 'Merge';
		btnUnsure.disabled = false
		btnIgnore.disabled = false;

		if (unsure) return setClass(btnUnsure, 'selected', true);
		setClass(btnUnsure, 'selected', false);
	}
	createHeaderActions() {
		const es_id = wordId(this.selected);

		this.buttons = this.createButtons(es_id).buttons;
		this.buttons.forEach(button => {
			focusable(button);
			button.addEventListener('keydown', eventHandler(async ev => {
				await KeydownHandlers.buffer.button(button, ev);
			}));
		});

		return this.buttons;
	}
	createButtons(es_id) {
		const btnMergeWith = createElement('button', 'header-btn', 'Merge');
		const btnMergeWithHandler = async () => {
			const entryState = await this.entryStates.init(es_id);
			if (!entryState) return;

			if (entryState.merged_with) {
				const es_id2 = entryState.merged_with;
				const can_merge1 = mergeModal.transformWords(es_id, sidebar.allWordBuffers).top.length;
				const updatedEntryState = await this.entryStates.set(es_id, { merged_with: null, can_merge: can_merge1 });
				if (!updatedEntryState) return;

				const can_merge2 = mergeModal.transformWords(es_id2, sidebar.allWordBuffers).top.length;
				const updatedEntryState2 = await buffer.entryStates.set(es_id2, { can_merge: can_merge2 });
				if (!updatedEntryState2) return;

				sidebar.renderSearchResults(sidebar.wordBuffers);
				this.syncButtonState(es_id, buttons);
				this.wordBuffer = sidebar.selected;
				this.renderMergeBadges();
				this.renderEntries();
				focusElem(btnMergeWith);
				this.focus();
				return;
			}

			focusElem(btnMergeWith);
			this.focus();
			await mergeModal.open(this.selected);
		}
		btnMergeWith.onclick = eventHandler(btnMergeWithHandler);

		const btnUnsure = createElement('button', 'header-btn', 'Unsure');
		const btnUnsureHandler = async () => {
			const entryState = await this.entryStates.init(es_id);
			if (!entryState) return;

			const unsure = !entryState.unsure;
			const updatedEntryState = await this.entryStates.set(es_id, { unsure });
			if (!updatedEntryState) return;

			sidebar.renderSearchResults(sidebar.wordBuffers);
			this.syncButtonState(es_id, buttons);
			focusElem(btnUnsure);
			this.focus()
		}
		btnUnsure.onclick = eventHandler(btnUnsureHandler);

		const btnIgnore = createElement('button', 'header-btn', 'Ignore');
		const btnIgnorHandler = async () => {
			const entryState = await this.entryStates.init(es_id);
			if (!entryState) return;

			const ignore = !entryState.ignore;
			const updatedEntryState = await this.entryStates.set(es_id, { ignore });
			if (!updatedEntryState) return;

			sidebar.renderSearchResults(sidebar.wordBuffers);
			this.syncButtonState(es_id, buttons);
			focusElem(btnIgnore); // Ensure button is visible
			this.focus();
		}
		btnIgnore.onclick = eventHandler(btnIgnorHandler);

		const buttons = [btnMergeWith, btnUnsure, btnIgnore];
		const handlers = [btnMergeWithHandler, btnUnsureHandler, btnIgnorHandler];

		this.syncButtonState(es_id, buttons);

		return { buttons, handlers };
	}
	async toggleEntry(card, i) {
		const es_id = wordId(this.selected);
		const entryState = await this.entryStates.init(es_id);
		if (!entryState) return;

		const state = new Set(Array.from(entryState.state)); // copy of set instead of reference

		if (hasClass(card, 'selected')) {
			// Toggle off
			if (!state.size) {
				setClass(card, 'selected', false);
				return;
			}

			state.delete(i);
			const can_merge = mergeModal.transformWords(es_id, sidebar.allWordBuffers, { targetState: state }).top.length;
			const updatedEntryState = await this.entryStates.set(es_id, { state, can_merge });
			if (!updatedEntryState) return;

			setClass(card, 'selected', false);
			return;
		}

		// Toggle on
		state.add(i);
		const can_merge = mergeModal.transformWords(es_id, sidebar.allWordBuffers, { targetState: state }).top.length;
		const updatedEntryState = await this.entryStates.set(es_id, { state, can_merge });
		if (!updatedEntryState) return;

		setClass(card, 'selected', true);
	}
	createEntry(entry, i, disabled) {
		const card = createElement("div", "entry");
		card.appendChild(this.createEntryHeader(entry));
		card.appendChild(this.createJapaneseSection(entry.japanese));
		card.appendChild(this.createMeaningSection(entry.senses));

		const entryState = this.entryStates.get(wordId(this.wordBuffer));
		if (entryState?.state && entryState.state.has(i)) setClass(card, 'selected', true);
		if (entry.tags.length > 0) card.appendChild(this.createDictionaryTags(entry.tags));

		if (disabled) {
			setClass(card, 'disabled', true);
			return card;
		}

		const clickHandler = async () => {
			await this.toggleEntry(card, i);

			this.renderMergeBadges();
			sidebar.renderSearchResults(sidebar.wordBuffers);
		}
		card.onclick = eventHandler(clickHandler);
		card.addEventListener('keydown', eventHandler(async ev => {
			await KeydownHandlers.buffer.card(card, ev, clickHandler);
		}));
		focusable(card);

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
	createJapaneseSection(japaneseWords) {
		const section = this.createSection("Forms");

		japaneseWords.forEach((word) => {
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
	focus(selected) {
		const es_id = wordId(this.selected);
		if (!this.entryStates.get(es_id)?.merged_with) {
			if (selected) {
				const cards = document.querySelectorAll('.entry.selected');
				if (cards.length) {
					focusElem(cards[0]);
					return;
				}
			}
			const cards = document.querySelectorAll('.entry');
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
}

class MergeModal {
	constructor() {
		this.elems = {
			mergeModal: document.getElementById('mergeModal'),
			mergeModalTargetWord: document.getElementById('mergeModalTargetWord'),
			mergeModalSelectedWord: document.getElementById('mergeModalSelectedWord'),
			mergeModalSearchInput: document.getElementById('mergeModalSearchInput'),
			mergeModalList: document.getElementById('mergeModalList'),
			mergeModalCancel: document.getElementById('mergeModalCancel'),
			mergeModalConfirm: document.getElementById('mergeModalConfirm'),
		}

		this.modalItems = {};
		this.selected = null;
		this.target = null

		this.elems.mergeModalSearchInput.oninput = eventHandler(async ev => {
			await asyncHandler('MERGE MODAL SEARCH', async () => {
				const text = ev.target.value;
				const wordBuffers = !text ? sidebar.allWordBuffers : await WordBuffer.find(text);
				if (!wordBuffers) throw new Error(`Failed to search word '${text}'`);

				const { bottom } = mergeModal.transformWords(wordId(this.target), wordBuffers, { sort: false });

				this.renderModelItems(bottom);
			})
		});
		this.elems.mergeModalSearchInput.addEventListener('keydown', async ev => {
			KeydownHandlers.mergeModal.searchInput(ev);
		});
		this.elems.mergeModalCancel.onclick = eventHandler(() => {
			this.cancel();
		});
		this.elems.mergeModalConfirm.onclick = eventHandler(async () => {
			await this.confirm();
		});
		this.elems.mergeModalConfirm.disabled = true;
	}
	async open(wordBuffer) {
		const { w_basic_form, wt_name } = wordBuffer;
		const { mergeModal, mergeModalTargetWord, mergeModalSelectedWord } = this.elems;

		mergeModalTargetWord.textContent = `${w_basic_form} [${wt_name}]`;
		mergeModalSelectedWord.textContent = '';
		this.target = wordBuffer;

		await asyncHandler('MERGE MODAL OPEN', () => {
			const wordBuffers = sidebar.allWordBuffers;
			if (!wordBuffers) throw new Error('Failed to open merge modal. Unable to find word buffers');

			const { top, bottom } = this.transformWords(wordId(this.target), wordBuffers);
			const sorted = [...top, ...bottom];

			this.renderModelItems(sorted);

			setClass(mergeModal, 'open', true);
			const cards = Object.values(this.modalItems);
			if (cards.length) {
				focusElem(cards[0]);
				cards[0].click();
			}
		});
	}
	cancel() {
		const { mergeModal, mergeModalTargetWord, mergeModalSelectedWord, mergeModalSearchInput, mergeModalList } = this.elems;

		mergeModalTargetWord.textContent = '';
		mergeModalSelectedWord.textContent = '';
		mergeModalSearchInput.value = '';
		mergeModalList.innerHTML = '';

		this.modalItems = {};
		this.target = null;
		this.selected = null;

		setClass(mergeModal, 'open', false);
		focusElem(buffer.buttons[0]);
	}
	async confirm() {
		if (!this.selected) return;

		const [es_id1, es_id2] = [wordId(this.target), wordId(this.selected)];
		const updatedEntryState1 = await buffer.entryStates.set(es_id1, { merged_with: es_id2, can_merge: 0 });
		if (!updatedEntryState1) return;

		const can_merge = mergeModal.transformWords(es_id2, sidebar.allWordBuffers).top.length;
		const updatedEntryState2 = await buffer.entryStates.set(es_id2, { can_merge });
		if (!updatedEntryState2) return;

		sidebar.renderSearchResults();
		buffer.syncButtonState(es_id1);
		buffer.wordBuffer = this.selected;
		buffer.renderMergeBadges()
		buffer.renderEntries(true);

		this.cancel();
	}
	renderModelItems(wordBuffers) {
		this.elems.mergeModalList.innerHTML = '';
		wordBuffers.forEach(wordBuffer => {
			const es_id = wordId(wordBuffer);
			this.modalItems[es_id] = this.createModalItem(wordBuffer);
			this.elems.mergeModalList.appendChild(this.modalItems[es_id]);
		});
		const firstModalItem = Object.values(this.modalItems)?.[0];
		if (firstModalItem) firstModalItem.click();
	}
	createModalItem(wordBuffer) {
		const { w_basic_form, wt_name } = wordBuffer;
		const { mergeModalSelectedWord, mergeModalConfirm } = this.elems;
		const card = createElement('div', 'modal-item');
		card.appendChild(createElement('div', 'modal-item-word', w_basic_form));
		card.appendChild(createElement('div', 'modal-item-type', wt_name));
		focusable(card);
		const clickHandler = () => {
			const cards = document.getElementsByClassName('modal-item');
			if (!cards) return;

			this.selected = wordBuffer;
			mergeModalSelectedWord.textContent = `${w_basic_form} [${wt_name}]`;
			mergeModalConfirm.disabled = false;

			Object.values(cards).forEach(card => {
				setClass(card, 'selected', false);
			});

			setClass(card, 'selected', true);
		};
		card.onclick = eventHandler(clickHandler);
		card.addEventListener('keydown', eventHandler(async ev => {
			await KeydownHandlers.mergeModal.card(card, ev, clickHandler);
		}));

		return card;
	}
	transformWords(es_id, wordBuffers, opts) {
		const [w_basic_form, wt_name] = es_id.split('_'); // target word params
		const isTargetWord = word => word.w_basic_form === w_basic_form && word.wt_name === wt_name;
		const filteredWords = wordBuffers.filter(word => !isTargetWord(word));

		const sort = opts?.sort ?? true;
		if (!sort) return { top: [], bottom: filteredWords };

		const getEntries = (word, state) => {
			if (!state) return undefined;
			return word.j_response.filter((_, i) => Array.from(state).includes(i));
		}
		const [targetWord] = wordBuffers.filter(isTargetWord);
		const targetState = opts?.targetState ?? buffer.entryStates.get(wordId(targetWord))?.state;
		const targetEntries = getEntries(targetWord, targetState);
		if (!targetEntries?.length) return { top: [], bottom: filteredWords };

		const isMergedWord = word => {
			const es_id = wordId(word);
			const entryState = buffer.entryStates.get(es_id);
			return entryState && entryState.merged_with;
		}
		const isTopWord = word => {
			if (isMergedWord(word)) return false;

			const state = buffer.entryStates.get(wordId(word))?.state;
			const entries = getEntries(word, state);
			if (!entries?.length) return false;

			return targetEntries.every(targetEntry => entries.some(entry => entry.slug === targetEntry.slug));
		};
		return { top: filteredWords.filter(isTopWord), bottom: filteredWords.filter(word => !isTopWord(word)) };
	}
}

class SentenceModal {
	constructor() {
		this.elems = {
			sentenceModal: document.getElementById('sentenceModal'),
			sentenceModalReferenceWord: document.getElementById('sentenceModalReferenceWord'),
			sentenceModalList: document.getElementById('sentenceModalList'),
		}

		this.elems.sentenceModal.onclick = eventHandler(ev => {
			if (ev.target === this.elems.sentenceModal) {
				this.close();
				buffer.focus();
			}
		});
		this.elems.sentenceModal.addEventListener('keydown', eventHandler(ev => {
			KeydownHandlers.sentenceModal.modal(ev);
		}));
		focusable(this.elems.sentenceModal);

		this.elems.sentenceModalList.addEventListener('wheel', eventHandler(ev => {
			if (ev.deltaY === 0) return;
			this.elems.sentenceModalList.scrollLeft -= ev.deltaY;
		}));
	}
	async open() {
		const wordBuffer = buffer.selected
		const { sentenceModalReferenceWord, sentenceModal } = this.elems;
		await asyncHandler('SENTENCE MODAL OPEN', async () => {
			const { w_basic_form, wt_name } = wordBuffer;
			const sentenceBuffers = await SentenceBuffer.find(w_basic_form, wt_name);
			if (!sentenceBuffers) throw new Error('Failed to open sentence modal. Unable to find sentence buffers');

			this.renderModalItems(sentenceBuffers);
			sentenceModalReferenceWord.textContent = `${w_basic_form} [ ${wt_name} ]`;
			setClass(sentenceModal, 'open', true);

			focusElem(sentenceModal);
		});
	}
	close() {
		const { sentenceModal, sentenceModalReferenceWord, sentenceModalList } = this.elems;
		setClass(sentenceModal, 'open', false);
		sentenceModalReferenceWord.textContent = '';
		sentenceModalList.innerHTML = '';

		buffer.focus();
	}
	renderModalItems(sentenceBuffers) {
		this.elems.sentenceModalList.innerHTML = '';
		for (const sentenceBuffer of sentenceBuffers) {
			this.elems.sentenceModalList.appendChild(this.createModalItem(sentenceBuffer));
		}
	}
	createModalItem(sentenceBuffer) {
		const { section_no, sentence_no, sentence_text } = sentenceBuffer;
		const card = createElement('div', 'modal-item');
		card.appendChild(createElement('div', 'modal-item-header', `${section_no}:${sentence_no}`));
		const modalItemText = createElement('div', 'modal-item-text');
		modalItemText.innerHTML = sentence_text;
		card.appendChild(modalItemText);

		return card
	}
	boldWordSentence(word, sentence) {
		if (!word) return sentence;

		const chars = Array.from(sentence);
		const wordChars = Array.from(word);
		let result = "";
		let i = 0;

		while (i < chars.length) {
			let matched = false;

			for (let len = wordChars.length; len >= 1; len--) {
				const candidate = chars.slice(i, i + len).join("");
				const target = wordChars.slice(0, len).join("");
				if (candidate === target) {
					result += `<b>${candidate}</b>`;
					i += len;
					matched = true;
					break;
				}
			}

			if (!matched) {
				result += chars[i];
				i++;
			}
		}

		return result;
	}
}

const buffer = new Buffer();
const sidebar = new Sidebar();
const mergeModal = new MergeModal();
const sentenceModal = new SentenceModal();

asyncHandler('MAIN INIT', async () => {
	await buffer.entryStates.load();
	await sidebar.load();
	const wordBuffers = await asyncHandler('SIDEBAR INIT', async () => {
		const wordBuffers = sidebar.allWordBuffers;
		sidebar.renderSearchResults(wordBuffers);

		const params = (() => {
			const params = new URLSearchParams(window.location.search);
			return { select: params.get('select'), wt_name: params.get('wt_name') }
		})();

		if (!params.select && !params.wt_name) return wordBuffers;
		if (!params.wt_name) return wordBuffers.filter(({ w_basic_form }) => w_basic_form === params.select);
		return wordBuffers.filter(({ w_basic_form, wt_name }) => w_basic_form === params.select && wt_name === params.wt_name);
	});
	if (!wordBuffers.length) throw new Error(`Failed to load data. No data found`);

	sidebar.selectWord(wordBuffers[0]);
});
