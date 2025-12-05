-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.generate_version_code(p_channel_id INTEGER)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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