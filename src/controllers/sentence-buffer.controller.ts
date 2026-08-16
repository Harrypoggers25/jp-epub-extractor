// CONFIGS
import { BookBuffer, ISentenceBuffer, SentenceBuffer, TokenBuffer, WordBuffer } from "../configs/db.config";

// HELPERS
import { ITokenPositions } from "../helpers/book.helper";

// MODULES
import Message from "@harrypoggers25/message";

// ROUTES
import Route from "@harrypoggers25/route";

function boldWordSentence(surfaceForms: Array<string>, sentence: string) {
	if (!surfaceForms || surfaceForms.length === 0) return sentence;
	const sorted = [...surfaceForms].sort((a, b) => b.length - a.length);
	const chars = Array.from(sentence);
	let result = "";
	let i = 0;

	while (i < chars.length) {
		let matched = false;

		for (const form of sorted) {
			const formChars = Array.from(form);
			const candidate = chars.slice(i, i + formChars.length).join("");
			if (candidate === form) {
				result += `<b>${candidate}</b>`;
				i += formChars.length;
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

export namespace SentenceBufferHandler {
	export const count = Route.asyncHandler(async (_, res) => {
		const sentenceBuffers = await SentenceBuffer.find();
		if (!sentenceBuffers) throw new Error(Message.failed(['find', 'sentence buffer count']));

		res.status(200).json({ count: sentenceBuffers.length });
	});
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
		const highlight = req.query.highlight ?? false;

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
		if (!highlight) {
			res.status(200).json(result);
			return;
		}

		const token_ids = wordBuffers[0].token_ids.split(',');
		const tokenBuffers = await TokenBuffer.find({ in: { token_id: token_ids } });
		if (!tokenBuffers) throw new Error(Message.failed(['find', 'sentence buffers by word buffer'], {
			causer: ['find', 'token buffers', { token_ids }]
		}));

		const surface_forms = tokenBuffers.map(tokenBuffer => tokenBuffer.surface_form);
		res.status(200).json(result.map(sentenceBuffer => {
			sentenceBuffer.sentence_text = boldWordSentence(surface_forms, sentenceBuffer.sentence_text);
			return sentenceBuffer;
		}));
	});
}

