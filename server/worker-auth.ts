import {createHmac,timingSafeEqual} from 'node:crypto';
export function signJob(id:string,secret:string):string{
 if(!secret)throw new Error('Worker signing secret is missing');
 return createHmac('sha256',secret).update(id).digest('hex');
}
export function verifyJobSignature(id:string,signature:string,secret:string):boolean{
 if(!secret||!/^[a-f0-9]{64}$/i.test(signature))return false;
 const expected=Buffer.from(signJob(id,secret),'hex'),actual=Buffer.from(signature,'hex');
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
