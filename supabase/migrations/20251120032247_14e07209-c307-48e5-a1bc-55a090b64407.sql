-- Add volume weight divisor and dimension limits to shipping_channels
ALTER TABLE shipping_channels
ADD COLUMN volume_weight_divisor numeric DEFAULT 5000,
ADD COLUMN max_length numeric,
ADD COLUMN max_width numeric,
ADD COLUMN max_height numeric,
ADD COLUMN max_weight numeric,
ADD COLUMN max_single_side numeric,
ADD COLUMN dimension_limit_notes text;

-- Add comment for clarity
COMMENT ON COLUMN shipping_channels.volume_weight_divisor IS '体积重量系数（泡比），通常为5000或6000';
COMMENT ON COLUMN shipping_channels.max_length IS '最大长度限制（厘米）';
COMMENT ON COLUMN shipping_channels.max_width IS '最大宽度限制（厘米）';
COMMENT ON COLUMN shipping_channels.max_height IS '最大高度限制（厘米）';
COMMENT ON COLUMN shipping_channels.max_weight IS '最大重量限制（千克）';
COMMENT ON COLUMN shipping_channels.max_single_side IS '单边最大限制（厘米）';
COMMENT ON COLUMN shipping_channels.dimension_limit_notes IS '尺寸限制备注说明';