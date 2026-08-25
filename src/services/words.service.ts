// CONFIGS
import { IEntryState, IWord, IWordBuffer } from "../configs/db.config";

// HELPERS
import { IJishoReducedWord } from "../helpers/jisho.helper";

export type TransformedWords = { top: Array<IWord>, bottom: Array<IWord> };
export function transformWord(words: Array<IWord>, targetWord: IWord): TransformedWords {
	const { w_basic_form, wt_name } = targetWord;

	const isTargetWord = (word: IWord) => word.w_basic_form === w_basic_form && word.wt_name === wt_name;
	const getEntries = (word: IWord) => JSON.parse(word.j_response) as Array<IJishoReducedWord>;

	const filteredWords = words.filter(word => !isTargetWord(word));
	const targetEntries = getEntries(targetWord);
	const isTopWord = (word: IWord) => {
		const entries = getEntries(word);
		return targetEntries.every(targetEntry => entries.some(entry => entry.slug === targetEntry.slug));
	};

	return { top: filteredWords.filter(isTopWord), bottom: filteredWords.filter(wordBuffer => !isTopWord(wordBuffer)) };
}
