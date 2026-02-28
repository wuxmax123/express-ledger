
CREATE POLICY "Rate supervisors can update channel status"
  ON public.shipping_channels
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'rate_supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'rate_supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
