const {Pool}=require('pg');
const p=new Pool({host:'localhost',port:5432,database:'haven_db',user:'bab_user',password:'bab_password'});
async function run(){
  const c=await p.connect();
  try{
    await c.query('CREATE TABLE IF NOT EXISTS group_reactions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id), emoji VARCHAR(10) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(message_id, user_id, emoji))');
    console.log('group_reactions table created');
  }catch(e){console.error(e)}finally{c.release();await p.end()}
}
run();
