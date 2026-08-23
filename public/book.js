import { BookBuffer, JishoBuffer, SentenceBuffer, TokenBuffer, WordBuffer } from "./api.helper.js";
import { asyncHandler, createElement, eventHandler, focusElem, setClass } from "./tools.helper.js";

const isEditable = elem => {
	return elem instanceof HTMLElement && (elem.matches('input, textarea, select') || elem.isContentEditable);
}

const KeydownHandlers = {
	page: ev => {
		if (isEditable(ev.target) || document.querySelector('.overlay.open')) return;
		if (buffer.isReady()) return KeydownHandlers.ready(ev);
		if (buffer.isSetup()) return KeydownHandlers.setup.page(ev);
		if (buffer.isSummary()) return KeydownHandlers.summary(ev);
	},
	ready: ev => {
		switch (ev.key) {
			case 'u':
				if (buffer.elems.btnUpload.disabled) return;
				ev.preventDefault();
				buffer.elems.btnUpload.click();
				break;
		}
	},
	setup: {
		bookName: async ev => {
			if (ev.key !== 'Enter' || buffer.elems.btnSetupNext.disabled) return;

			ev.preventDefault();
			await buffer.next();
		},
		page: ev => {
			if (ev.key !== 'd' || buffer.elems.btnDiscard.disabled) return;

			ev.preventDefault();
			buffer.elems.btnDiscard.click();
		}
	},
	sections: {
		nav: (nav, ev) => {
			const navs = Array.from(document.getElementsByClassName('section-nav'));
			const index = navs.indexOf(nav);
			if (index < 0) return;

			let nextNav;
			switch (ev.key) {
				case 'j':
				case 'ArrowDown':
					nextNav = navs[(index + 1) % navs.length];
					break;
				case 'k':
				case 'ArrowUp':
					nextNav = navs[(index - 1 + navs.length) % navs.length];
					break;
				case 'g':
				case 'Home':
					nextNav = navs[0];
					break;
				case 'G':
				case 'End':
					nextNav = navs.at(-1);
					break;
				case 'h':
				case 'ArrowLeft':
					ev.preventDefault();
					buffer.scrollSectionPreview(-1);
					return;
				case 'l':
				case 'ArrowRight':
					ev.preventDefault();
					buffer.scrollSectionPreview(1);
					return;
				case 'x':
				case ' ':
					ev.preventDefault();
					buffer.toggleFocusedSection(Number(nav.dataset.sectionNo));
					return;
				case 'c':
					ev.preventDefault();
					if (!buffer.elems.btnNextBuffer.disabled) buffer.elems.btnNextBuffer.click();
					return;
				case 'q':
					ev.preventDefault();
					if (!buffer.elems.btnPrevBuffer.disabled) buffer.elems.btnPrevBuffer.click();
					return;
				case 'd':
					ev.preventDefault();
					if (!buffer.elems.btnDiscard.disabled) buffer.elems.btnDiscard.click();
					return;
				default:
					return;
			}

			ev.preventDefault();
			if (nextNav) buffer.focusSectionNav(Number(nextNav.dataset.sectionNo));
		}
	},
	summary: ev => {
		if (ev.key !== 'c' || buffer.elems.btnNextBuffer.disabled) return;

		ev.preventDefault();
		buffer.elems.btnNextBuffer.click();
	},
	overlays: {
		error: ev => {
			if (ev.key !== 'Escape' && ev.key !== 'q') return;

			ev.preventDefault();
			errorOverlay.close();
		},
		discard: ev => {
			switch (ev.key) {
				case 'Escape':
				case 'q':
					ev.preventDefault();
					discardOverlay.close();
					break;
				case 'c':
					if (discardOverlay.elems.btnDiscardConfirm.disabled) return;
					ev.preventDefault();
					discardOverlay.elems.btnDiscardConfirm.click();
					break;
			}
		}
	}
}

const getSections = bookBuffer => {
	try {
		return JSON.parse(bookBuffer.sections);
	} catch (_) {
		return [];
	}
}

const formatElapsed = t_elapsed_ms => {
	if (typeof t_elapsed_ms !== 'number') return '-';

	const seconds = Math.round(t_elapsed_ms / 100) / 10;
	return `${seconds}s`;
}

const formatStatus = status => `${status[0].toUpperCase()}${status.slice(1)}`;

