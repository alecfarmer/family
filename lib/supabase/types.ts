// Hand-written Database type mirroring the SQL in supabase/migrations.
// Replace this file with the output of `supabase gen types typescript`
// once the project is linked to a live Supabase instance.
//
// Format follows the standard supabase-js generator: a top-level `Database`
// type with `public.Tables`, `public.Views`, `public.Enums`, `public.Functions`
// where each table has `Row`, `Insert`, `Update`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          full_name: string;
          role: Database["public"]["Enums"]["user_role"];
          created_at: string;
          last_seen_activity: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
          last_seen_activity?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
          last_seen_activity?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      households: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id: string;
          is_household_admin: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id: string;
          is_household_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_id?: string;
          is_household_admin?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey";
            columns: ["household_id"];
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "household_members_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      credentials: {
        Row: {
          id: string;
          household_id: string | null;
          category: Database["public"]["Enums"]["credential_category"];
          service_name: string;
          username: string | null;
          password_encrypted: string;
          url: string | null;
          notes: string | null;
          is_shared: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string | null;
          category?: Database["public"]["Enums"]["credential_category"];
          service_name: string;
          username?: string | null;
          password_encrypted: string;
          url?: string | null;
          notes?: string | null;
          is_shared?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string | null;
          category?: Database["public"]["Enums"]["credential_category"];
          service_name?: string;
          username?: string | null;
          password_encrypted?: string;
          url?: string | null;
          notes?: string | null;
          is_shared?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credentials_household_id_fkey";
            columns: ["household_id"];
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      devices: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          type: Database["public"]["Enums"]["device_type"];
          brand: string | null;
          model: string | null;
          serial_number: string | null;
          purchase_date: string | null;
          warranty_expiry: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          type?: Database["public"]["Enums"]["device_type"];
          brand?: string | null;
          model?: string | null;
          serial_number?: string | null;
          purchase_date?: string | null;
          warranty_expiry?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          type?: Database["public"]["Enums"]["device_type"];
          brand?: string | null;
          model?: string | null;
          serial_number?: string | null;
          purchase_date?: string | null;
          warranty_expiry?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "devices_household_id_fkey";
            columns: ["household_id"];
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      knowledge_base: {
        Row: {
          id: string;
          household_id: string | null;
          title: string;
          content: string;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string | null;
          title: string;
          content: string;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string | null;
          title?: string;
          content?: string;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_base_household_id_fkey";
            columns: ["household_id"];
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      help_requests: {
        Row: {
          id: string;
          user_id: string;
          household_id: string | null;
          message: string;
          chat_transcript: Json;
          source: string;
          status: Database["public"]["Enums"]["help_status"];
          resolved_notes: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          household_id?: string | null;
          message: string;
          chat_transcript?: Json;
          source?: string;
          status?: Database["public"]["Enums"]["help_status"];
          resolved_notes?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          household_id?: string | null;
          message?: string;
          chat_transcript?: Json;
          source?: string;
          status?: Database["public"]["Enums"]["help_status"];
          resolved_notes?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "help_requests_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "help_requests_household_id_fkey";
            columns: ["household_id"];
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      access_log: {
        Row: {
          id: string;
          user_id: string | null;
          household_id: string | null;
          action: string;
          resource_id: string | null;
          resource_type: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          household_id?: string | null;
          action: string;
          resource_id?: string | null;
          resource_type?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          household_id?: string | null;
          action?: string;
          resource_id?: string | null;
          resource_type?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "access_log_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_log_household_id_fkey";
            columns: ["household_id"];
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Enums: {
      user_role: "admin" | "member";
      credential_category:
        | "internet"
        | "mobile"
        | "streaming"
        | "smart_home"
        | "utilities"
        | "other";
      device_type:
        | "tv"
        | "router"
        | "modem"
        | "phone"
        | "tablet"
        | "laptop"
        | "desktop"
        | "smart_home"
        | "other";
      help_status: "open" | "resolved";
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      my_household_ids: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      set_updated_at: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
    };
    CompositeTypes: { [_ in never]: never };
  };
};

// ---------------------------------------------------------------------------
// Convenience aliases. These mirror the helpers that `supabase gen types`
// emits and keep call sites short.
// ---------------------------------------------------------------------------

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];

export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];
