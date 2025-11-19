-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'rate_supervisor', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create approval_status enum
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Create vendors table
CREATE TABLE public.vendors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  contact_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shipping_channels table
CREATE TABLE public.shipping_channels (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER REFERENCES public.vendors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  channel_code VARCHAR(100) UNIQUE NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  region VARCHAR(100),
  service_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vendor_batches table
CREATE TABLE public.vendor_batches (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER REFERENCES public.vendors(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  effective_date DATE,
  total_channels INTEGER DEFAULT 0,
  notes TEXT,
  approval_status public.approval_status DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT
);

-- Create channel_rate_sheets table
CREATE TABLE public.channel_rate_sheets (
  id SERIAL PRIMARY KEY,
  channel_id INTEGER REFERENCES public.shipping_channels(id) ON DELETE CASCADE,
  batch_id INTEGER REFERENCES public.vendor_batches(id) ON DELETE SET NULL,
  version_code VARCHAR(50) NOT NULL,
  effective_date DATE NOT NULL,
  file_name VARCHAR(255),
  uploaded_by UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'active',
  approval_status public.approval_status DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (channel_id, version_code)
);

-- Create channel_rate_items table
CREATE TABLE public.channel_rate_items (
  id SERIAL PRIMARY KEY,
  sheet_id INTEGER REFERENCES public.channel_rate_sheets(id) ON DELETE CASCADE,
  country VARCHAR(100) NOT NULL,
  zone VARCHAR(50),
  weight_from DECIMAL(10,3) NOT NULL,
  weight_to DECIMAL(10,3) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  eta VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_rate_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_rate_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for vendors (read-only for authenticated users)
CREATE POLICY "Authenticated users can view vendors"
  ON public.vendors
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage vendors"
  ON public.vendors
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for shipping_channels
CREATE POLICY "Authenticated users can view channels"
  ON public.shipping_channels
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage channels"
  ON public.shipping_channels
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for vendor_batches
CREATE POLICY "Authenticated users can view batches"
  ON public.vendor_batches
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create batches"
  ON public.vendor_batches
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Rate supervisors can update batch approval"
  ON public.vendor_batches
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'rate_supervisor') OR 
    public.has_role(auth.uid(), 'admin')
  );

-- RLS policies for channel_rate_sheets
CREATE POLICY "Authenticated users can view rate sheets"
  ON public.channel_rate_sheets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create rate sheets"
  ON public.channel_rate_sheets
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Rate supervisors can update sheet approval"
  ON public.channel_rate_sheets
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'rate_supervisor') OR 
    public.has_role(auth.uid(), 'admin')
  );

-- RLS policies for channel_rate_items
CREATE POLICY "Authenticated users can view rate items"
  ON public.channel_rate_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create rate items"
  ON public.channel_rate_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_vendors_code ON public.vendors(code);
CREATE INDEX idx_channels_vendor ON public.shipping_channels(vendor_id);
CREATE INDEX idx_channels_code ON public.shipping_channels(channel_code);
CREATE INDEX idx_batches_vendor ON public.vendor_batches(vendor_id);
CREATE INDEX idx_batches_approval_status ON public.vendor_batches(approval_status);
CREATE INDEX idx_sheets_channel ON public.channel_rate_sheets(channel_id);
CREATE INDEX idx_sheets_batch ON public.channel_rate_sheets(batch_id);
CREATE INDEX idx_sheets_approval_status ON public.channel_rate_sheets(approval_status);
CREATE INDEX idx_items_sheet ON public.channel_rate_items(sheet_id);
CREATE INDEX idx_items_country ON public.channel_rate_items(country);

-- Insert sample vendors
INSERT INTO public.vendors (name, code, contact_info) VALUES
('云途物流', 'YUNEXPRESS', '{"email": "service@yunexpress.com"}'),
('顺友物流', 'SUNYOU', '{"email": "service@sunyou.com"}'),
('万邦速达', 'WANB', '{"email": "service@wanb.com"}'),
('燕文物流', 'YANWEN', '{"email": "service@yanwen.com"}'),
('4PX递四方', '4PX', '{"email": "service@4px.com"}');