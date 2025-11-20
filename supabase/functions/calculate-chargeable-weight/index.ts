import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalculateWeightRequest {
  length: number;  // cm
  width: number;   // cm
  height: number;  // cm
  actualWeight: number;  // kg
  conditionalRules?: ConditionalRules;
  volumeWeightDivisor?: number;
}

interface ConditionalRules {
  type: string;
  rules: ConditionalRule[];
  default_behavior?: string;
}

interface ConditionalRule {
  condition: {
    weight_max?: number;
    volume_ratio_threshold?: number;
    base_divisor?: number;
  };
  actions: {
    if_exceeds?: { divisor: number };
    if_not_exceeds?: { use: string; divisor?: number };
  };
}

interface CalculateWeightResponse {
  actualWeight: number;
  volumeWeight: number;
  chargeableWeight: number;
  calculation: string;
  ruleApplied?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      length, 
      width, 
      height, 
      actualWeight, 
      conditionalRules,
      volumeWeightDivisor = 5000 
    }: CalculateWeightRequest = await req.json();

    console.log('Received calculation request:', { length, width, height, actualWeight, conditionalRules, volumeWeightDivisor });

    // Validate inputs
    if (!length || !width || !height || actualWeight === undefined) {
      return new Response(
        JSON.stringify({ error: '缺少必要参数: length, width, height, actualWeight' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: CalculateWeightResponse;

    // Check if there are conditional rules
    if (conditionalRules && conditionalRules.rules && conditionalRules.rules.length > 0) {
      result = applyConditionalRules(length, width, height, actualWeight, conditionalRules);
    } else {
      // Simple calculation: volume weight vs actual weight
      const volumeWeight = (length * width * height) / volumeWeightDivisor;
      const chargeableWeight = Math.max(actualWeight, volumeWeight);
      
      result = {
        actualWeight,
        volumeWeight: Math.round(volumeWeight * 1000) / 1000,
        chargeableWeight: Math.round(chargeableWeight * 1000) / 1000,
        calculation: `体积重 = (${length} × ${width} × ${height}) / ${volumeWeightDivisor} = ${volumeWeight.toFixed(3)}kg\n计费重 = max(实重 ${actualWeight}kg, 体积重 ${volumeWeight.toFixed(3)}kg) = ${chargeableWeight.toFixed(3)}kg`
      };
    }

    console.log('Calculation result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in calculate-chargeable-weight:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function applyConditionalRules(
  length: number,
  width: number,
  height: number,
  actualWeight: number,
  conditionalRules: ConditionalRules
): CalculateWeightResponse {
  const volume = length * width * height;
  let calculation = '';
  let ruleApplied = '';

  // Find applicable rule
  for (const rule of conditionalRules.rules) {
    const { condition, actions } = rule;
    
    // Check if actual weight is within the condition
    if (condition.weight_max && actualWeight > condition.weight_max) {
      continue; // This rule doesn't apply
    }

    const baseDivisor = condition.base_divisor || 6000;
    const volumeRatio = volume / baseDivisor / actualWeight;
    const threshold = condition.volume_ratio_threshold || 2;

    calculation += `条件检查:\n`;
    calculation += `实重 ${actualWeight}kg ≤ ${condition.weight_max}kg ✓\n`;
    calculation += `体积比率 = (${length} × ${width} × ${height}) / ${baseDivisor} / ${actualWeight} = ${volumeRatio.toFixed(3)}\n`;

    if (volumeRatio > threshold) {
      // Use the alternate divisor
      const alternateDivisor = actions.if_exceeds?.divisor || 8000;
      const volumeWeight = volume / alternateDivisor;
      const chargeableWeight = Math.max(actualWeight, volumeWeight);
      
      calculation += `体积比率 ${volumeRatio.toFixed(3)} > ${threshold} ✓\n`;
      calculation += `体积重 = ${volume} / ${alternateDivisor} = ${volumeWeight.toFixed(3)}kg\n`;
      calculation += `计费重 = max(实重 ${actualWeight}kg, 体积重 ${volumeWeight.toFixed(3)}kg) = ${chargeableWeight.toFixed(3)}kg`;
      
      ruleApplied = `使用泡比 /${alternateDivisor} (体积比率超过阈值 ${threshold})`;

      return {
        actualWeight,
        volumeWeight: Math.round(volumeWeight * 1000) / 1000,
        chargeableWeight: Math.round(chargeableWeight * 1000) / 1000,
        calculation,
        ruleApplied
      };
    } else {
      // Use actual weight
      calculation += `体积比率 ${volumeRatio.toFixed(3)} ≤ ${threshold} ✓\n`;
      
      if (actions.if_not_exceeds?.use === 'actual_weight') {
        calculation += `按实重收费 = ${actualWeight}kg`;
        ruleApplied = `按实重收费 (体积比率未超过阈值 ${threshold})`;

        return {
          actualWeight,
          volumeWeight: volume / baseDivisor,
          chargeableWeight: actualWeight,
          calculation,
          ruleApplied
        };
      } else if (actions.if_not_exceeds?.divisor) {
        const divisor = actions.if_not_exceeds.divisor;
        const volumeWeight = volume / divisor;
        const chargeableWeight = Math.max(actualWeight, volumeWeight);
        
        calculation += `体积重 = ${volume} / ${divisor} = ${volumeWeight.toFixed(3)}kg\n`;
        calculation += `计费重 = max(实重 ${actualWeight}kg, 体积重 ${volumeWeight.toFixed(3)}kg) = ${chargeableWeight.toFixed(3)}kg`;
        
        ruleApplied = `使用泡比 /${divisor}`;

        return {
          actualWeight,
          volumeWeight: Math.round(volumeWeight * 1000) / 1000,
          chargeableWeight: Math.round(chargeableWeight * 1000) / 1000,
          calculation,
          ruleApplied
        };
      }
    }
  }

  // No rule applied, use default behavior
  const defaultDivisor = 5000;
  const volumeWeight = volume / defaultDivisor;
  const chargeableWeight = Math.max(actualWeight, volumeWeight);
  
  calculation = `未匹配到条件规则，使用默认计算:\n`;
  calculation += `体积重 = (${length} × ${width} × ${height}) / ${defaultDivisor} = ${volumeWeight.toFixed(3)}kg\n`;
  calculation += `计费重 = max(实重 ${actualWeight}kg, 体积重 ${volumeWeight.toFixed(3)}kg) = ${chargeableWeight.toFixed(3)}kg`;
  
  ruleApplied = `默认规则 (泡比 /${defaultDivisor})`;

  return {
    actualWeight,
    volumeWeight: Math.round(volumeWeight * 1000) / 1000,
    chargeableWeight: Math.round(chargeableWeight * 1000) / 1000,
    calculation,
    ruleApplied
  };
}
