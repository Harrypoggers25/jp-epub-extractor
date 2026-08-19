import { BookBuffer, SentenceBuffer } from "./api.helper.js";
import { asyncHandler, createElement, eventHandler, setClass } from "./tools.helper.js";

const getSections = bookBuffer => {
	try {
		return JSON.parse(bookBuffer.sections);
	} catch (_) {
		return [];
	}
}

class ErrorOverlay {
	constructor() {
		this.elems = {
			errorOverlay: document.getElementById('errorOverlay'),
			errorOverlayMessage: document.getElementById('errorOverlayMessage'),
			btnErrorClose: document.getElementById('btnErrorClose'),
		}

		this.elems.btnErrorClose.onclick = eventHandler(() => this.close());
		this.elems.errorOverlay.onclick = eventHandler(ev => {
			if (ev.target === this.elems.errorOverlay) this.close();
		});
	}
	open(message) {
		this.elems.errorOverlayMessage.textContent = message;
		setClass(this.elems.errorOverlay, 'open', true);
	}
	close() {
		this.elems.errorOverlayMessage.textContent = '';
		setClass(this.elems.errorOverlay, 'open', false);
	}
}

class DiscardOverlay {
	constructor() {
		this.elems = {
			discardOverlay: document.getElementById('discardOverlay'),
			btnDiscardCancel: document.getElementById('btnDiscardCancel'),
			btnDiscardConfirm: document.getElementById('btnDiscardConfirm'),
		}

		this.elems.btnDiscardCancel.onclick = eventHandler(() => this.close());
		this.elems.btnDiscardConfirm.onclick = eventHandler(async () => {
			await buffer.discard();
		});
		this.elems.discardOverlay.onclick = eventHandler(ev => {
			if (ev.target === this.elems.discardOverlay) this.close();
		});
	}
	open() {
		setClass(this.elems.discardOverlay, 'open', true);
	}
	close() {
		setClass(this.elems.discardOverlay, 'open', false);
	}
}

class Buffer {
	constructor() {
		this.elems = {
			bookStatus: document.getElementById('bookStatus'),
			uploadInput: document.getElementById('uploadInput'),
			btnUpload: document.getElementById('btnUpload'),
			btnUploadFile: document.getElementById('btnUploadFile'),
			btnDiscard: document.getElementById('btnDiscard'),
			selectedFile: document.getElementById('selectedFile'),
			bookFilePath: document.getElementById('bookFilePath'),
			bookName: document.getElementById('bookName'),
			bufferContent: document.getElementById('bufferContent'),
			btnPrevBuffer: document.getElementById('btnPrevBuffer'),
			btnNextBuffer: document.getElementById('btnNextBuffer'),
			bufferSteps: [
				document.getElementById('btnBufferInfo'),
				document.getElementById('btnBufferSections'),
				document.getElementById('btnBufferProcessing'),
			]
		}

		this.bookBuffer = null;
		this.bufferIndex = 0;
		this.selectedFile = null;
		this.selectedSections = new Set();
		this.selectedSectionNo = null;
		this.sentenceBuffers = [];
		this.previewLimit = 50;
		this.loadingSection = false;
		this.isUploading = false;

		this.elems.btnUpload.onclick = eventHandler(() => this.elems.uploadInput.click());
		this.elems.uploadInput.onchange = eventHandler(ev => this.setSelectedFile(ev.target.files?.[0]));
		this.elems.btnUploadFile.onclick = eventHandler(async () => await this.upload());
		this.elems.btnDiscard.onclick = eventHandler(() => discardOverlay.open());
		this.elems.btnPrevBuffer.onclick = eventHandler(async () => await this.selectBuffer(this.bufferIndex - 1));
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
			return;
		}

		this.setBook(bookBuffer);
		if (!bookBuffer) {
			this.render();
			return;
		}

