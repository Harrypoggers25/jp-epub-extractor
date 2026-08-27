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

	const getState = (es_id: string) => {
		const state = entries[es_id]?.state;
		return state ? JSON.parse(state) as Array<number> : undefined;
	}
	const getEntries = (word: IWord | IUnsureWordBuffer, state: Array<number>) => {
		const j_response = JSON.parse(word.j_response) as Array<IJishoReducedWord>;
		return j_response.filter((_, i) => Array.from(state).includes(i));
	}

	const targetState = state ?? getState(es_id);
	if (!targetState || !targetState.length) return { top: [], bottom: words };

	const targetEntries = getEntries(targetWord, targetState);
	const isTopWord = (word: IWord) => {
		const entries = JSON.parse(word.j_response) as Array<IJishoReducedWord>;
		return targetEntries.every(targetEntry => entries.some(entry => entry.slug === targetEntry.slug));
	};

	return { top: words.filter(isTopWord), bottom: words.filter(word => !isTopWord(word)) };
}
