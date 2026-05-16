import pg from 'pg'

const { Client } = pg

const client = new Client({
  host:     'db.abuonkvyvtwrjgkgtdcy.supabase.co',
  port:     5432,
  database: 'postgres',
  user:     'postgres',
  password: 'hemdyp-6domWi-ryqraf',
  ssl:      { rejectUnauthorized: false },
})

await client.connect()
console.log('🔗 Connected to Supabase\n')

try {
  await client.query(`
    create table if not exists ratings (
      id          bigint primary key generated always as identity,
      table_ref   text    not null default '5',
      food        smallint not null default 5,
      service     smallint not null default 5,
      overall     smallint not null default 5,
      comment     text    not null default '',
      created_at  timestamptz not null default now()
    );
  `)
  console.log('✓ ratings table created')

  await client.query(`
    alter table ratings enable row level security;
  `)
  console.log('✓ RLS enabled on ratings')

  await client.query(`
    create policy if not exists "anyone can insert ratings"
      on ratings for insert to anon with check (true);
  `)
  console.log('✓ insert policy created')

  await client.query(`
    create policy if not exists "anyone can read ratings"
      on ratings for select to anon using (true);
  `)
  console.log('✓ select policy created')

} catch (e) {
  console.log('⚠ ', e.message)
}

await client.end()
console.log('\n✅ Done.')
