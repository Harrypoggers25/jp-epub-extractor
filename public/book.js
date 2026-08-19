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
	}
	async load() {
		this.render();
	}
	render() {
		this.renderControls();
		this.renderBuffer();
		this.renderNavigation();
	}
	renderControls() {
		this.elems.btnUpload.disabled = true;
		this.elems.btnUploadFile.disabled = true;
		this.elems.btnDiscard.disabled = true;
		this.elems.bookName.disabled = true;
	}
	renderNavigation() {
		this.elems.bufferSteps.forEach((button, i) => {
			button.disabled = true;
			setClass(button, 'selected', i === this.bufferIndex);
		});
		this.elems.btnPrevBuffer.disabled = true;
		this.elems.btnNextBuffer.disabled = true;
	}
	renderBuffer() {
		this.elems.bufferContent.innerHTML = '';
		this.elems.bufferContent.appendChild(this.createBookInfo());
	}
	createBookInfo() {
		const container = createElement('div', 'buffer-info');
		container.appendChild(createElement('h2', null, 'Upload an EPUB'));
		container.appendChild(createElement('p', null, 'Choose an EPUB file, then upload it to extract its available book sections.'));
		return container;
	}
}

const errorOverlay = new ErrorOverlay();
const buffer = new Buffer();

asyncHandler('MAIN INIT', async () => {
	await buffer.load();
});
