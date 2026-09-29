import {createServer} from 'node:http';
import {handle} from './api';
createServer(async(req,res)=>{
 const url='http://'+req.headers.host+req.url;
 const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);
 const response=await handle(new Request(url,{method:req.method,headers}));
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
}).listen(8787,'127.0.0.1',()=>console.log('Soul Cat API: http://127.0.0.1:8787'));
