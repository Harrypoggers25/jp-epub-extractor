// CONFIGS
import ch from "@harrypoggers25/color-utils";
import { db } from "../configs/db.config";

db.sync({
    alter: true,
    onSuccessAlter: async (transaction) => {
        console.log(ch.green('CREATE SCRIPT:'), `Altered db. All previous data have been`, ch.red('deleted'));
    }
})
