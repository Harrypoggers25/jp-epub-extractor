import { BookBuffer } from "./api.helper.js";
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
		this.isUploading = false;

		this.elems.btnUpload.onclick = eventHandler(() => this.elems.uploadInput.click());
		this.elems.uploadInput.onchange = eventHandler(ev => this.setSelectedFile(ev.target.files?.[0]));
		this.elems.btnUploadFile.onclick = eventHandler(async () => await this.upload());
		this.elems.btnDiscard.onclick = eventHandler(() => discardOverlay.open());
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
		this.elems.bookStatus.textContent = bookBuffer ? 'Uploaded book' : 'Ready to upload';
		this.render();
	}
	setBook(bookBuffer) {
		this.bookBuffer = bookBuffer;
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
		this.elems.bookStatus.textContent = 'Uploaded book';
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
		this.setBook(null);
		this.selectedFile = null;
		this.elems.selectedFile.textContent = 'No EPUB selected';
		this.elems.bookStatus.textContent = 'Ready to upload';
		this.render();
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
			button.disabled = i !== 0;
			setClass(button, 'selected', i === this.bufferIndex);
		});
		this.elems.btnPrevBuffer.disabled = true;
		this.elems.btnNextBuffer.textContent = 'Sections';
		this.elems.btnNextBuffer.disabled = !this.bookBuffer;
	}
	renderBuffer() {
		this.elems.bufferContent.innerHTML = '';
		this.elems.bufferContent.appendChild(this.createBookInfo());
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
			['Sections', Array.from(getSections(this.bookBuffer)).join(', ') || '-'],
		];
		for (const [label, value] of values) {
			details.appendChild(createElement('div', null, label));
			details.appendChild(createElement('div', null, value));
		}
		container.appendChild(details);

		return container;
	}
}

const errorOverlay = new ErrorOverlay();
const discardOverlay = new DiscardOverlay();
const buffer = new Buffer();

asyncHandler('MAIN INIT', async () => {
	await buffer.load();
});
