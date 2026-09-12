import {createServer} from 'node:http';
import {handle} from './api';
createServer(async(req,res)=>{
 const url='http://'+req.headers.host+req.url;
 const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);
 // Vite proxies the browser request; retain the browser origin for the same-origin check.
 const origin=headers.get('origin');const requestUrl=origin&&/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)?origin+req.url:url;
 const response=await handle(new Request(requestUrl,{method:req.method,headers}));
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
}).listen(8787,'127.0.0.1',()=>console.log('Soul Cat API: http://127.0.0.1:8787'));
