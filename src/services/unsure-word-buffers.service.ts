// CONFIGS
import { IUnsureEntryState, IUnsureWordBuffer } from "../configs/db.config";

// HELPERS
import { IJishoReducedWord } from "../helpers/jisho.helper";

export type TransformedUnsureWordBuffers = { top: Array<IUnsureWordBuffer>, bottom: Array<IUnsureWordBuffer> };
export function transformUnsureWordBuffer(unsureWordBuffers: Array<IUnsureWordBuffer>, unsureEntryStates: Array<IUnsureEntryState>, es_id: string, state?: Array<number>): TransformedUnsureWordBuffers {
	const [w_basic_form, wt_name] = es_id.split('_');
	const entries = Object.fromEntries(unsureEntryStates.map(unsureEntryState => {
		const { es_id, state, ignore, can_merge, merged_with } = unsureEntryState;
		return [es_id, { state, ignore, can_merge, merged_with }];
	}));

	const isTargetWord = (unsureWordBuffer: IUnsureWordBuffer) => unsureWordBuffer.w_basic_form === w_basic_form && unsureWordBuffer.wt_name === wt_name;
	const getState = (es_id: string) => {
		const state = entries[es_id]?.state;
		return state ? JSON.parse(state) as Array<number> : undefined;
	}
	const getEntries = (unsureWordBuffer: IUnsureWordBuffer, state: Array<number>) => {
		const j_response = JSON.parse(unsureWordBuffer.j_response) as Array<IJishoReducedWord>;
		return j_response.filter((_, i) => Array.from(state).includes(i));
	}
	const isMergedWord = (es_id: string) => {
		const entry = entries[es_id];
		return entry && entry.merged_with;
	}

	const filteredWords = unsureWordBuffers.filter(unsureWordBuffer => !isTargetWord(unsureWordBuffer));
	const [targetWord] = unsureWordBuffers.filter(isTargetWord);
	const targetState = state ?? getState(es_id);
	if (!targetState || !targetState.length) return { top: [], bottom: filteredWords };

	const targetEntries = getEntries(targetWord, targetState);
	const isTopWord = (unsureWordBuffer: IUnsureWordBuffer) => {
		const { w_basic_form, wt_name } = unsureWordBuffer;
		const es_id = `${w_basic_form}_${wt_name}`;
		if (isMergedWord(es_id)) return false;

		const state = getState(es_id);
		if (!state) return false;

		const entries = getEntries(unsureWordBuffer, state);
		return targetEntries.every(targetEntry => entries.some(entry => entry.slug === targetEntry.slug));
	};

	return { top: filteredWords.filter(isTopWord), bottom: filteredWords.filter(WordBuffer => !isTopWord(WordBuffer)) };
}
