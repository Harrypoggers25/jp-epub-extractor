import { BookBuffer, JishoBuffer, SentenceBuffer, TokenBuffer, WordBuffer } from "./api.helper.js";
import { asyncHandler, createElement, eventHandler, setClass } from "./tools.helper.js";

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
		this.bufferIndex = null;
		this.selectedFile = null;
		this.selectedSections = new Set();
		this.selectedSectionNo = null;
		this.sentenceBuffers = [];
		this.previewLimit = 50;
		this.loadingSection = false;
		this.isUploading = false;
		this.isConfirming = false;

		this.elems.btnUpload.onclick = eventHandler(() => this.elems.uploadInput.click());
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
			return;
		}

		this.setBook(bookBuffer);
		if (!bookBuffer) {
			this.bufferIndex = null;
			this.render();
			return;
		}

		if (!bookBuffer.confirmed) {
			this.bufferIndex = null;
			this.elems.bookStatus.textContent = 'Enter book details';
			this.render();
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
	}
	setBook(bookBuffer) {
		this.bookBuffer = bookBuffer;
		this.selectedSections = new Set(bookBuffer ? getSections(bookBuffer) : []);
		this.selectedSectionNo = this.selectedSections.values().next().value ?? null;
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
		processingBuffer.reset();
		this.setBook(null);
		this.bufferIndex = null;
		this.resetUpload();
		this.elems.bookStatus.textContent = 'Ready to upload';
		this.render();
	}
	canSelectBuffer(index) {
		if (index === 0) return !!this.bookBuffer;
		if (index === 1) return !!this.bookBuffer?.confirmed;
		if (index === 2) return !!this.bookBuffer?.confirmed && processingBuffer.completed;
		return false;
	}
	async selectBuffer(index) {
		if (!this.canSelectBuffer(index) || processingBuffer.running) return;

		this.bufferIndex = index;
		this.render();
		if (this.bufferIndex === 0) await this.loadSection(this.selectedSectionNo);
		if (this.bufferIndex === 1) await processingBuffer.open(this.bookBuffer, true);
	}
	selectSetup() {
		if (!this.bookBuffer || this.bookBuffer.confirmed || processingBuffer.running) return;

		this.bufferIndex = null;
		this.render();
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
	}
	async selectSection(section_no) {
		if (this.selectedSectionNo === section_no && this.sentenceBuffers.length) return;

		this.selectedSectionNo = section_no;
		this.sentenceBuffers = [];
		this.render();
		await this.loadSection(section_no);
	}
	async loadSection(section_no) {
		if (section_no === null || section_no === undefined || this.bufferIndex !== 0) return;

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
		const canEnterSections = hasBook && !this.bookBuffer?.confirmed && !this.isUploading && !this.isConfirming && !!this.elems.bookName.value.trim();

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

		const canGoPrevious = this.bufferIndex === 0 ? !this.bookBuffer?.confirmed : this.bufferIndex === 1 || this.bufferIndex === 2;
		this.elems.btnPrevBuffer.disabled = !canGoPrevious || processingBuffer.running;
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
		setClass(nav, 'selected', section_no === this.selectedSectionNo);
		nav.onclick = eventHandler(async () => await this.selectSection(section_no));
		item.appendChild(nav);

		const toggle = createElement('button', 'header-btn section-toggle', this.selectedSections.has(section_no) ? 'Included' : 'Excluded');
		setClass(toggle, 'success', this.selectedSections.has(section_no));
		toggle.disabled = this.bookBuffer?.confirmed;
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