class ErrorOverlay {
	constructor() {
		this.elems = {
			errorOverlay: document.getElementById('errorOverlay'),
			errorOverlayMessage: document.getElementById('errorOverlayMessage'),
			btnErrorClose: document.getElementById('btnErrorClose'),
		}

		this.lastFocused = null;
		this.elems.errorOverlay.addEventListener('keydown', ev => KeydownHandlers.overlays.error(ev));
		this.elems.btnErrorClose.onclick = eventHandler(() => this.close());
		this.elems.errorOverlay.onclick = eventHandler(ev => {
			if (ev.target === this.elems.errorOverlay) this.close();
		});
	}
	open(message) {
		this.lastFocused = document.activeElement;
		this.elems.errorOverlayMessage.textContent = message;
		setClass(this.elems.errorOverlay, 'open', true);
		this.focus();
	}
	isOpen() {
		return this.elems.errorOverlay.classList.contains('open');
	}
	focus() {
		focusElem(this.elems.btnErrorClose);
	}
	close() {
		this.elems.errorOverlayMessage.textContent = '';
		setClass(this.elems.errorOverlay, 'open', false);
		this.restoreFocus();
	}
	restoreFocus() {
		const elem = this.lastFocused;
		this.lastFocused = null;
		if (elem && elem !== document.body && elem.isConnected && !elem.disabled && elem.getClientRects().length) {
			focusElem(elem);
			return;
		}

		this.elems.btnErrorClose.blur();
		buffer.focusCurrentContext(true);
	}
}

class DiscardOverlay {
	constructor() {
		this.elems = {
			discardOverlay: document.getElementById('discardOverlay'),
			btnDiscardCancel: document.getElementById('btnDiscardCancel'),
			btnDiscardConfirm: document.getElementById('btnDiscardConfirm'),
		}

		this.lastFocused = null;
		this.elems.discardOverlay.addEventListener('keydown', ev => KeydownHandlers.overlays.discard(ev));
		this.elems.btnDiscardCancel.onclick = eventHandler(() => this.close());
		this.elems.btnDiscardConfirm.onclick = eventHandler(async () => {
			await buffer.discard();
		});
		this.elems.discardOverlay.onclick = eventHandler(ev => {
			if (ev.target === this.elems.discardOverlay) this.close();
		});
	}
	open() {
		this.lastFocused = document.activeElement;
		setClass(this.elems.discardOverlay, 'open', true);
		this.focus();
	}
	isOpen() {
		return this.elems.discardOverlay.classList.contains('open');
	}
	focus() {
		focusElem(this.elems.btnDiscardCancel);
	}
	close(restoreFocus = true) {
		setClass(this.elems.discardOverlay, 'open', false);
		if (restoreFocus) this.restoreFocus();
		else this.lastFocused = null;
	}
	restoreFocus() {
		const elem = this.lastFocused;
		this.lastFocused = null;
		if (elem && elem !== document.body && elem.isConnected && !elem.disabled && elem.getClientRects().length) {
			focusElem(elem);
			return;
		}

		this.elems.btnDiscardCancel.blur();
		buffer.focusCurrentContext(true);
	}
}

