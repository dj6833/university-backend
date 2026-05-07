
const args = process.argv.slice(2);
const clearDBFlag = args.includes('--clear-db-data');

// process.argv.forEach((value, index) => {
//     console.log(index, value);
// });

if (clearDBFlag)
{
    console.log("clear all data?");
}

process.exit(0);

