export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string
          avatar_url: string | null
          cover_url: string | null
          bio: string | null
          website: string | null
          location: string | null
          is_private: boolean
          is_verified: boolean
          followers_count: number
          following_count: number
          posts_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name: string
          avatar_url?: string | null
          cover_url?: string | null
          bio?: string | null
          website?: string | null
          location?: string | null
          is_private?: boolean
          is_verified?: boolean
          followers_count?: number
          following_count?: number
          posts_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string
          avatar_url?: string | null
          cover_url?: string | null
          bio?: string | null
          website?: string | null
          location?: string | null
          is_private?: boolean
          is_verified?: boolean
          followers_count?: number
          following_count?: number
          posts_count?: number
          updated_at?: string
        }
      }
      usernames: {
        Row: {
          username: string
          user_id: string
          created_at: string
        }
        Insert: {
          username: string
          user_id: string
          created_at?: string
        }
        Update: {
          username?: string
          user_id?: string
        }
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          follower_id?: string
          following_id?: string
        }
      }
      follow_requests: {
        Row: {
          id: string
          requester_id: string
          target_id: string
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          target_id: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'accepted' | 'rejected'
        }
      }
      friendships: {
        Row: {
          user_id_1: string
          user_id_2: string
          status: 'pending' | 'accepted'
          created_at: string
        }
        Insert: {
          user_id_1: string
          user_id_2: string
          status?: 'pending' | 'accepted'
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'accepted'
        }
      }
      blocks: {
        Row: {
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          blocker_id?: string
          blocked_id?: string
        }
      }
      mutes: {
        Row: {
          user_id: string
          muted_id: string
          mute_type: 'posts' | 'stories' | 'messages' | 'calls' | 'all'
          created_at: string
        }
        Insert: {
          user_id: string
          muted_id: string
          mute_type?: 'posts' | 'stories' | 'messages' | 'calls' | 'all'
          created_at?: string
        }
        Update: {
          mute_type?: 'posts' | 'stories' | 'messages' | 'calls' | 'all'
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          content: string | null
          type: 'text' | 'image' | 'video' | 'poll' | 'repost'
          audience: 'public' | 'followers' | 'friends' | 'close_friends' | 'only_me'
          repost_of: string | null
          quote_text: string | null
          likes_count: number
          comments_count: number
          reposts_count: number
          is_pinned: boolean
          is_sensitive: boolean
          alt_text: string | null
          location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content?: string | null
          type?: 'text' | 'image' | 'video' | 'poll' | 'repost'
          audience?: 'public' | 'followers' | 'friends' | 'close_friends' | 'only_me'
          repost_of?: string | null
          quote_text?: string | null
          likes_count?: number
          comments_count?: number
          reposts_count?: number
          is_pinned?: boolean
          is_sensitive?: boolean
          alt_text?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          type?: 'text' | 'image' | 'video' | 'poll' | 'repost'
          audience?: 'public' | 'followers' | 'friends' | 'close_friends' | 'only_me'
          is_pinned?: boolean
          is_sensitive?: boolean
          alt_text?: string | null
          location?: string | null
          likes_count?: number
          comments_count?: number
          reposts_count?: number
          updated_at?: string
        }
      }
      post_media: {
        Row: {
          id: string
          post_id: string
          url: string
          type: 'image' | 'video' | 'gif'
          alt_text: string | null
          width: number | null
          height: number | null
          duration: number | null
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          url: string
          type: 'image' | 'video' | 'gif'
          alt_text?: string | null
          width?: number | null
          height?: number | null
          duration?: number | null
          order?: number
          created_at?: string
        }
        Update: {
          url?: string
          type?: 'image' | 'video' | 'gif'
          alt_text?: string | null
          order?: number
        }
      }
      likes: {
        Row: {
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          parent_id: string | null
          likes_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          parent_id?: string | null
          likes_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          content?: string
          likes_count?: number
          updated_at?: string
        }
      }
      comment_likes: {
        Row: {
          user_id: string
          comment_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          comment_id: string
          created_at?: string
        }
        Update: {
          created_at?: string
        }
      }
      bookmarks: {
        Row: {
          user_id: string
          post_id: string
          collection_id: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          post_id: string
          collection_id?: string | null
          created_at?: string
        }
        Update: {
          collection_id?: string | null
        }
      }
      bookmark_collections: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          name?: string
        }
      }
      conversations: {
        Row: {
          id: string
          type: 'direct' | 'group'
          name: string | null
          avatar_url: string | null
          last_message_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type?: 'direct' | 'group'
          name?: string | null
          avatar_url?: string | null
          last_message_at?: string | null
          created_at?: string
        }
        Update: {
          name?: string | null
          avatar_url?: string | null
          last_message_at?: string | null
        }
      }
      conversation_members: {
        Row: {
          conversation_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          last_read_at: string | null
          is_muted: boolean
          joined_at: string
        }
        Insert: {
          conversation_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          last_read_at?: string | null
          is_muted?: boolean
          joined_at?: string
        }
        Update: {
          role?: 'owner' | 'admin' | 'member'
          last_read_at?: string | null
          is_muted?: boolean
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          content: string | null
          type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice' | 'system'
          reply_to_id: string | null
          is_edited: boolean
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          content?: string | null
          type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice' | 'system'
          reply_to_id?: string | null
          is_edited?: boolean
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          is_edited?: boolean
          is_deleted?: boolean
          updated_at?: string
        }
      }
      message_receipts: {
        Row: {
          message_id: string
          user_id: string
          status: 'pending' | 'sent' | 'delivered' | 'read'
          created_at: string
          updated_at: string
        }
        Insert: {
          message_id: string
          user_id: string
          status?: 'pending' | 'sent' | 'delivered' | 'read'
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'pending' | 'sent' | 'delivered' | 'read'
          updated_at?: string
        }
      }
      message_reactions: {
        Row: {
          message_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          emoji?: string
        }
      }
      message_attachments: {
        Row: {
          id: string
          message_id: string
          url: string
          type: string
          name: string
          size: number
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          url: string
          type: string
          name: string
          size: number
          created_at?: string
        }
        Update: {
          url?: string
          type?: string
          name?: string
          size?: number
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          from_user_id: string | null
          entity_type: string | null
          entity_id: string | null
          content: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          from_user_id?: string | null
          entity_type?: string | null
          entity_id?: string | null
          content?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          is_read?: boolean
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          avatar_url: string | null
          cover_url: string | null
          owner_id: string
          is_private: boolean
          members_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          avatar_url?: string | null
          cover_url?: string | null
          owner_id: string
          is_private?: boolean
          members_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          slug?: string
          description?: string | null
          avatar_url?: string | null
          cover_url?: string | null
          is_private?: boolean
          members_count?: number
          updated_at?: string
        }
      }
      group_members: {
        Row: {
          group_id: string
          user_id: string
          role: 'owner' | 'admin' | 'moderator' | 'member' | 'guest'
          joined_at: string
        }
        Insert: {
          group_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'moderator' | 'member' | 'guest'
          joined_at?: string
        }
        Update: {
          role?: 'owner' | 'admin' | 'moderator' | 'member' | 'guest'
        }
      }
      stories: {
        Row: {
          id: string
          user_id: string
          type: 'image' | 'video' | 'text'
          content: string | null
          media_url: string | null
          duration: number
          audience: 'everyone' | 'followers' | 'close_friends' | 'custom'
          views_count: number
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'image' | 'video' | 'text'
          content?: string | null
          media_url?: string | null
          duration?: number
          audience?: 'everyone' | 'followers' | 'close_friends' | 'custom'
          views_count?: number
          expires_at: string
          created_at?: string
        }
        Update: {
          content?: string | null
          media_url?: string | null
          audience?: 'everyone' | 'followers' | 'close_friends' | 'custom'
          views_count?: number
        }
      }
      story_views: {
        Row: {
          story_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          story_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          created_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          target_type: 'user' | 'post' | 'comment' | 'message' | 'story' | 'group' | 'community'
          target_id: string
          reason: string
          description: string | null
          status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          target_type: 'user' | 'post' | 'comment' | 'message' | 'story' | 'group' | 'community'
          target_id: string
          reason: string
          description?: string | null
          status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
        }
      }
      security_events: {
        Row: {
          id: string
          user_id: string
          type: string
          ip_address: string | null
          user_agent: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          metadata?: Json | null
        }
      }
      user_settings: {
        Row: {
          user_id: string
          language: string
          theme: 'dark' | 'light' | 'system'
          notifications_enabled: boolean
          email_notifications: boolean
          push_notifications: boolean
          two_factor_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          language?: string
          theme?: 'dark' | 'light' | 'system'
          notifications_enabled?: boolean
          email_notifications?: boolean
          push_notifications?: boolean
          two_factor_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          language?: string
          theme?: 'dark' | 'light' | 'system'
          notifications_enabled?: boolean
          email_notifications?: boolean
          push_notifications?: boolean
          two_factor_enabled?: boolean
          updated_at?: string
        }
      }
      privacy_settings: {
        Row: {
          user_id: string
          last_seen_visibility: 'everyone' | 'followers' | 'friends' | 'nobody'
          online_status_visibility: 'everyone' | 'followers' | 'friends' | 'nobody'
          dm_privacy: 'everyone' | 'followers' | 'friends' | 'nobody'
          story_privacy: 'everyone' | 'followers' | 'close_friends' | 'custom'
          group_invite_privacy: 'everyone' | 'followers' | 'friends' | 'nobody'
          allow_search_discovery: boolean
          allow_mention: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          last_seen_visibility?: 'everyone' | 'followers' | 'friends' | 'nobody'
          online_status_visibility?: 'everyone' | 'followers' | 'friends' | 'nobody'
          dm_privacy?: 'everyone' | 'followers' | 'friends' | 'nobody'
          story_privacy?: 'everyone' | 'followers' | 'close_friends' | 'custom'
          group_invite_privacy?: 'everyone' | 'followers' | 'friends' | 'nobody'
          allow_search_discovery?: boolean
          allow_mention?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          last_seen_visibility?: 'everyone' | 'followers' | 'friends' | 'nobody'
          online_status_visibility?: 'everyone' | 'followers' | 'friends' | 'nobody'
          dm_privacy?: 'everyone' | 'followers' | 'friends' | 'nobody'
          story_privacy?: 'everyone' | 'followers' | 'close_friends' | 'custom'
          group_invite_privacy?: 'everyone' | 'followers' | 'friends' | 'nobody'
          allow_search_discovery?: boolean
          allow_mention?: boolean
          updated_at?: string
        }
      }
      hashtags: {
        Row: {
          id: string
          name: string
          posts_count: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          posts_count?: number
          created_at?: string
        }
        Update: {
          name?: string
          posts_count?: number
        }
      }
      post_hashtags: {
        Row: {
          post_id: string
          hashtag_id: string
        }
        Insert: {
          post_id: string
          hashtag_id: string
        }
        Update: {
          post_id?: string
          hashtag_id?: string
        }
      }
      mentions: {
        Row: {
          id: string
          post_id: string | null
          comment_id: string | null
          mentioned_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id?: string | null
          comment_id?: string | null
          mentioned_user_id: string
          created_at?: string
        }
        Update: {
          post_id?: string | null
          comment_id?: string | null
          mentioned_user_id?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_username_availability: {
        Args: { p_username: string }
        Returns: boolean
      }
      create_profile: {
        Args: {
          p_user_id: string
          p_username: string
          p_display_name: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