		this.bufferIndex = 1;
		this.elems.bookStatus.textContent = 'Select book sections';
		this.render();
		await this.loadSection(this.selectedSectionNo);
	}
	setBook(bookBuffer) {
		this.bookBuffer = bookBuffer;
		this.selectedSections = new Set(bookBuffer ? getSections(bookBuffer) : []);
		this.selectedSectionNo = this.selectedSections.values().next().value ?? null;
		this.sentenceBuffers = [];

		const currentFile = !bookBuffer ? 'No current book' : `${bookBuffer.book_original_name ?? 'Unknown file'} · ${bookBuffer.book_filename ?? '-'}`;
		this.elems.bookFilePath.textContent = currentFile;
		this.elems.bookName.value = bookBuffer?.book_name ?? '';
		this.elems.bookName.disabled = !bookBuffer;
	}
	setSelectedFile(file) {
		this.selectedFile = file ?? null;
		this.elems.selectedFile.textContent = this.selectedFile?.name ?? 'No EPUB selected';
		this.renderControls();
	}
	async upload() {
		if (!this.selectedFile || this.bookBuffer || this.isUploading) return;

		this.isUploading = true;
		this.renderControls();
		this.elems.bookStatus.textContent = 'Uploading EPUB';
		const bookBuffer = await BookBuffer.upload(this.selectedFile);
		this.isUploading = false;
		if (!bookBuffer) {
			errorOverlay.open('Unable to upload the EPUB. Please check the file and try again.');
			this.elems.bookStatus.textContent = 'Upload failed';
			this.renderControls();
			return;
		}

		this.setBook(bookBuffer);
		this.bufferIndex = 1;
		this.elems.bookStatus.textContent = 'Select book sections';
		this.render();
		await this.loadSection(this.selectedSectionNo);
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

		discardOverlay.close();
		this.setBook(null);
		this.bufferIndex = 0;
		this.selectedFile = null;
		this.elems.selectedFile.textContent = 'No EPUB selected';
		this.elems.bookStatus.textContent = 'Ready to upload';
		this.render();
	}
	canSelectBuffer(index) {
		if (index === 0) return true;
		if (index === 1) return !!this.bookBuffer;
		return false;
	}
	async selectBuffer(index) {
		if (!this.canSelectBuffer(index)) return;

		this.bufferIndex = index;
		this.render();
		if (this.bufferIndex === 1) await this.loadSection(this.selectedSectionNo);
	}
	async next() {
		if (this.bufferIndex === 0) await this.selectBuffer(1);
	}
	toggleSection(section_no) {
		if (this.selectedSections.has(section_no)) this.selectedSections.delete(section_no);
		else this.selectedSections.add(section_no);

		this.render();
	}
	async selectSection(section_no) {
		if (this.selectedSectionNo === section_no && this.sentenceBuffers.length) return;

		this.selectedSectionNo = section_no;
		this.sentenceBuffers = [];
		this.render();
		await this.loadSection(section_no);
	}
	async loadSection(section_no) {
		if (section_no === null || section_no === undefined || this.bufferIndex !== 1) return;

		this.loadingSection = true;
		this.renderSectionPreview();
		const sentenceBuffers = await SentenceBuffer.findBySection(section_no, this.previewLimit);
		this.loadingSection = false;
		if (!sentenceBuffers) {
			errorOverlay.open('Unable to load the selected section. Please try again.');
			this.renderSectionPreview();
			return;
		}

		this.sentenceBuffers = [...sentenceBuffers].sort((a, b) => a.sentence_no - b.sentence_no);
		this.renderSectionPreview();
	}
	render() {
		this.renderControls();
		this.renderBuffer();
		this.renderNavigation();
	}
	renderControls() {
		const hasBook = !!this.bookBuffer;
		const canUpload = !hasBook && !this.isUploading;

		this.elems.btnUpload.disabled = !canUpload;
		this.elems.btnUploadFile.disabled = !canUpload || !this.selectedFile;
		this.elems.btnUploadFile.textContent = this.isUploading ? 'Uploading EPUB...' : 'Upload EPUB';
		this.elems.btnDiscard.disabled = !hasBook || this.isUploading;
		this.elems.bookName.disabled = !hasBook;
	}
	renderNavigation() {
		this.elems.bufferSteps.forEach((button, i) => {
			button.disabled = !this.canSelectBuffer(i);
			setClass(button, 'selected', i === this.bufferIndex);
		});

		this.elems.btnPrevBuffer.disabled = this.bufferIndex === 0;
		if (this.bufferIndex === 0) {
			this.elems.btnNextBuffer.textContent = 'Sections';
			this.elems.btnNextBuffer.disabled = !this.bookBuffer;
			return;
		}
		this.elems.btnNextBuffer.textContent = 'Confirm book';
		this.elems.btnNextBuffer.disabled = true;
	}
	renderBuffer() {
		this.elems.bufferContent.innerHTML = '';
		if (this.bufferIndex === 0) this.elems.bufferContent.appendChild(this.createBookInfo());
		if (this.bufferIndex === 1) this.elems.bufferContent.appendChild(this.createSectionSelector());
	}
	createBookInfo() {
		const container = createElement('div', 'buffer-info');
		if (!this.bookBuffer) {
			container.appendChild(createElement('h2', null, 'Upload an EPUB'));
			container.appendChild(createElement('p', null, 'Choose an EPUB file, then upload it to extract its available book sections.'));
			return container;
		}

		container.appendChild(createElement('h2', null, 'Uploaded book'));
		container.appendChild(createElement('p', null, 'Continue to select sections and confirm the book name.'));
		const details = createElement('div', 'book-details');
		const values = [
			['Book ID', this.bookBuffer.book_id],
			['Original file', this.bookBuffer.book_original_name ?? '-'],
			['Stored file', this.bookBuffer.book_filename ?? '-'],
			['Sections', Array.from(this.selectedSections).join(', ') || '-'],
		];
		for (const [label, value] of values) {
			details.appendChild(createElement('div', null, label));
			details.appendChild(createElement('div', null, value));
		}
		container.appendChild(details);

		return container;
	}
	createSectionSelector() {
		const container = createElement('div', 'section-selector');
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
		this.elems.sectionPreview = createElement('div', 'section-preview');
		previewWrapper.appendChild(this.elems.sectionPreview);
		container.appendChild(previewWrapper);

		this.renderSectionPreview();

		return container;
	}
	createSectionItem(section_no) {
		const item = createElement('div', 'section-item');
		const nav = createElement('button', 'header-btn section-nav', `Section ${section_no}`);
		setClass(nav, 'selected', section_no === this.selectedSectionNo);
		nav.onclick = eventHandler(async () => await this.selectSection(section_no));
		item.appendChild(nav);

		const toggle = createElement('button', 'header-btn section-toggle', this.selectedSections.has(section_no) ? 'Included' : 'Excluded');
		toggle.onclick = eventHandler(() => this.toggleSection(section_no));
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

const errorOverlay = new ErrorOverlay();
const discardOverlay = new DiscardOverlay();
const buffer = new Buffer();

asyncHandler('MAIN INIT', async () => {
	await buffer.load();
});
