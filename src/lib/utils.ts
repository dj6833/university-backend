
export const getRandomInclusive = (min:number, max:number): number => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//Useful for mocking delays in backend API threads
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));