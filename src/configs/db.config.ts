// MODULES
import Db, { DataTypes } from '@harrypoggers25/db-postgresql';
import env from './env.config.js';

export const db = Db.config({
	user: env.DB_USER,
	host: env.DB_HOST,
	database: env.DB_NAME,
	password: env.DB_PASSWORD,
	port: env.DB_PORT
});

export const WordType = db.define('word_types', {
	wt_name: { type: DataTypes.VARCHAR(511), allowNull: false, primaryKey: true },
	wt_description: { type: DataTypes.TEXT, allowNull: true },
	created_at: { type: DataTypes.TIMESTAMP, allowNull: false },
});
export interface IWordType extends ReturnType<typeof WordType.getEmptyModel> { };

export const BookBuffer = db.define('book_buffers', {
	book_id: { type: DataTypes.VARCHAR(31), allowNull: false, primaryKey: true },
	book_name: { type: DataTypes.TEXT, allowNull: true },
	book_filename: { type: DataTypes.TEXT, allowNull: true },
	book_original_name: { type: DataTypes.TEXT, allowNull: true },
	confirmed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
	sections: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
	created_at: { type: DataTypes.TIMESTAMP, allowNull: false },
});
export interface IBookBuffer extends ReturnType<typeof BookBuffer.getEmptyModel> { };

export const SentenceBuffer = db.define('sentence_buffers', {
	section_no: { type: DataTypes.INTEGER, allowNull: false },
	sentence_no: { type: DataTypes.INTEGER, allowNull: false },
	sentence_text: { type: DataTypes.TEXT, allowNull: false },
	book_id: { type: DataTypes.VARCHAR(31), allowNull: false },
});
SentenceBuffer.setForeignKey(BookBuffer, 'book_id');
export interface ISentenceBuffer extends ReturnType<typeof SentenceBuffer.getEmptyModel> { };

export const TokenBuffer = db.define('token_buffers', {
	token_id: { type: DataTypes.INTEGER, allowNull: false },
	w_basic_form: { type: DataTypes.VARCHAR(511), allowNull: false },
	w_reading: { type: DataTypes.VARCHAR(511), allowNull: false },
	surface_form: { type: DataTypes.VARCHAR(511), allowNull: false },
	w_pos_details: { type: DataTypes.VARCHAR(1023), allowNull: false },
	token_positions: { type: DataTypes.TEXT, allowNull: false, defaultValue: '{}' },
	created_at: { type: DataTypes.TIMESTAMP, allowNull: false },
	wt_name: { type: DataTypes.VARCHAR(511), allowNull: false },
});
TokenBuffer.setForeignKey(WordType, 'wt_name');
export interface ITokenBuffer extends ReturnType<typeof TokenBuffer.getEmptyModel> { };

export const JishoBuffer = db.define('jisho_buffers', {
	token_ids: { type: DataTypes.TEXT, allowNull: false },
	w_basic_form: { type: DataTypes.VARCHAR(511), allowNull: false },
	j_response: { type: DataTypes.TEXT, allowNull: false },
	token_positions: { type: DataTypes.TEXT, allowNull: false, defaultValue: '{}' },
	created_at: { type: DataTypes.TIMESTAMP, allowNull: false },
	wt_name: { type: DataTypes.VARCHAR(511), allowNull: false },
});
JishoBuffer.setForeignKey(WordType, 'wt_name');
export interface IJishoBuffer extends ReturnType<typeof JishoBuffer.getEmptyModel> { };

export const WordBuffer = db.define('word_buffers', {
	token_ids: { type: DataTypes.TEXT, allowNull: false, unique: true },
	w_basic_form: { type: DataTypes.VARCHAR(511), allowNull: false },
	w_character_type: { type: DataTypes.VARCHAR(16), allowNull: false, defaultValue: 'kanji' },
	j_response: { type: DataTypes.TEXT, allowNull: false },
	token_positions: { type: DataTypes.TEXT, allowNull: false, defaultValue: '{}' },
	occurrence_count: { type: DataTypes.INTEGER, allowNull: false },
	created_at: { type: DataTypes.TIMESTAMP, allowNull: false },
	wt_name: { type: DataTypes.VARCHAR(511), allowNull: false },
});
WordBuffer.setForeignKey(WordType, 'wt_name');
export interface IWordBuffer extends ReturnType<typeof WordBuffer.getEmptyModel> { };

export const EntryState = db.define('entry_states', {
	es_id: { type: DataTypes.VARCHAR(1023), allowNull: false, primaryKey: true },
	state: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
	unsure: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
	ignore: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
	merged_with: { type: DataTypes.VARCHAR(1023), allowNull: true },
	can_merge: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
});
export interface IEntryState extends ReturnType<typeof EntryState.getEmptyModel> { };

export const UnsureWordBuffer = db.define('unsure_word_buffers', {
	token_ids: { type: DataTypes.TEXT, allowNull: false },
	w_basic_form: { type: DataTypes.VARCHAR(511), allowNull: false },
	w_character_type: { type: DataTypes.VARCHAR(16), allowNull: false, defaultValue: 'kanji' },
	j_response: { type: DataTypes.TEXT, allowNull: false },
	occurrence_count: { type: DataTypes.INTEGER, allowNull: false },
	created_at: { type: DataTypes.TIMESTAMP, allowNull: false },
	wt_name: { type: DataTypes.VARCHAR(511), allowNull: false },
});
UnsureWordBuffer.setForeignKey(WordType, 'wt_name');
export interface IUnsureWordBuffer extends ReturnType<typeof UnsureWordBuffer.getEmptyModel> { };

export const UnsureEntryState = db.define('unsure_entry_states', {
	es_id: { type: DataTypes.VARCHAR(1023), allowNull: false, primaryKey: true },
	state: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
	ignore: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
	merged_with: { type: DataTypes.VARCHAR(1023), allowNull: true },
	can_merge: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
});
export interface IUnsureEntryState extends ReturnType<typeof UnsureEntryState.getEmptyModel> { };

export const Word = db.define('words', {
	token_ids: { type: DataTypes.TEXT, allowNull: false, unique: true },
	w_basic_form: { type: DataTypes.VARCHAR(511), allowNull: false },
	w_character_type: { type: DataTypes.VARCHAR(16), allowNull: false, defaultValue: 'kanji' },
	j_response: { type: DataTypes.TEXT, allowNull: false },
	occurrence_count: { type: DataTypes.INTEGER, allowNull: false },
	ignore: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
	created_at: { type: DataTypes.TIMESTAMP, allowNull: false },
	wt_name: { type: DataTypes.VARCHAR(511), allowNull: false },
});
Word.setForeignKey(WordType, 'wt_name');
export interface IWord extends ReturnType<typeof Word.getEmptyModel> { };