class Buffer {
	constructor() {
		this.elems = {
			bookLayout: document.querySelector('.book-layout'),
			bookStatus: document.getElementById('bookStatus'),
			uploadInput: document.getElementById('uploadInput'),
			btnUpload: document.getElementById('btnUpload'),
			btnBack: document.getElementById('btnBack'),
			btnDiscard: document.getElementById('btnDiscard'),
			bookSetupDetails: document.getElementById('bookSetupDetails'),
			selectedFile: document.getElementById('selectedFile'),
			bookName: document.getElementById('bookName'),
			btnSetupNext: document.getElementById('btnSetupNext'),
			bufferPanel: document.getElementById('bufferPanel'),
			bufferContent: document.getElementById('bufferContent'),
			btnPrevBuffer: document.getElementById('btnPrevBuffer'),
			btnNextBuffer: document.getElementById('btnNextBuffer'),
			bufferSteps: [
				document.getElementById('btnBufferSections'),
				document.getElementById('btnBufferProcessing'),
				document.getElementById('btnBufferSummary'),
			]
		}

		this.bookBuffer = null;
		this.loaded = false;
		this.bufferIndex = null;
		this.selectedFile = null;
		this.selectedSections = new Set();
		this.selectedSectionNo = null;
		this.sectionFocus = null;
		this.lastSectionNavNo = null;
		this.sentenceBuffers = [];
		this.previewLimit = 50;
		this.loadingSection = false;
		this.isUploading = false;
		this.isConfirming = false;

		this.elems.btnUpload.onclick = eventHandler(() => this.elems.uploadInput.click());
		document.addEventListener('keydown', ev => KeydownHandlers.page(ev));
		window.addEventListener('focus', () => this.restoreFocus());
		this.elems.bookLayout.addEventListener('click', ev => {
			if (ev.target.closest('a, button, input, select, textarea, [tabindex]')) return;
			this.focusCurrentContext(true);
		});
		this.elems.uploadInput.onchange = eventHandler(async ev => {
			const file = ev.target.files?.[0];
			if (!file) return;

			this.setSelectedFile(file);
			await this.upload();
		});
		this.elems.btnDiscard.onclick = eventHandler(() => discardOverlay.open());
		this.elems.bookName.oninput = eventHandler(() => {
			this.renderControls();
			this.renderNavigation();
		});
		this.elems.bookName.addEventListener('keydown', async ev => {
			await KeydownHandlers.setup.bookName(ev);
		});
		this.elems.btnSetupNext.onclick = eventHandler(async () => await this.next());
		this.elems.btnPrevBuffer.onclick = eventHandler(async () => await this.previous());
		this.elems.btnNextBuffer.onclick = eventHandler(async () => await this.next());
		this.elems.bufferSteps.forEach((button, i) => {
			button.onclick = eventHandler(async () => await this.selectBuffer(i));
		});
	}
	async load() {
		const bookBuffer = await BookBuffer.findCurrent();
		if (bookBuffer === undefined) {
			errorOverlay.open('Unable to load the current book. Please try again.');
			this.setBook(null);
			this.render();
			this.loaded = true;
			return;
		}

		this.setBook(bookBuffer);
		if (!bookBuffer) {
			this.bufferIndex = null;
			this.render();
			this.loaded = true;
			this.focusCurrentContext();
			return;
		}

		if (!bookBuffer.confirmed) {
			this.bufferIndex = null;
			this.elems.bookStatus.textContent = 'Enter book details';
			this.render();
			this.loaded = true;
			this.focusCurrentContext();
			return;
		}

		this.bufferIndex = 1;
		this.elems.bookStatus.textContent = 'Processing book';
		this.render();
		await processingBuffer.open(bookBuffer, true);
		if (processingBuffer.completed) {
			this.bufferIndex = 2;
			this.elems.bookStatus.textContent = 'WordBuffers ready for review';
			this.render();
		}
		this.loaded = true;
		this.focusCurrentContext();
	}
	setBook(bookBuffer) {
		this.bookBuffer = bookBuffer;
		this.selectedSections = new Set(bookBuffer ? getSections(bookBuffer) : []);
		this.selectedSectionNo = this.selectedSections.values().next().value ?? null;
		this.lastSectionNavNo = null;
		this.sentenceBuffers = [];

		this.elems.selectedFile.textContent = bookBuffer?.book_original_name ?? 'No EPUB selected';
		this.elems.bookName.value = bookBuffer?.book_name ?? '';
		this.elems.bookName.disabled = !bookBuffer || bookBuffer.confirmed;
	}
	setSelectedFile(file) {
		this.selectedFile = file ?? null;
		this.renderControls();
	}
	resetUpload() {
		this.elems.uploadInput.value = '';
		this.selectedFile = null;
		this.elems.selectedFile.textContent = 'No EPUB selected';
	}
	async upload() {
		if (!this.selectedFile || this.bookBuffer || this.isUploading) return;

		this.isUploading = true;
		this.renderControls();
		this.elems.bookStatus.textContent = 'Uploading EPUB';
		const bookBuffer = await BookBuffer.upload(this.selectedFile);
		this.isUploading = false;
		if (!bookBuffer) {
			this.resetUpload();
			this.setBook(null);
			this.bufferIndex = null;
			errorOverlay.open('Unable to upload the EPUB. Please check the file and try again.');
			this.elems.bookStatus.textContent = 'Ready to upload';
			this.render();
			return;
		}

		this.resetUpload();
		this.setBook(bookBuffer);
		this.bufferIndex = null;
		this.elems.bookStatus.textContent = 'Enter book details';
		this.render();
		focusElem(this.elems.bookName);
	}
	async discard() {
		if (!this.bookBuffer) return;

		this.elems.btnDiscard.disabled = true;
		const bookBuffer = await BookBuffer.removeCurrent();
		if (!bookBuffer) {
			errorOverlay.open('Unable to discard the current book. Please try again.');
			this.renderControls();
			return;
		}

		discardOverlay.close(false);
		processingBuffer.reset();
		this.setBook(null);
		this.bufferIndex = null;
		this.resetUpload();
		this.elems.bookStatus.textContent = 'Ready to upload';
		this.render();
		focusElem(this.elems.btnUpload);
	}
	canSelectBuffer(index) {
		if (index === 0) return !!this.bookBuffer;
		if (index === 1) return !!this.bookBuffer?.confirmed;
		if (index === 2) return !!this.bookBuffer?.confirmed && processingBuffer.completed;
		return false;
	}
	isReady() {
		return this.loaded && !this.bookBuffer && !this.isUploading;
	}
	isSetup() {
		return this.loaded && !!this.bookBuffer && !this.bookBuffer.confirmed && this.bufferIndex === null && !this.isUploading && !this.isConfirming;
	}
	isSummary() {
		return this.bufferIndex === 2 && processingBuffer.completed && !processingBuffer.running;
	}
	async selectBuffer(index) {
		if (!this.canSelectBuffer(index) || processingBuffer.running) return;

		const previousIndex = this.bufferIndex;
		this.bufferIndex = index;
		this.render();
		this.focusCurrentContext();
		if (this.bufferIndex === 0) {
			const loaded = await this.loadSection(this.selectedSectionNo);
			if (previousIndex === null && loaded) this.scrollSectionsIntoView();
		}
		if (this.bufferIndex === 1) await processingBuffer.open(this.bookBuffer, true);
	}
	selectSetup() {
		if (!this.bookBuffer || this.bookBuffer.confirmed || processingBuffer.running) return;

		this.bufferIndex = null;
		this.render();
		this.focusCurrentContext();
	}
	async previous() {
		if (processingBuffer.running) return;

		if (this.bufferIndex === 0 && !this.bookBuffer?.confirmed) {
			this.selectSetup();
			return;
		}
		if (this.bufferIndex === 1) {
			await this.selectBuffer(0);
			return;
		}
		if (this.bufferIndex === 2) await this.selectBuffer(1);
	}
	async next() {
		if (this.bufferIndex === null) {
			if (!this.bookBuffer || this.bookBuffer.confirmed) return;
			if (!this.elems.bookName.value.trim()) {
				errorOverlay.open('Book name is required before selecting sections.');
				return;
			}

			await this.selectBuffer(0);
			return;
		}
		if (this.bufferIndex === 0) {
			await this.confirm();
			return;
		}
		if (this.bufferIndex === 1 && processingBuffer.completed) {
			await this.selectBuffer(2);
			return;
		}
		if (this.bufferIndex === 2 && processingBuffer.completed) window.location.href = '/review';
	}
	async confirm() {
		if (!this.bookBuffer || this.bookBuffer.confirmed || this.isConfirming) return;

		const book_name = this.elems.bookName.value.trim();
		const sections = Array.from(this.selectedSections).sort((a, b) => a - b);
		if (!book_name) {
			errorOverlay.open('Book name is required before confirmation.');
			return;
		}
		if (!sections.length) {
			errorOverlay.open('Select at least one section before confirmation.');
			return;
		}

		this.isConfirming = true;
		this.renderControls();
		const bookBuffer = await BookBuffer.confirm({ book_name, sections });
		this.isConfirming = false;
		if (!bookBuffer) {
			errorOverlay.open('Unable to confirm the book. Please try again.');
			this.renderControls();
			return;
		}

		this.setBook(bookBuffer);
		this.bufferIndex = 1;
		this.elems.bookStatus.textContent = 'Processing book';
		this.render();
		await processingBuffer.open(bookBuffer);
		await processingBuffer.start();
	}
	toggleSection(section_no) {
		if (this.bookBuffer?.confirmed) return;

		if (this.selectedSections.has(section_no)) this.selectedSections.delete(section_no);
		else this.selectedSections.add(section_no);

		this.render();
		this.restoreSectionFocus();
	}
	toggleFocusedSection(section_no) {
		const checkbox = document.querySelector(`.checkbox[data-section-no="${section_no}"]`);
		if (checkbox?.disabled) return;

		this.setSectionFocus('nav', section_no);
		this.toggleSection(section_no);
	}
	async selectSection(section_no) {
		if (this.selectedSectionNo === section_no && this.sentenceBuffers.length) {
			this.restoreSectionFocus();
			return;
		}

		this.selectedSectionNo = section_no;
		this.sentenceBuffers = [];
		this.render();
		this.restoreSectionFocus();
		if (await this.loadSection(section_no)) this.scrollSectionsIntoView();
	}
	setSectionFocus(type, section_no) {
		this.sectionFocus = { type, section_no };
	}
	focusSectionNav(section_no = this.lastSectionNavNo ?? this.selectedSectionNo) {
		let nav = document.querySelector(`.section-nav[data-section-no="${section_no}"]`);
		if (!nav && section_no !== this.selectedSectionNo) nav = document.querySelector(`.section-nav[data-section-no="${this.selectedSectionNo}"]`);
		if (!nav) nav = document.querySelector('.section-nav');
		if (nav) this.lastSectionNavNo = Number(nav.dataset.sectionNo);
		focusElem(nav);
	}
	focusSectionCheckbox(section_no = this.selectedSectionNo) {
		const checkbox = document.querySelector(`.checkbox[data-section-no="${section_no}"]`);
		focusElem(checkbox);
	}
	restoreSectionFocus() {
		const sectionFocus = this.sectionFocus;
		this.sectionFocus = null;
		if (!sectionFocus) return;

		if (sectionFocus.type === 'nav') this.focusSectionNav(sectionFocus.section_no);
		if (sectionFocus.type === 'checkbox') this.focusSectionCheckbox(sectionFocus.section_no);
	}
	focusCurrentContext(restoreSectionFocus = false) {
		if (this.isReady()) {
			focusElem(this.elems.btnUpload);
			return;
		}
		if (this.isSetup()) {
			focusElem(this.elems.bookName);
			return;
		}
		if (this.bufferIndex === 0) {
			this.focusSectionNav(restoreSectionFocus ? undefined : this.selectedSectionNo);
			return;
		}
		if (this.bufferIndex === 2) focusElem(this.elems.btnNextBuffer);
	}
	hasMeaningfulFocus() {
		const elem = document.activeElement;
		return elem instanceof HTMLElement
			&& elem !== document.body
			&& this.elems.bookLayout.contains(elem)
			&& !elem.disabled
			&& !!elem.getClientRects().length;
	}
	restoreFocus() {
		if (!this.loaded) return;
		if (errorOverlay.isOpen()) return errorOverlay.focus();
		if (discardOverlay.isOpen()) return discardOverlay.focus();
		if (this.hasMeaningfulFocus()) return;

		this.focusCurrentContext(true);
	}
	scrollSectionsIntoView() {
		this.elems.sectionSelector?.scrollIntoView({
			behavior: 'smooth',
			block: 'start'
		});
	}
	scrollSectionPreview(direction) {
		const preview = this.elems.sectionPreview;
		if (!preview) return;

		preview.scrollBy({
			left: preview.clientWidth * .3 * direction,
			behavior: 'smooth'
		});
	}
	async loadSection(section_no) {
		if (section_no === null || section_no === undefined || this.bufferIndex !== 0) return false;

		this.loadingSection = true;
		this.renderSectionPreview();
		const sentenceBuffers = await SentenceBuffer.findBySection(section_no, this.previewLimit);
		this.loadingSection = false;
		if (!sentenceBuffers) {
			errorOverlay.open('Unable to load the selected section. Please try again.');
			this.renderSectionPreview();
			return false;
		}

		this.sentenceBuffers = [...sentenceBuffers].sort((a, b) => a.sentence_no - b.sentence_no);
		this.renderSectionPreview();
		return true;
	}
	render() {
		this.renderControls();
		this.renderBuffer();
		this.renderNavigation();
	}
	renderControls() {
		const hasBook = !!this.bookBuffer;
		const canUpload = !hasBook && !this.isUploading;
		const canEnterSections = hasBook && !this.bookBuffer?.confirmed && !this.isUploading && !this.isConfirming && !!this.elems.bookName.value.trim();

		this.elems.btnBack.hidden = !this.bookBuffer?.confirmed;
		this.elems.btnUpload.hidden = hasBook;
		this.elems.btnUpload.disabled = !canUpload;
		this.elems.btnUpload.textContent = this.isUploading ? 'Uploading EPUB...' : 'Upload EPUB';
		this.elems.bookSetupDetails.hidden = !hasBook;
		this.elems.btnDiscard.disabled = !hasBook || this.isUploading || this.isConfirming || processingBuffer.running;
		this.elems.btnSetupNext.disabled = !canEnterSections;
		this.elems.btnSetupNext.hidden = this.bufferIndex !== null;
		this.elems.bookName.disabled = !hasBook || this.bookBuffer?.confirmed || this.bufferIndex !== null;
		setClass(this.elems.bookName, 'warning', this.isBookNameMissing());
	}
	isBookNameMissing() {
		return !!this.bookBuffer && !this.bookBuffer.confirmed && this.bufferIndex === null && !this.elems.bookName.value.trim();
	}
	renderNavigation() {
		this.elems.bufferSteps.forEach((button, i) => {
			button.disabled = !this.canSelectBuffer(i) || processingBuffer.running;
			setClass(button, 'selected', i === this.bufferIndex);
		});
		this.elems.bufferPanel.hidden = this.bufferIndex === null;
		setClass(this.elems.btnNextBuffer, 'success', this.bufferIndex !== null);

		const isProcessing = this.bufferIndex === 1;
		const canGoPrevious = this.bufferIndex === 0 ? !this.bookBuffer?.confirmed : isProcessing || this.bufferIndex === 2;
		this.elems.btnPrevBuffer.textContent = isProcessing ? 'Stop' : 'Previous';
		this.elems.btnPrevBuffer.disabled = isProcessing || !canGoPrevious || processingBuffer.running;
		this.elems.btnNextBuffer.hidden = this.bufferIndex === null;
		if (this.bufferIndex === null) {
			this.elems.btnNextBuffer.disabled = true;
			return;
		}
		if (this.bufferIndex === 0) {
			this.elems.btnNextBuffer.textContent = 'Next';
			this.elems.btnNextBuffer.disabled = this.isConfirming || !this.selectedSections.size;
			return;
		}
		if (this.bufferIndex === 1) {
			this.elems.btnNextBuffer.textContent = 'Next';
			this.elems.btnNextBuffer.disabled = processingBuffer.running || !processingBuffer.completed;
			this.elems.btnNextBuffer.hidden = !processingBuffer.completed;
			return;
		}
		if (this.bufferIndex === 2) {
			this.elems.btnNextBuffer.textContent = 'Confirm';
			this.elems.btnNextBuffer.disabled = !processingBuffer.completed;
		}
	}
	renderBuffer() {
		this.elems.bufferContent.innerHTML = '';
		if (this.bufferIndex === 0) this.elems.bufferContent.appendChild(this.createSectionSelector());
		if (this.bufferIndex === 1) processingBuffer.render(this.elems.bufferContent);
		if (this.bufferIndex === 2) this.elems.bufferContent.appendChild(processingBuffer.createSummary());
	}
	createSectionSelector() {
		const container = createElement('div', 'section-selector');
		this.elems.sectionSelector = container;
		if (!this.bookBuffer) return container;

		const listWrapper = createElement('div');
		listWrapper.appendChild(createElement('h2', null, 'Book sections'));
		listWrapper.appendChild(createElement('p', null, 'Choose a section to preview. Toggle included sections before confirmation.'));
		const list = createElement('div', 'section-list');
		for (const section_no of getSections(this.bookBuffer)) list.appendChild(this.createSectionItem(section_no));
		listWrapper.appendChild(list);
		container.appendChild(listWrapper);

		const previewWrapper = createElement('div');
		previewWrapper.appendChild(createElement('h2', null, `Section ${this.selectedSectionNo ?? '-'}`));
		previewWrapper.appendChild(createElement('p', null, `Showing up to ${this.previewLimit} sentences.`));
		const preview = createElement('div', 'section-preview');
		preview.addEventListener('wheel', ev => {
			if (ev.deltaY === 0 || preview.scrollWidth <= preview.clientWidth) return;

			const scrollLeft = preview.scrollLeft;
			preview.scrollLeft -= ev.deltaY;
			if (preview.scrollLeft !== scrollLeft) ev.preventDefault();
		});
		this.elems.sectionPreview = preview;
		previewWrapper.appendChild(preview);
		container.appendChild(previewWrapper);

		if (this.bookBuffer.confirmed) container.appendChild(createElement('div', 'section-confirmed', 'Section selection is confirmed and read-only.'));
		this.renderSectionPreview();

		return container;
	}
	createSectionItem(section_no) {
		const item = createElement('div', 'section-item');
		const nav = createElement('button', 'header-btn section-nav', `Section ${section_no}`);
		nav.dataset.sectionNo = section_no;
		setClass(nav, 'selected', section_no === this.selectedSectionNo);
		nav.onclick = eventHandler(async () => {
			this.setSectionFocus('nav', section_no);
			await this.selectSection(section_no);
		});
		nav.addEventListener('focus', () => {
			this.lastSectionNavNo = section_no;
		});
		nav.addEventListener('keydown', ev => KeydownHandlers.sections.nav(nav, ev));
		item.appendChild(nav);

		const toggle = createElement('input', 'checkbox');
		toggle.dataset.sectionNo = section_no;
		toggle.type = 'checkbox';
		toggle.checked = this.selectedSections.has(section_no);
		toggle.disabled = this.bookBuffer?.confirmed;
		toggle.setAttribute('aria-label', `Include Section ${section_no}`);
		toggle.onchange = eventHandler(() => {
			this.setSectionFocus('checkbox', section_no);
			this.toggleSection(section_no);
		});
		item.appendChild(toggle);

		return item;
	}
	renderSectionPreview() {
		const preview = this.elems.sectionPreview;
		if (!preview) return;

		preview.innerHTML = '';
		if (this.loadingSection) {
			preview.appendChild(createElement('div', 'preview-message', 'Loading section...'));
			return;
		}
		if (!this.sentenceBuffers.length) {
			preview.appendChild(createElement('div', 'preview-message', 'No sentences are available for this section.'));
			return;
		}
		for (const { sentence_no, sentence_text } of this.sentenceBuffers) {
			const sentence = createElement('div', 'sentence-preview');
			sentence.appendChild(createElement('div', 'sentence-preview-no', `${this.selectedSectionNo}:${sentence_no}`));
			sentence.appendChild(createElement('div', 'sentence-preview-text', sentence_text));
			preview.appendChild(sentence);
		}
	}
}

