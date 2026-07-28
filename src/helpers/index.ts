// MODULES
import ch from "@harrypoggers25/color-utils";

export function displayProgress(i: number, count: number) {
	console.log(ch.green('Progress:'), `${Math.round((i / count * 100) * 100) / 100}%`);
}

export const asyncHandler = async <T>(errorHeader: string, handler: () => Promise<T>): Promise<T | undefined> => {
	try {
		return await handler();
	} catch (error: any) {
		console.log(ch.red(`${errorHeader}:`), error.message ?? error);
		return undefined;
	}
}
