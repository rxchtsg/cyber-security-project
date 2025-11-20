-- Add missing columns to incidents table
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS first_detection timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_detection timestamp with time zone,
ADD COLUMN IF NOT EXISTS detections integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS observation_duration text,
ADD COLUMN IF NOT EXISTS scenario text,
ADD COLUMN IF NOT EXISTS camera_name text;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_incidents_first_detection ON public.incidents(first_detection);
CREATE INDEX IF NOT EXISTS idx_incidents_scenario ON public.incidents(scenario);
CREATE INDEX IF NOT EXISTS idx_incidents_camera_name ON public.incidents(camera_name);
CREATE INDEX IF NOT EXISTS idx_incidents_area ON public.incidents(area);