class ProcessingBuffer {
	constructor() {
		this.bookBuffer = null;
		this.container = null;
		this.running = false;
		this.completed = false;
		this.failed = false;
		this.activeEventSource = null;
		this.counts = { token: null, word: null };
		this.stages = this.createStages();
	}
	createStages() {
		return {
			tokenize: { title: 'Tokenization', status: 'idle', percentage: 0, message: 'Waiting to start', t_elapsed_ms: null },
			jisho: { title: 'Jisho loading', status: 'idle', percentage: 0, message: 'Waiting to start', t_elapsed_ms: null },
			filter: { title: 'WordBuffer filtering', status: 'idle', percentage: 0, message: 'Waiting to start', t_elapsed_ms: null },
		};
	}
	reset() {
		this.bookBuffer = null;
		this.container = null;
		this.running = false;
		this.completed = false;
		this.failed = false;
		this.activeEventSource = null;
		this.counts = { token: null, word: null };
		this.stages = this.createStages();
	}
	async open(bookBuffer, resume = false) {
		this.bookBuffer = bookBuffer;
		if (!resume) {
			this.completed = false;
			this.failed = false;
			this.stages = this.createStages();
		}
		if (resume) await this.loadResumeState();
		this.render();
		buffer.renderNavigation();
	}
	async loadResumeState() {
		const counts = await this.loadCounts();
		if (!counts) return;

		if (counts.word) {
			Object.values(this.stages).forEach(stage => {
				stage.status = 'success';
				stage.percentage = 100;
				stage.message = 'Previously completed';
			});
			this.completed = true;
		}
	}
	async loadCounts() {
		const [tokenBuffers, wordBuffers] = await Promise.all([
			TokenBuffer.count(),
			WordBuffer.count(),
		]);
		if (!tokenBuffers || !wordBuffers) return undefined;

		this.counts = { token: tokenBuffers.count, word: wordBuffers.count };
		return this.counts;
	}
	async start() {
		if (this.running || this.completed || this.failed) return;

		this.running = true;
		buffer.renderControls();
		this.render();
		const tokenized = await this.runStage('tokenize', TokenBuffer.tokenize);
		if (!tokenized) return this.stop();

		const jishoLoaded = await this.runStage('jisho', JishoBuffer.load);
		if (!jishoLoaded) return this.stop();

		const filtered = await this.runStage('filter', WordBuffer.filter);
		if (!filtered) return this.stop();

		await this.complete();
	}
	async runStage(key, handler) {
		return await new Promise(async resolve => {
			const stage = this.stages[key];
			let finished = false;
			const finish = success => {
				if (finished) return;
				finished = true;
				resolve(success);
			}
			const fail = message => {
				stage.status = 'failed';
				stage.message = message;
				this.failed = true;
				this.render();
				errorOverlay.open(message);
				finish(false);
			}

			stage.status = 'running';
			stage.message = 'Starting...';
			this.render();
			const eventSource = await handler(async (data, source) => {
				if (typeof data.percentage !== 'number') {
					fail(data.message ?? `${stage.title} failed.`);
					return;
				}

				stage.percentage = data.percentage;
				stage.message = data.message;
				stage.t_elapsed_ms = data.t_elapsed_ms;
				this.render();
				if (!data.success) return;

				stage.status = 'success';
				stage.percentage = 100;
				this.render();
				source.close();
				finish(true);
			}, error => {
				fail(error.message ?? `${stage.title} failed.`);
			}, () => {
				if (!finished) fail(`${stage.title} ended before completion.`);
			});
			this.activeEventSource = eventSource;
			if (!eventSource) fail(`${stage.title} could not start.`);
		});
	}
	stop() {
		this.running = false;
		this.activeEventSource = null;
		buffer.renderControls();
		this.render();
	}
	async complete() {
		this.running = false;
		this.completed = true;
		this.activeEventSource = null;
		const bookBuffer = await BookBuffer.findCurrent();
		if (bookBuffer) {
			this.bookBuffer = bookBuffer;
			buffer.bookBuffer = bookBuffer;
		}
		await this.loadCounts();
		buffer.elems.bookStatus.textContent = 'WordBuffers ready for review';
		buffer.renderControls();
		buffer.renderNavigation();
		this.render();
	}
	render(container) {
		if (container) this.container = container;
		if (!this.container) return;

		this.container.innerHTML = '';
		const panel = createElement('div', 'processing-panel');
		panel.appendChild(createElement('h2', null, this.completed ? 'Processing complete' : 'Book processing'));
		panel.appendChild(createElement('p', null, this.completed ? 'WordBuffers are prepared. Continue to summary when you are ready.' : 'Tokenization, Jisho loading, and WordBuffer filtering run in order.'));
		Object.entries(this.stages).forEach(([key, stage]) => panel.appendChild(this.createStageCard(key, stage)));

		if (!this.running && !this.completed) {
			const button = createElement('button', 'confirm-btn processing-action', this.failed ? 'Retry unavailable' : 'Start processing');
			button.disabled = this.failed;
			button.onclick = eventHandler(async () => await this.start());
			panel.appendChild(button);
			if (this.failed) panel.appendChild(createElement('span', 'processing-note', 'Safe processing retry is not available with the current backend behavior.'));
		}
		this.container.appendChild(panel);
	}
	createStageCard(key, stage) {
		const card = createElement('div', `stage-card ${stage.status}`);
		const header = createElement('div', 'stage-header');
		header.appendChild(createElement('span', null, stage.title));
		header.appendChild(createElement('span', 'stage-status', `${formatStatus(stage.status)} · ${stage.percentage}%`));
		card.appendChild(header);

		const progress = createElement('div', 'stage-progress');
		const progressBar = createElement('div');
		progressBar.style.width = `${stage.percentage}%`;
		progress.appendChild(progressBar);
		card.appendChild(progress);

		const footer = createElement('div', 'stage-footer');
		footer.appendChild(createElement('span', null, stage.message));
		footer.appendChild(createElement('span', null, formatElapsed(stage.t_elapsed_ms)));
		card.appendChild(footer);

		return card;
	}
	createSummary() {
		const container = createElement('div', 'completion-summary');
		container.appendChild(createElement('h2', null, 'Book Extraction Summary'));
		const grid = createElement('div', 'summary-grid');
		const sections = this.bookBuffer ? getSections(this.bookBuffer).join(', ') : '-';
		const values = [
			['Book ID', this.bookBuffer?.book_id ?? '-'],
			['Book name', this.bookBuffer?.book_name ?? '-'],
			['Original file', this.bookBuffer?.book_original_name ?? '-'],
			['Stored file', this.bookBuffer?.book_filename ?? '-'],
			['Selected sections', sections || '-'],
			['Existing tokens', `${this.bookBuffer?.existing_tokens ?? 0}`],
			['New tokens', `${this.bookBuffer?.new_tokens ?? 0}`],
			['TokenBuffer count', `${this.counts.token ?? '-'}`],
			['WordBuffer count', `${this.counts.word ?? '-'}`],
		];
		for (const [label, value] of values) {
			grid.appendChild(createElement('div', 'summary-label', label));
			grid.appendChild(createElement('div', null, value));
		}
		container.appendChild(grid);

		return container;
	}
}

const errorOverlay = new ErrorOverlay();
const discardOverlay = new DiscardOverlay();
const buffer = new Buffer();
const processingBuffer = new ProcessingBuffer();

asyncHandler('MAIN INIT', async () => {
	await buffer.load();
});
