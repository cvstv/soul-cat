export interface Cat {key:string;sourceId:string;animalId:string;name:string;ageMonths:number|null;sex:string;breed:string;coat:string;confirmation:'confirmed'|'visual'|'unknown';shelter:string;city:string;location:string;photo:string|null;adoptionUrl:string;adoptionFee:string|null;description:string;firstSeen:string;lastSeen:string;availability:'listed'|'not_listed';}
export interface Source {id:string;name:string;url:string;connected:boolean;status:string;count:number;lastSuccess:string|null;message:string;}
export interface Scan {id:string;startedAt:string;finishedAt:string|null;trigger:string;status:string;newCount:number;sources:Source[];}
export interface Inventory {cats:Cat[];sources:Source[];runs:Scan[];nextCheck:string;lastSuccess:string|null;}
export type Listing=Omit<Cat,'key'|'firstSeen'|'lastSeen'|'availability'>;
