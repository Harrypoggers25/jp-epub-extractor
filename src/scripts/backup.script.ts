import ch from "@harrypoggers25/color-utils";
import { CleanedBuffer, JishoBuffer, JishoResponseState, SenseState, WordBuffer, WordType } from "../configs/db.config";

(async () => {
	const path = './database/epub-extractor-v1.json';
	const append = true;
	const format = 'json';

	const wordTypes = await WordType.backup(path, { orderBy: { created_at: 'ASC' }, format });
	if (!wordTypes) return;

	const jishoResponseStates = await JishoResponseState.backup(path, { orderBy: { j_response_state: 'ASC' }, format, append });
	if (!jishoResponseStates) return;

	const wordBuffers = await WordBuffer.backup(path, { orderBy: { created_at: 'ASC' }, format, append });
	if (!wordBuffers) return;

	const jishoBuffers = await JishoBuffer.backup(path, { orderBy: { created_at: 'ASC' }, format, append });
	if (!jishoBuffers) return;

	const cleanedBuffers = await CleanedBuffer.backup(path, { orderBy: { created_at: 'ASC' }, format, append });
	if (!cleanedBuffers) return;

	const senseStates = await SenseState.backup(path, { format, append });
	if (!senseStates) return;

	console.log(ch.green('SCRIPT:'), 'All db data has been', ch.green('successfully'), 'backed up');
})()
