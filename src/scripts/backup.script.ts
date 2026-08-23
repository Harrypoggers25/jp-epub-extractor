// CONFIGS
import { BookBuffer, SentenceBuffer, WordType, TokenBuffer, JishoBuffer, WordBuffer, EntryState, Word, UnsureWordBuffer, UnsureEntryState } from "../configs/db.config";

// MODULES
import ch from "@harrypoggers25/color-utils";
import env from "../configs/env.config";

function backupMessage(tableName: string, rows: any) {
	console.log(ch.green('DB BACKUP'), `[${ch.cyan(tableName)}]:`, `${ch.yellow(rows.length)} rows backed up`);
}
(async () => {
	const path = env.DB_BACKUP_DIR;
	const append = true;
	const format = 'json';

	const wordTypes = await WordType.backup(path, { orderBy: { created_at: 'ASC' }, format });
	if (!wordTypes) return;
	backupMessage(WordType.tableName, wordTypes);

	const bookBuffers = await BookBuffer.backup(path, { format, append });
	if (!bookBuffers) return;
	backupMessage(BookBuffer.tableName, bookBuffers);

	const sentenceBuffers = await SentenceBuffer.backup(path, { orderBy: { section_no: 'ASC', sentence_no: 'ASC' }, format, append });
	if (!sentenceBuffers) return;
	backupMessage(SentenceBuffer.tableName, sentenceBuffers);

	const tokenBuffer = await TokenBuffer.backup(path, { orderBy: { created_at: 'ASC' }, format, append });
	if (!tokenBuffer) return;
	backupMessage(TokenBuffer.tableName, tokenBuffer);

	const jishoBuffers = await JishoBuffer.backup(path, { orderBy: { created_at: 'ASC' }, format, append });
	if (!jishoBuffers) return;
	backupMessage(JishoBuffer.tableName, jishoBuffers);

	const wordBuffers = await WordBuffer.backup(path, { orderBy: { created_at: 'ASC' }, format, append });
	if (!wordBuffers) return;
	backupMessage(WordBuffer.tableName, wordBuffers);

	const entryStates = await EntryState.backup(path, { format, append });
	if (!entryStates) return;
	backupMessage(EntryState.tableName, entryStates);

	const unsureWordBuffers = await UnsureWordBuffer.backup(path, { orderBy: { created_at: 'ASC' }, format, append });
	if (!unsureWordBuffers) return;
	backupMessage(UnsureWordBuffer.tableName, unsureWordBuffers);

	const unsureEntryStates = await UnsureEntryState.backup(path, { format, append });
	if (!unsureEntryStates) return;
	backupMessage(UnsureEntryState.tableName, unsureEntryStates);

	const words = await Word.backup(path, { format, append });
	if (!words) return;
	backupMessage(Word.tableName, words);

	console.log(ch.green('SCRIPT:'), 'All db data has been', ch.green('successfully'), 'backed up');
})()
