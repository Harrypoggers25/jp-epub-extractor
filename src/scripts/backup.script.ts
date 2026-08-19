// CONFIGS
import { BookBuffer, SentenceBuffer, WordType, TokenBuffer, JishoBuffer, WordBuffer, EntryState, Word } from "../configs/db.config";

// MODULES
import ch from "@harrypoggers25/color-utils";
import env from "../configs/env.config";

(async () => {
	const path = env.DB_BACKUP_DIR;
	const append = true;
	const format = 'json';

	const wordTypes = await WordType.backup(path, { orderBy: { created_at: 'ASC' }, format });
	if (!wordTypes) return;

	const bookBuffers = await BookBuffer.backup(path, { format, append });
	if (!bookBuffers) return;

	const sentenceBuffers = await SentenceBuffer.backup(path, { orderBy: { section_no: 'ASC', sentence_no: 'ASC' }, format, append });
	if (!sentenceBuffers) return;

	const tokenBuffer = await TokenBuffer.backup(path, { orderBy: { created_at: 'ASC' }, format, append });
	if (!tokenBuffer) return;

	const jishoBuffers = await JishoBuffer.backup(path, { orderBy: { created_at: 'ASC' }, format, append });
	if (!jishoBuffers) return;

	const wordBuffers = await WordBuffer.backup(path, { orderBy: { created_at: 'ASC' }, format, append });
	if (!wordBuffers) return;

	const entryStates = await EntryState.backup(path, { format, append });
	if (!entryStates) return;

	const words = await Word.backup(path, { format, append });
	if (!words) return;

	console.log(ch.green('SCRIPT:'), 'All db data has been', ch.green('successfully'), 'backed up');
})()
