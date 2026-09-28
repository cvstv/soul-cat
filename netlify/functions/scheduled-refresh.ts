import {dispatchScan} from '../../server/scan-dispatch';
export default async()=>{await dispatchScan('scheduled');};
export const config={schedule:'0 0,15,20 * * *'};
