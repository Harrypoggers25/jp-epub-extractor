// CONFIGS
import { BookBuffer, db, JishoBuffer, SentenceBuffer, TokenBuffer, WordBuffer, WordType } from "../configs/db.config";

// HELPERS
import { isArrayObj } from "../helpers/json.helper";

// MODULES
import Message from "@harrypoggers25/message";
import { ulid } from "ulid";

// ROUTES
import Route from "@harrypoggers25/route";

// SERVICES
import Book from "../services/book.service";

export namespace BookBufferHandler {
	export const upload = Route.asyncHandler(async (req, res) => {
		if (!req.file) throw new Error('Failed to upload file');

		const book_original_name = req.file.originalname;
		const book_filename = req.file.path;

		const parsedBook = await Book.extractEpubFile(book_filename);
		const created_at = new Date();
		const transaction = await db.transaction();

		const book_id = ulid();
		const sections = JSON.stringify(Array.from({ length: parsedBook.length }, (_, i) => i));
		const bookBuffer = await BookBuffer.create({ book_id, book_filename, book_original_name, sections, created_at }, { transaction });
		if (!bookBuffer) throw new Error(Message.failed(['create', 'new book buffer', { book_original_name }]));
		for (let section_no = 0; section_no < parsedBook.length; section_no++) {
			const { sentences } = parsedBook[section_no];
			for (let sentence_no = 0; sentence_no < sentences.length; sentence_no++) {
				const sentence_text = sentences[sentence_no];
				const sentenceBuffer = await SentenceBuffer.create({ section_no, sentence_no, sentence_text, book_id }, { transaction });
				if (!sentenceBuffer) throw new Error(Message.failed(['create', 'new sentence buffer', { section_no, sentence_no }]));
			}
		}

		await transaction.commit();
		res.status(201).json(bookBuffer);
	});
	export const findAll = Route.asyncHandler(async (_, res) => {
		const bookBuffers = await BookBuffer.find();
		if (!bookBuffers) throw new Error(Message.failed(['find', 'all book buffers']));

		res.status(200).json(bookBuffers);
	});
	export const find = Route.asyncHandler(async (req, res) => {
		const book_id = req.params.book_id as string;
		const bookBuffer = await BookBuffer.findByPk(book_id);
		if (!bookBuffer) throw new Error(Message.failed(['find', 'book buffer']));

		res.status(200).json(bookBuffer);
	});
	export const removeCurrent = Route.asyncHandler(async (_, res) => {
		const currentBookBuffer = await BookBuffer.find({ orderBy: { created_at: 'DESC' }, limit: 1 });
		if (!currentBookBuffer || !currentBookBuffer.length) throw new Error(Message.failed(['delete', 'current book buffer'], {
			causer: ['find', 'current book buffer']
		}));

		const transaction = await db.transaction();
		const { book_id } = currentBookBuffer[0];
		const wordBuffers = await WordBuffer.delete({ transaction });
		if (!wordBuffers) throw new Error(Message.failed(['delete', 'current book buffer'], {
			causer: ['delete', 'word buffers', { book_id }]
		}));

		const jishoBuffers = await JishoBuffer.delete({ transaction });
		if (!jishoBuffers) throw new Error(Message.failed(['delete', 'current book buffer'], {
			causer: ['delete', 'jisho buffers', { book_id }]
		}));

		const tokenBuffers = await TokenBuffer.delete({ transaction });
		if (!tokenBuffers) throw new Error(Message.failed(['delete', 'current book buffer'], {
			causer: ['delete', 'token buffers', { book_id }]
		}));

		const sentenceBuffers = await SentenceBuffer.delete({ where: { book_id }, transaction });
		if (!sentenceBuffers) throw new Error(Message.failed(['delete', 'current book buffer'], {
			causer: ['delete', 'sentence buffers', { book_id }]
		}));

		const bookBuffer = await BookBuffer.deleteByPk(book_id, { transaction });
		if (!bookBuffer) throw new Error(Message.failed(['delete', 'current book buffer']))

		await transaction.commit();
		res.status(200).json(bookBuffer);
	});
	export const findCurrent = Route.asyncHandler(async (_, res) => {
		const bookBuffers = await BookBuffer.find({ orderBy: { created_at: 'DESC' }, limit: 1 });
		if (!bookBuffers || !bookBuffers.length) throw new Error(Message.failed(['find', 'current book buffer']));

		res.status(200).json(bookBuffers[0]);
	});
	export const confirm = Route.asyncHandler(async (req, res) => {
		const { book_name, sections } = req.body;

		if (!book_name) throw new Error(Message.failed(['confirm', 'book buffer'], { subMessage: 'book_name is required' }));
		if (!isArrayObj<number>(sections, section => typeof section === 'number')) throw new Error(Message.failed(['confirm', 'book buffer'], {
			subMessage: 'section must be an array of number representing the section index'
		}));

		const currentBookBuffer = await BookBuffer.find({ orderBy: { created_at: 'DESC' }, limit: 1 });
		if (!currentBookBuffer || !currentBookBuffer.length) throw new Error(Message.failed(['confirm', 'book buffer'], {
			causer: ['find', 'current book buffer']
		}));

		const { book_id, confirmed } = currentBookBuffer[0];
		if (confirmed) throw new Error(Message.failed(['confirm', 'book buffer', book_id], {
			subMessage: 'Current book is already set as confirmed'
		}));

		const currentSections = JSON.parse(currentBookBuffer[0].sections) as Array<number>;
		if (sections.some(section => section < 0 || section >= currentSections.length)) throw new Error(Message.failed(['confirm', 'book buffer', book_id], {
			subMessage: 'sections is invalid'
		}));

		const transaction = await db.transaction();
		for (const section_no of currentSections.filter(section => !sections.includes(section))) {
			const deletedSentenceBuffer = await SentenceBuffer.delete({ where: { section_no }, transaction });
			if (!deletedSentenceBuffer || !deletedSentenceBuffer.length) throw new Error(Message.failed(['confirm', 'book buffer', book_id], {
				causer: ['delete', 'sentence buffer', { section_no }]
			}));
		}

		const bookBuffer = await BookBuffer.updateByPk(book_id, { book_name, sections: JSON.stringify(sections), confirmed: !confirmed }, { transaction });
		if (!bookBuffer) throw new Error(Message.failed(['confirm', 'book buffer', book_id], {
			causer: ['update', 'book buffer']
		}));

		await transaction.commit();
		res.status(200).json(bookBuffer);
	});
}
