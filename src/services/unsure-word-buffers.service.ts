// CONFIGS
import { IUnsureEntryState, IUnsureWordBuffer, IWord } from "../configs/db.config";

// HELPERS
import { IJishoReducedWord } from "../helpers/jisho.helper";

export type TransformedUnsureWordBuffers = { top: Array<IWord>, bottom: Array<IWord> };
export function transformUnsureWordBuffer(words: Array<IWord>, unsureEntryStates: Array<IUnsureEntryState>, targetWord: IUnsureWordBuffer, state?: Array<number>): TransformedUnsureWordBuffers {
	const { w_basic_form, wt_name } = targetWord;
	const es_id = `${w_basic_form}_${wt_name}`;
	const entries = Object.fromEntries(unsureEntryStates.map(unsureEntryState => {
		const { es_id, state, ignore, can_merge, merged_with } = unsureEntryState;
		return [es_id, { state, ignore, can_merge, merged_with }];
	}));

	const isTargetWord = (word: IWord) => word.w_basic_form === w_basic_form && word.wt_name === wt_name;
	const getState = (es_id: string) => {
		const state = entries[es_id]?.state;
		return state ? JSON.parse(state) as Array<number> : undefined;
	}
	const getEntries = (word: IWord | IUnsureWordBuffer, state: Array<number>) => {
		const j_response = JSON.parse(word.j_response) as Array<IJishoReducedWord>;
		return j_response.filter((_, i) => Array.from(state).includes(i));
	}
	const isMergedWord = (es_id: string) => {
		const entry = entries[es_id];
		return entry && entry.merged_with;
	}

	const filteredWords = words.filter(word => !isTargetWord(word));
	const targetState = state ?? getState(es_id);
	if (!targetState || !targetState.length) return { top: [], bottom: filteredWords };

	const targetEntries = getEntries(targetWord, targetState);
	const isTopWord = (word: IWord) => {
		const { w_basic_form, wt_name } = word;
		const es_id = `${w_basic_form}_${wt_name}`;
		if (isMergedWord(es_id)) return false;

		const state = getState(es_id);
		if (!state) return false;

		const entries = getEntries(word, state);
		return targetEntries.every(targetEntry => entries.some(entry => entry.slug === targetEntry.slug));
	};

	return { top: filteredWords.filter(isTopWord), bottom: filteredWords.filter(word => !isTopWord(word)) };
}
