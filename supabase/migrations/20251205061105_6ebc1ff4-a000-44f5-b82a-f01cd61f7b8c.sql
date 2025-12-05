-- Create effective_versions table for official versions (created after approval)
CREATE TABLE public.effective_versions (
  id SERIAL PRIMARY KEY,
  version_code VARCHAR(50) NOT NULL, -- V1, V2, V3 or YYYYMMDD-01 format
  batch_id INTEGER REFERENCES public.vendor_batches(id),
  channel_id INTEGER REFERENCES public.shipping_channels(id),
  effective_date DATE NOT NULL,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure unique version per channel
  UNIQUE(channel_id, version_code)
);

-- Add index for performance
CREATE INDEX idx_effective_versions_channel ON public.effective_versions(channel_id);
CREATE INDEX idx_effective_versions_batch ON public.effective_versions(batch_id);
CREATE INDEX idx_effective_versions_active ON public.effective_versions(is_active);

-- Enable RLS
ALTER TABLE public.effective_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view effective versions"
ON public.effective_versions
FOR SELECT
USING (true);

CREATE POLICY "Rate supervisors can create effective versions"
ON public.effective_versions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'rate_supervisor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Rate supervisors can update effective versions"
ON public.effective_versions
FOR UPDATE
USING (has_role(auth.uid(), 'rate_supervisor') OR has_role(auth.uid(), 'admin'));

-- Add batch_code to vendor_batches for tracking import batches
ALTER TABLE public.vendor_batches 
ADD COLUMN IF NOT EXISTS batch_code VARCHAR(50);

-- Create function to generate version code
CREATE OR REPLACE FUNCTION public.generate_version_code(p_channel_id INTEGER)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
  v_code VARCHAR(50);
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.effective_versions
  WHERE channel_id = p_channel_id;
  
  v_code := 'V' || v_count;
  RETURN v_code;
END;
$$;