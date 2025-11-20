-- Add conditional_rules JSON field to shipping_channels table
ALTER TABLE public.shipping_channels 
ADD COLUMN conditional_rules JSONB DEFAULT NULL;

COMMENT ON COLUMN public.shipping_channels.conditional_rules IS 'JSON字段存储条件性计费规则，例如分段泡比、重量阈值等复杂逻辑';

-- Example structure for conditional_rules:
-- {
--   "type": "conditional_divisor",
--   "rules": [
--     {
--       "condition": {
--         "weight_max": 2,
--         "volume_ratio_threshold": 2,
--         "base_divisor": 6000
--       },
--       "actions": {
--         "if_exceeds": { "divisor": 8000 },
--         "if_not_exceeds": { "use": "actual_weight" }
--       }
--     }
--   ],
--   "default_behavior": "compare_and_take_larger"
-- }