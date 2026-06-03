import pg from 'pg'

const { Client } = pg

const client = new Client({
  host:     process.env.DB_HOST,
  port:     5432,
  database: 'postgres',
  user:     'postgres',
  password: process.env.DB_PASSWORD,
  ssl:      { rejectUnauthorized: false },
})

async function run(label, sql) {
  try {
    await client.query(sql)
    console.log(`✓ ${label}`)
  } catch (e) {
    console.log(`⚠  ${label}: ${e.message}`)
  }
}

await client.connect()
console.log('🔗 Connected to Supabase\n')

// ── Tables ────────────────────────────────────────────────────────────────────
await run('create menu_items', `
  create table if not exists menu_items (
    id          bigint primary key generated always as identity,
    name        text    not null,
    description text,
    price       integer not null default 0,
    category    text    not null default 'm',
    emoji       text    default '🍽️',
    hot         boolean default false
  )`)

await run('create orders', `
  create table if not exists orders (
    id         text    primary key,
    table_ref  text    not null default 'T1',
    items      text    not null,
    time       text    not null,
    status     text    not null default 'new',
    session_id text,
    total      integer not null default 0,
    created_at timestamptz default now()
  )`)

await run('create alerts', `
  create table if not exists alerts (
    id         bigint primary key generated always as identity,
    table_ref  text   not null,
    table_id   integer,
    type       text   not null,
    emoji      text   default '👨‍🍽️',
    time       text   not null,
    created_at timestamptz default now()
  )`)

await run('create reservations', `
  create table if not exists reservations (
    id        bigint  primary key generated always as identity,
    time      text    not null,
    table_ref text    not null,
    name      text    not null,
    confirmed boolean default false,
    guests    integer not null default 2,
    phone     text    not null default '',
    notes     text    not null default '',
    section   text    not null default ''
  )`)

await run('create queue', `
  create table if not exists queue (
    id        text primary key,
    table_ref text not null,
    items     text not null,
    waiter    text not null,
    status    text not null default 'assigned'
  )`)

await run('create restaurant_tables', `
  create table if not exists restaurant_tables (
    n                  integer primary key,
    status             text    not null default 'g',
    floor              integer not null default 1,
    label              text    not null default '',
    capacity           integer not null default 4,
    current_session_id text
  )`)

await run('create offers', `
  create table if not exists offers (
    id          bigint  primary key generated always as identity,
    title       text    not null,
    description text,
    active      boolean default true
  )`)

await run('create notifications', `
  create table if not exists notifications (
    id         bigint  primary key generated always as identity,
    table_ref  text    not null,
    message    text    not null,
    time       text    not null,
    color      text    not null default '#DCA95C',
    created_at timestamptz default now()
  )`)

// ── Realtime ──────────────────────────────────────────────────────────────────
for (const tbl of ['orders','alerts','restaurant_tables','offers','notifications']) {
  await run(`realtime: ${tbl}`, `
    DO $$ BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE ${tbl};
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$`)
}

// ── RLS ───────────────────────────────────────────────────────────────────────
for (const tbl of ['menu_items','orders','alerts','reservations','queue','restaurant_tables','offers','notifications']) {
  await run(`rls enable: ${tbl}`, `ALTER TABLE ${tbl} ENABLE ROW LEVEL SECURITY`)
  await run(`policy: ${tbl}`, `
    DO $$ BEGIN
      DROP POLICY IF EXISTS "public read-write" ON ${tbl};
      CREATE POLICY "public read-write" ON ${tbl}
        FOR ALL TO anon USING (true) WITH CHECK (true);
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$`)
}

// ── Seed ─────────────────────────────────────────────────────────────────────
console.log('\n📦 Seeding data...')

await run('seed: menu_items', `
  INSERT INTO menu_items (name, description, price, category, emoji, hot) VALUES
  ('ساج برايم',   'ستيك مشوي بصلصة الريف الأصيلة',  8500, 'm',  '🥩', true),
  ('ساج دجاج',    'دجاج مشوي مع خضار طازجة',          6500, 'm',  '🍗', false),
  ('بيتزا الريف', 'بيتزا طازجة بجبن موزاريلا',        7000, 'm',  '🍕', false),
  ('حمص طازج',    'مع زيت زيتون وبابريكا',             2500, 's',  '🧆', false),
  ('سلطة الريف',  'خضار طازجة مع ليمون وزيتون',       2000, 's',  '🥗', false),
  ('شاي عراقي',   'بالهيل والزعفران الطازج',           1000, 'd',  '🍵', false),
  ('عصير طازج',   'مشكل يومي طازج',                   2000, 'd',  '🥤', false),
  ('بقلاوة',      'مكسرات وعسل طبيعي أصيل',           2500, 'sw', '🍯', false)
  ON CONFLICT DO NOTHING`)

await run('seed: orders', `
  INSERT INTO orders (id, table_ref, items, time, status) VALUES
  ('#212','T8', 'ساج برايم (1)، بطاطا (2)','14:35','new'),
  ('#213','T5', 'بيتزا (1)، سلطة (1)',      '14:38','new'),
  ('#214','T6', 'ساج دجاج (2)',             '14:42','ready'),
  ('#215','T2', 'حمص (2)، شاي (3)',         '14:45','new'),
  ('#216','T11','بقلاوة (4)، عصير (2)',     '14:47','new')
  ON CONFLICT DO NOTHING`)

await run('seed: alerts', `
  INSERT INTO alerts (table_ref, type, emoji, time) VALUES
  ('6','نادل','👨‍🍽️','7:33'),
  ('11','ماء','💧','7:35'),
  ('5','مناديل','🧻','7:36')`)

await run('seed: reservations', `
  INSERT INTO reservations (time, table_ref, name, confirmed) VALUES
  ('13:00','T3','أحمد علي',true),
  ('14:30','T12','سارة محمد',true),
  ('19:00','T7','محمد حسن',false),
  ('20:30','T4','فاطمة خالد',false)`)

await run('seed: queue', `
  INSERT INTO queue (id, table_ref, items, waiter, status) VALUES
  ('#201','T8','ساج (1)، بطاطا (2)','أحمد','serving'),
  ('#202','T5','بيتزا (1)','نادية','assigned'),
  ('#203','T3','حمص (2)','سامي','done')
  ON CONFLICT DO NOTHING`)

await run('seed: restaurant_tables', `
  INSERT INTO restaurant_tables (n, status) VALUES
  (1,'g'),(2,'g'),(3,'e'),(4,'g'),(5,'f'),
  (6,'g'),(7,'e'),(8,'g'),(9,'g'),(10,'f'),
  (11,'f'),(12,'g'),(13,'f'),(14,'g'),(15,'e')
  ON CONFLICT DO NOTHING`)

await run('seed: offers', `
  INSERT INTO offers (title, description, active) VALUES
  ('Happy Hour',   'خصم 20% — 6-8 مساءً', true),
  ('وجبة العائلة','4 أشخاص بسعر 3',        true),
  ('عرض الغداء',  'طبق رئيسي + مشروب',    false),
  ('الجمعة الخاصة','خصم 15% للكل',         false)`)

await run('seed: notifications', `
  INSERT INTO notifications (table_ref, message, time, color) VALUES
  ('3','طلب الحساب','2 دق.','#E24B4A'),
  ('7','طلب جديد #216','5 دق.','#DCA95C'),
  ('11','نداء: ماء','8 دق.','#E8A020'),
  ('9','تقييم ★★★★★','12 دق.','#4CAF50')`)

await client.end()
console.log('\n✅ Supabase setup complete!')
