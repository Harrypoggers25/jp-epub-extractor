import ch from "@harrypoggers25/color-utils";
import { WordBuffer, WordType } from "../configs/db.config";

(async () => {
    const append = true;
    const path = './database/epub-extractor-v1.sql';

    const wordTypes = await WordType.backup(path, { orderBy: { created_at: 'ASC' } });
    if (!wordTypes) return;

    const wordBuffers = await WordBuffer.backup(path, { orderBy: { created_at: 'ASC' }, append });
    if (!wordBuffers) return;

    console.log(ch.green('SCRIPT:'), 'All db data has been', ch.green('successfully'), 'backed up');
})()
