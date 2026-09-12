import {refresh} from '../../server/collector';
export default async()=>{await refresh('scheduled');};
export const config={schedule:'0 0,15,20 * * *'};
