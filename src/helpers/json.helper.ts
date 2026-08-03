export function isArrayObj<T = any>(obj: any, every?: (elem: any) => boolean): obj is Array<T> {
    every = every ?? (() => true)

    return (Array.isArray(obj) && obj.every(every));
}
