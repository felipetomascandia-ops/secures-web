-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    business_name TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to user_profiles table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'phone') THEN
        ALTER TABLE user_profiles ADD COLUMN phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'address') THEN
        ALTER TABLE user_profiles ADD COLUMN address TEXT;
    END IF;
END $$;

-- Create admins table to identify admin users
CREATE TABLE IF NOT EXISTS admins (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to admins table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'first_name') THEN
        ALTER TABLE admins ADD COLUMN first_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'last_name') THEN
        ALTER TABLE admins ADD COLUMN last_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'email') THEN
        ALTER TABLE admins ADD COLUMN email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'role') THEN
        ALTER TABLE admins ADD COLUMN role TEXT DEFAULT 'admin';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admins' AND column_name = 'updated_at') THEN
        ALTER TABLE admins ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Enable Row Level Security for admins table
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for admins table
DROP POLICY IF EXISTS "Users can view their own admin record" ON admins;
DROP POLICY IF EXISTS "Users can insert their own admin record" ON admins;
DROP POLICY IF EXISTS "Users can update their own admin record" ON admins;

-- Create policies for admins table
CREATE POLICY "Users can view their own admin record"
    ON admins FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own admin record"
    ON admins FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own admin record"
    ON admins FOR UPDATE
    USING (auth.uid() = user_id);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile
    INSERT INTO public.user_profiles (user_id, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name'
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Automatically make admin if email ends with @olimpocoveragegroup.com and is verified
    IF NEW.email LIKE '%@olimpocoveragegroup.com' AND NEW.email_confirmed_at IS NOT NULL THEN
        INSERT INTO public.admins (user_id, first_name, last_name, email)
        VALUES (
            NEW.id,
            NEW.raw_user_meta_data->>'first_name',
            NEW.raw_user_meta_data->>'last_name',
            NEW.email
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    user_id UUID NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ticket_messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate for tickets
DROP POLICY IF EXISTS "Users can view their own tickets or admins can view all" ON tickets;
DROP POLICY IF EXISTS "Users can view their own tickets" ON tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON tickets;
DROP POLICY IF EXISTS "Users can update their own tickets or admins can update all" ON tickets;
DROP POLICY IF EXISTS "Users can update their own tickets" ON tickets;

-- Create policies for tickets
CREATE POLICY "Users can view their own tickets or admins can view all" 
  ON tickets FOR SELECT 
  USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create tickets" 
  ON tickets FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets or admins can update all"
  ON tickets FOR UPDATE
  USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- Drop existing policies and recreate for ticket_messages
DROP POLICY IF EXISTS "Users can view messages for their tickets or admins can view all" ON ticket_messages;
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON ticket_messages;
DROP POLICY IF EXISTS "Users can create messages on their tickets or admins can create on any" ON ticket_messages;
DROP POLICY IF EXISTS "Users can create messages on their tickets" ON ticket_messages;

-- Create policies for ticket_messages
CREATE POLICY "Users can view messages for their tickets or admins can view all" 
  ON ticket_messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_messages.ticket_id 
      AND tickets.user_id = auth.uid()
    ) OR 
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create messages on their tickets or admins can create on any" 
  ON ticket_messages FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_messages.ticket_id 
      AND tickets.user_id = auth.uid()
    ) OR 
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- Add tables to realtime publication (ignore errors if already added)
DO $$ 
BEGIN
    -- Add tickets table
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'tickets'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
    END IF;
    
    -- Add ticket_messages table
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'ticket_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages;
    END IF;
END $$;

-- Automatically make existing @olimpocoveragegroup.com users admins
DO $$
BEGIN
    INSERT INTO public.admins (user_id, first_name, last_name, email)
    SELECT 
        id,
        raw_user_meta_data->>'first_name',
        raw_user_meta_data->>'last_name',
        email
    FROM auth.users
    WHERE email LIKE '%@olimpocoveragegroup.com'
      AND email_confirmed_at IS NOT NULL
    ON CONFLICT (user_id) DO UPDATE 
    SET 
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        updated_at = NOW();
END $$;
