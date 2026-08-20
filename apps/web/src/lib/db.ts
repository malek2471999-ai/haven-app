import { Pool } from 'pg'

const isLocal = process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1')

const pool = process.env.DATABASE_URL && !isLocal
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : new Pool({
      host: 'localhost',
      port: 5432,
      database: 'haven_db',
      user: 'bab_user',
      password: 'bab_password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })

export default pool

let migrationPromise: Promise<void> | null = null

function getMigrations(): string[] {
  return [
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,

    `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      cover_url TEXT,
      bio TEXT,
      website TEXT,
      location TEXT,
      is_private BOOLEAN DEFAULT FALSE,
      is_verified BOOLEAN DEFAULT FALSE,
      followers_count INT DEFAULT 0,
      following_count INT DEFAULT 0,
      posts_count INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS user_settings (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      language TEXT DEFAULT 'ar',
      theme TEXT DEFAULT 'dark',
      notifications_enabled BOOLEAN DEFAULT TRUE,
      two_factor_enabled BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS privacy_settings (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      last_seen_visibility TEXT DEFAULT 'followers',
      online_status_visibility TEXT DEFAULT 'followers',
      dm_privacy TEXT DEFAULT 'followers',
      story_privacy TEXT DEFAULT 'followers',
      group_invite_privacy TEXT DEFAULT 'friends',
      allow_search_discovery BOOLEAN DEFAULT TRUE,
      allow_mention BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS follows (
      follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
      following_id UUID REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (follower_id, following_id)
    )`,

    `CREATE TABLE IF NOT EXISTS follow_requests (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(requester_id, target_id)
    )`,

    `CREATE TABLE IF NOT EXISTS blocks (
      blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
      blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (blocker_id, blocked_id)
    )`,

    `CREATE TABLE IF NOT EXISTS mutes (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      muted_id UUID REFERENCES users(id) ON DELETE CASCADE,
      mute_type TEXT DEFAULT 'all',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, muted_id)
    )`,

    `CREATE TABLE IF NOT EXISTS posts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT,
      type TEXT DEFAULT 'text',
      audience TEXT DEFAULT 'public',
      repost_of UUID REFERENCES posts(id),
      likes_count INT DEFAULT 0,
      comments_count INT DEFAULT 0,
      reposts_count INT DEFAULT 0,
      is_pinned BOOLEAN DEFAULT FALSE,
      is_sensitive BOOLEAN DEFAULT FALSE,
      alt_text TEXT,
      location TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS post_media (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      type TEXT NOT NULL,
      alt_text TEXT,
      width INT,
      height INT,
      duration INT,
      "order" INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS likes (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, post_id)
    )`,

    `CREATE TABLE IF NOT EXISTS comments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
      likes_count INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS bookmarks (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
      collection_id UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, post_id)
    )`,

    `CREATE TABLE IF NOT EXISTS bookmark_collections (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      type TEXT DEFAULT 'direct',
      name TEXT,
      avatar_url TEXT,
      last_message_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      is_anonymous BOOLEAN DEFAULT FALSE,
      owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
      members_count INT DEFAULT 0
    )`,

    `CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member',
      last_read_at TIMESTAMPTZ,
      is_muted BOOLEAN DEFAULT FALSE,
      last_typed_at TIMESTAMPTZ,
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (conversation_id, user_id)
    )`,

    `CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT,
      type TEXT DEFAULT 'text',
      reply_to_id UUID REFERENCES messages(id),
      is_pinned BOOLEAN DEFAULT FALSE,
      pinned_at TIMESTAMPTZ,
      forwarded BOOLEAN DEFAULT FALSE,
      expires_at TIMESTAMPTZ,
      is_edited BOOLEAN DEFAULT FALSE,
      is_deleted BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS message_receipts (
      message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (message_id, user_id)
    )`,

    `CREATE TABLE IF NOT EXISTS message_reactions (
      id UUID DEFAULT uuid_generate_v4(),
      message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (message_id, user_id, emoji)
    )`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      from_user_id UUID REFERENCES users(id),
      entity_type TEXT,
      entity_id UUID,
      content TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS group_members (
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member',
      is_banned BOOLEAN DEFAULT FALSE,
      can_write BOOLEAN DEFAULT TRUE,
      last_typed_at TIMESTAMPTZ,
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (conversation_id, user_id)
    )`,

    `CREATE TABLE IF NOT EXISTS group_messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      group_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT,
      type TEXT DEFAULT 'text',
      reply_to_id UUID REFERENCES group_messages(id),
      is_pinned BOOLEAN DEFAULT FALSE,
      pinned_at TIMESTAMPTZ,
      forwarded BOOLEAN DEFAULT FALSE,
      expires_at TIMESTAMPTZ,
      is_edited BOOLEAN DEFAULT FALSE,
      is_deleted BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS group_reactions (
      id UUID DEFAULT uuid_generate_v4(),
      message_id UUID REFERENCES group_messages(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      emoji TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (message_id, user_id, emoji)
    )`,

    `CREATE TABLE IF NOT EXISTS stories (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      content TEXT,
      media_url TEXT,
      duration INT DEFAULT 5,
      audience TEXT DEFAULT 'everyone',
      views_count INT DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS story_views (
      story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (story_id, user_id)
    )`,

    `CREATE TABLE IF NOT EXISTS security_events (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS devices (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      browser TEXT,
      os TEXT,
      ip_address TEXT,
      is_trusted BOOLEAN DEFAULT FALSE,
      last_active TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_type TEXT NOT NULL,
      target_id UUID NOT NULL,
      reason TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS password_resets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS recovery_codes (
      id UUID DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code VARCHAR(20) NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (id)
    )`,

    `CREATE TABLE IF NOT EXISTS two_factor_auth (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      secret TEXT NOT NULL,
      is_enabled BOOLEAN DEFAULT FALSE,
      enabled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
    `CREATE INDEX IF NOT EXISTS idx_users_lower_username ON users(lower(username))`,
    `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
    `CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id)`,
    `CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_stories_user ON stories(user_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id)`,
  ]
}

async function runMigrations() {
  const migrations = getMigrations()
  try {
    for (const sql of migrations) {
      try {
        await pool.query(sql)
      } catch (e: any) {
        if (!e.message?.includes('already exists')) {
          console.error('Migration error:', e.message)
        }
      }
    }
    console.log('HAVEN: Database migrations completed')
  } catch (error: any) {
    console.error('HAVEN: Migration failed:', error.message)
  }
}

migrationPromise = runMigrations()

export async function query(text: string, params?: any[]) {
  if (migrationPromise) {
    await migrationPromise
    migrationPromise = null
  }
  const result = await pool.query(text, params)
  return result
}
