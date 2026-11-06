-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  birth_date DATE,
  gender TEXT
);

-- Create vitals table
CREATE TABLE IF NOT EXISTS vitals (
  id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  blood_pressure TEXT,
  glucose FLOAT8,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  file_url TEXT,
  type TEXT,
  diagnosis TEXT
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  content TEXT,
  is_ai_response BOOL DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type TEXT,
  time TIMESTAMPTZ,
  is_completed BOOL DEFAULT FALSE
);

-- Create a link between Supabase auth and patients table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create new patient record when a user signs up
  INSERT INTO public.patients (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Patient'),
    COALESCE(NEW.email, '')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Set up Row Level Security (RLS) for patient data
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies to allow users to access only their data
CREATE POLICY "Users can view their own profile"
  ON patients FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON patients FOR UPDATE
  USING (auth.uid() = id);

-- Vitals policies
CREATE POLICY "Users can view their own vitals"
  ON vitals FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Users can insert their own vitals"
  ON vitals FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- Reports policies
CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Users can insert their own reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- Messages policies
CREATE POLICY "Users can view their own messages"
  ON messages FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Users can insert their own messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- Reminders policies
CREATE POLICY "Users can view their own reminders"
  ON reminders FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Users can insert their own reminders"
  ON reminders FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Users can update their own reminders"
  ON reminders FOR UPDATE
  USING (auth.uid() = patient_id); 