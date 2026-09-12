import {refresh} from './collector';
console.log(JSON.stringify(await refresh('cli'),null,2));
