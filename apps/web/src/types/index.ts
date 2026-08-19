export type { Database } from './database'

export interface User {
  id: string
  email?: string
  username: string
  display_name: string
  avatar_url?: string
  cover_url?: string
  bio?: string
  website?: string
  location?: string
  is_private: boolean
  is_verified: boolean
  followers_count: number
  following_count: number
  posts_count: number
  created_at: string
}

export interface Post {
  id: string
  user_id: string
  content?: string
  type: 'text' | 'image' | 'video' | 'poll' | 'repost'
  audience: 'public' | 'followers' | 'friends' | 'close_friends' | 'only_me'
  repost_of?: string
  quote_text?: string
  likes_count: number
  comments_count: number
  reposts_count: number
  is_pinned: boolean
  is_sensitive: boolean
  alt_text?: string
  location?: string
  created_at: string
  updated_at: string
  user?: User
  media?: PostMedia[]
  is_liked?: boolean
  is_bookmarked?: boolean
}

export interface PostMedia {
  id: string
  post_id: string
  url: string
  type: 'image' | 'video' | 'gif'
  alt_text?: string
  width?: number
  height?: number
  duration?: number
  order: number
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  parent_id?: string
  likes_count: number
  created_at: string
  updated_at: string
  user?: User
  replies?: Comment[]
  is_liked?: boolean
}

export interface Conversation {
  id: string
  type: 'direct' | 'group'
  name?: string
  avatar_url?: string
  last_message_at?: string
  created_at: string
  members?: ConversationMember[]
  last_message?: Message
  unread_count?: number
}

export interface ConversationMember {
  conversation_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  last_read_at?: string
  is_muted: boolean
  joined_at: string
  user?: User
}

export interface Message {
  id: string
  conversation_id: string
  user_id: string
  content?: string
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice' | 'system'
  reply_to_id?: string
  is_edited: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  user?: User
  reply_to?: Message
  attachments?: MessageAttachment[]
  reactions?: MessageReaction[]
  receipt?: MessageReceipt
}

export interface MessageAttachment {
  id: string
  message_id: string
  url: string
  type: string
  name: string
  size: number
}

export interface MessageReaction {
  message_id: string
  user_id: string
  emoji: string
}

export interface MessageReceipt {
  message_id: string
  user_id: string
  status: 'pending' | 'sent' | 'delivered' | 'read'
}

export interface Group {
  id: string
  name: string
  slug: string
  description?: string
  avatar_url?: string
  cover_url?: string
  owner_id: string
  is_private: boolean
  members_count: number
  created_at: string
  updated_at: string
  owner?: User
}

export interface Story {
  id: string
  user_id: string
  type: 'image' | 'video' | 'text'
  content?: string
  media_url?: string
  duration: number
  audience: 'everyone' | 'followers' | 'close_friends' | 'custom'
  views_count: number
  expires_at: string
  created_at: string
  user?: User
  is_viewed?: boolean
}

export interface Notification {
  id: string
  user_id: string
  type: string
  from_user_id?: string
  entity_type?: string
  entity_id?: string
  content?: string
  is_read: boolean
  created_at: string
  from_user?: User
}

export interface SecurityEvent {
  id: string
  user_id: string
  type: string
  ip_address?: string
  user_agent?: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface Report {
  id: string
  reporter_id: string
  target_type: 'user' | 'post' | 'comment' | 'message' | 'story' | 'group' | 'community'
  target_id: string
  reason: string
  description?: string
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  created_at: string
}
