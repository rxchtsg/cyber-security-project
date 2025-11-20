-- Create raw incidents table for uploaded CSV data
CREATE TABLE IF NOT EXISTS public.incidents_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  row_data JSONB NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create normalized incidents table
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ,
  date DATE,
  week INTEGER,
  year INTEGER,
  site TEXT,
  area TEXT,
  hazard TEXT,
  severity TEXT,
  severity_num INTEGER,
  status TEXT,
  assignee TEXT,
  description TEXT,
  raw_id UUID REFERENCES public.incidents_raw(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create mappings table for column name mapping
CREATE TABLE IF NOT EXISTS public.mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_incidents_date ON public.incidents(date);
CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON public.incidents(timestamp);
CREATE INDEX IF NOT EXISTS idx_incidents_site ON public.incidents(site);
CREATE INDEX IF NOT EXISTS idx_incidents_area ON public.incidents(area);
CREATE INDEX IF NOT EXISTS idx_incidents_hazard ON public.incidents(hazard);
CREATE INDEX IF NOT EXISTS idx_incidents_severity_num ON public.incidents(severity_num);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);

-- Enable RLS
ALTER TABLE public.incidents_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mappings ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access for demo purposes
CREATE POLICY "Allow all operations on incidents_raw" ON public.incidents_raw FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on incidents" ON public.incidents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on mappings" ON public.mappings FOR ALL USING (true) WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mappings_updated_at
  BEFORE UPDATE ON public.mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();