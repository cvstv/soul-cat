import {dispatchScan} from '../../server/scan-dispatch';
import {scanAllowedHere} from '../../server/scan-context';
export default async()=>{if(scanAllowedHere(process.env))await dispatchScan('scheduled');};
export const config={schedule:'0 0,15,20 * * *'};
