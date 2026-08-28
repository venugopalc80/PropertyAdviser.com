import http from 'node:http';
import crypto from 'node:crypto';
import { hashPassword, verifyPassword, createSessionToken } from './auth.js';
import { query } from './db.js';

const port = Number(process.env.PORT || 8787);
const sessions = new Map();
const demoHomes = [
  { id: 1, city: 'Austin, TX', price: 895000, beds: 4, baths: 3, sqft: 2640, type: 'Single Family', address: '1804 Westlake Dr' },
  { id: 2, city: 'Miami, FL', price: 1245000, beds: 3, baths: 2.5, sqft: 2110, type: 'Condo', address: '285 Biscayne Blvd' },
  { id: 3, city: 'Charlotte, NC', price: 749000, beds: 3, baths: 2, sqft: 1980, type: 'Townhouse', address: '912 Queens Rd' },
  { id: 4, city: 'Scottsdale, AZ', price: 2095000, beds: 5, baths: 4, sqft: 4350, type: 'Single Family', address: '7442 N Sunset Blvd' },
  { id: 5, city: 'Denver, CO', price: 589000, beds: 2, baths: 2, sqft: 1240, type: 'Condo', address: '1550 Larimer St' },
  { id: 6, city: 'Nashville, TN', price: 1650000, beds: 4, baths: 3.5, sqft: 3120, type: 'Single Family', address: '4211 Belle Meade Blvd' },
  { id: 7, city: 'Seattle, WA', price: 1125000, beds: 3, baths: 2, sqft: 1870, type: 'Single Family', address: '512 Queen Anne Ave' },
  { id: 8, city: 'Chicago, IL', price: 675000, beds: 3, baths: 2, sqft: 1640, type: 'Condo', address: '820 N State St' }
];

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': process.env.CORS_ORIGIN || 'http://localhost:5173', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS' });
  res.end(JSON.stringify(body));
}
async function body(req) { let raw=''; for await (const chunk of req) raw+=chunk; try{return JSON.parse(raw||'{}')}catch{return null} }
function validEmail(v){return typeof v==='string'&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)}
function session(req){const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');const s=sessions.get(token);if(!s||s.expiresAt<Date.now()){if(token)sessions.delete(token);return null}return{token,user:s.user}}
async function dbReady(){try{await query('SELECT 1');return true}catch{return false}}
async function findUserByEmail(email){const r=await query('SELECT id,email,first_name,last_name,role,password_hash FROM users WHERE email=$1',[email]);return r.rows[0]||null}
async function safeUser(u){return{id:u.id,email:u.email,firstName:u.first_name,lastName:u.last_name,role:u.role}}

const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS')return json(res,204,{});
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  try{
    if(req.method==='GET'&&url.pathname==='/api/health'){
      const database=await dbReady(); return json(res,200,{ok:true,service:'propertyadviser-api',database,timestamp:new Date().toISOString()});
    }
    if(req.method==='POST'&&url.pathname==='/api/auth/register'){
      const b=await body(req); if(!b||!validEmail(b.email)||typeof b.password!=='string'||b.password.length<8||typeof b.firstName!=='string'||typeof b.lastName!=='string')return json(res,400,{error:'Valid name, email and an 8+ character password are required.'});
      if(!(await dbReady()))return json(res,503,{error:'Database is not configured.'});
      const email=b.email.trim().toLowerCase(); if(await findUserByEmail(email))return json(res,409,{error:'An account with that email already exists.'});
      const r=await query('INSERT INTO users(email,password_hash,first_name,last_name) VALUES($1,$2,$3,$4) RETURNING id,email,first_name,last_name,role',[email,hashPassword(b.password),b.firstName.trim(),b.lastName.trim()]);
      const u=await safeUser(r.rows[0]);const token=createSessionToken();sessions.set(token,{user:u,expiresAt:Date.now()+7*86400000});return json(res,201,{user:u,token});
    }
    if(req.method==='POST'&&url.pathname==='/api/auth/login'){
      const b=await body(req);if(!b||!validEmail(b.email)||typeof b.password!=='string')return json(res,400,{error:'Email and password are required.'});
      if(!(await dbReady()))return json(res,503,{error:'Database is not configured.'}); const u=await findUserByEmail(b.email.trim().toLowerCase());
      if(!u||!verifyPassword(b.password,u.password_hash))return json(res,401,{error:'Invalid email or password.'});const safe=await safeUser(u);const token=createSessionToken();sessions.set(token,{user:safe,expiresAt:Date.now()+7*86400000});return json(res,200,{user:safe,token});
    }
    if(req.method==='GET'&&url.pathname==='/api/auth/me'){const s=session(req);return s?json(res,200,{user:s.user}):json(res,401,{error:'Authentication required.'})}
    if(req.method==='POST'&&url.pathname==='/api/auth/logout'){const s=session(req);if(s)sessions.delete(s.token);return json(res,200,{ok:true})}
    if(req.method==='GET'&&url.pathname==='/api/listings'){
      const q=(url.searchParams.get('q')||'').toLowerCase(),type=url.searchParams.get('type')||'',min=Number(url.searchParams.get('min')||0),max=Number(url.searchParams.get('max')||Number.MAX_SAFE_INTEGER),beds=Number(url.searchParams.get('beds')||0);
      if(await dbReady()){
        const r=await query(`SELECT id,address,city,state,zip_code AS "zipCode",price,bedrooms AS beds,bathrooms AS baths,sqft,property_type AS type,description FROM properties WHERE status IN ('active','pending') AND ($1='' OR LOWER(city||' '||address) LIKE '%'||$1||'%') AND ($2='' OR property_type=$2) AND price BETWEEN $3 AND $4 AND bedrooms >= $5 ORDER BY created_at DESC LIMIT 100`,[q,type,min,max,beds]);
        return json(res,200,{data:r.rows,count:r.rowCount,source:'postgresql'});
      }
      const data=demoHomes.filter(h=>(!q||`${h.city} ${h.address}`.toLowerCase().includes(q))&&(!type||h.type===type)&&h.price>=min&&h.price<=max&&h.beds>=beds);return json(res,200,{data,count:data.length,source:'demo'});
    }
    if(req.method==='POST'&&url.pathname==='/api/leads'){
      const b=await body(req);if(!b||typeof b.name!=='string'||b.name.trim().length<2||!validEmail(b.email))return json(res,400,{error:'Please provide a valid name and email address.'});
      if(await dbReady()){const s=session(req);const r=await query('INSERT INTO leads(property_id,user_id,name,email,phone,message,source) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[b.propertyId||null,s?.user.id||null,b.name.trim(),b.email.trim().toLowerCase(),b.phone||null,b.message||null,b.source||'website']);return json(res,201,{ok:true,id:r.rows[0].id,source:'postgresql'});}
      return json(res,503,{error:'Database is not configured. Lead was not stored.'});
    }
    if(req.method==='GET'&&url.pathname==='/api/saved-properties'){
      const s=session(req);if(!s)return json(res,401,{error:'Authentication required.'});if(!(await dbReady()))return json(res,503,{error:'Database is not configured.'});
      const r=await query('SELECT property_id AS "propertyId" FROM saved_properties WHERE user_id=$1 ORDER BY created_at DESC',[s.user.id]);return json(res,200,{data:r.rows});
    }
    if(req.method==='POST'&&url.pathname==='/api/saved-properties'){
      const s=session(req);if(!s)return json(res,401,{error:'Authentication required.'});const b=await body(req);if(!b?.propertyId)return json(res,400,{error:'propertyId is required.'});if(!(await dbReady()))return json(res,503,{error:'Database is not configured.'});
      await query('INSERT INTO saved_properties(user_id,property_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[s.user.id,b.propertyId]);return json(res,201,{ok:true});
    }
    if(req.method==='DELETE'&&url.pathname==='/api/saved-properties'){
      const s=session(req);if(!s)return json(res,401,{error:'Authentication required.'});const id=url.searchParams.get('propertyId');if(!id)return json(res,400,{error:'propertyId is required.'});if(!(await dbReady()))return json(res,503,{error:'Database is not configured.'});
      await query('DELETE FROM saved_properties WHERE user_id=$1 AND property_id=$2',[s.user.id,id]);return json(res,200,{ok:true});
    }
    return json(res,404,{error:'Not found'});
  }catch(e){console.error(e);return json(res,500,{error:'Internal server error.'})}
});
server.listen(port,()=>console.log(`PropertyAdviser API listening on ${port}`));
