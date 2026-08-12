// CONFIGS
import { BookBuffer, db, ISentenceBuffer, SentenceBuffer, WordBuffer } from "../configs/db.config";

// HELPERS
import { ITokenPositions } from "../helpers/book.helper";

// MODULES
import Message from "@harrypoggers25/message";

// ROUTES
import Route from "@harrypoggers25/route";

export namespace SentenceBufferHandler {
	export const findBySection = Route.asyncHandler(async (req, res) => {
		const section_no = +req.params.section_no;
		const limit = req.query.limit ? +req.query.limit : 50;

		const bookBuffers = await BookBuffer.find({ orderBy: { created_at: 'DESC' }, limit: 1 });
		if (!bookBuffers || !bookBuffers.length) throw new Error(Message.failed(['find', 'sentence buffers by section'], {
			causer: ['find', 'current book buffer']
		}));

		const book_id = bookBuffers[0].book_id;

		const sentenceBuffers = await SentenceBuffer.find({ where: { section_no, book_id }, limit });
		if (!sentenceBuffers) throw new Error(Message.failed(['find', 'sentence buffers by section']));

		res.status(200).json(sentenceBuffers);
	});
	export const findByWordBuffer = Route.asyncHandler(async (req, res) => {
		const w_basic_form = req.params.w_basic_form as string;
		const wt_name = req.params.wt_name as string;

		const bookBuffers = await BookBuffer.find({ orderBy: { created_at: 'DESC' }, limit: 1 });
		if (!bookBuffers || !bookBuffers.length) throw new Error(Message.failed(['find', 'sentence buffers by word buffer'], {
			causer: ['find', 'current book buffer']
		}));

		const { book_id } = bookBuffers[0];
		const wordBuffers = await WordBuffer.find({ where: { w_basic_form, wt_name } });
		if (!wordBuffers || !wordBuffers.length) throw new Error(Message.failed(['find', 'sentence buffers by word buffer'], {
			causer: ['find', 'word buffers', { w_basic_form, wt_name }]
		}));

		const token_positions = JSON.parse(wordBuffers[0].token_positions) as ITokenPositions;
		const result: Array<ISentenceBuffer> = [];
		for (const [section_no, sentences] of Object.entries(token_positions)) {
			for (const sentence_no of sentences.sort((a, b) => a - b)) {
				const sentenceBuffers = await SentenceBuffer.find({ where: { section_no: +section_no, sentence_no, book_id } });
				if (!sentenceBuffers || !sentenceBuffers.length) throw new Error(Message.failed(['find', 'sentence buffers by word buffer']));

				result.push(sentenceBuffers[0]);
			}
		}
		res.status(200).json(result);
	});
}

