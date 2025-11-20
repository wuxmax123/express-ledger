import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calculator, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface WeightCalculatorProps {
  channelId: number;
  channelCode: string;
  conditionalRules: any;
  volumeWeightDivisor: number;
}

export function WeightCalculator({ 
  channelId, 
  channelCode, 
  conditionalRules,
  volumeWeightDivisor 
}: WeightCalculatorProps) {
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [actualWeight, setActualWeight] = useState('');
  const [result, setResult] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);

  const handleCalculate = async () => {
    if (!length || !width || !height || !actualWeight) {
      toast.error('请填写所有必填字段');
      return;
    }

    setCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-chargeable-weight', {
        body: {
          length: parseFloat(length),
          width: parseFloat(width),
          height: parseFloat(height),
          actualWeight: parseFloat(actualWeight),
          conditionalRules,
          volumeWeightDivisor,
        },
      });

      if (error) throw error;
      setResult(data);
    } catch (error: any) {
      console.error('Calculation error:', error);
      toast.error('计算失败: ' + error.message);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          计费重量测试 - {channelCode}
        </CardTitle>
        <CardDescription>
          输入包裹尺寸和重量，测试该渠道的计费规则
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <Label htmlFor="test-length">长度 (cm)</Label>
            <Input
              id="test-length"
              type="number"
              step="0.1"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="30"
            />
          </div>
          <div>
            <Label htmlFor="test-width">宽度 (cm)</Label>
            <Input
              id="test-width"
              type="number"
              step="0.1"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="20"
            />
          </div>
          <div>
            <Label htmlFor="test-height">高度 (cm)</Label>
            <Input
              id="test-height"
              type="number"
              step="0.1"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="10"
            />
          </div>
          <div>
            <Label htmlFor="test-weight">实重 (kg)</Label>
            <Input
              id="test-weight"
              type="number"
              step="0.1"
              value={actualWeight}
              onChange={(e) => setActualWeight(e.target.value)}
              placeholder="1.5"
            />
          </div>
        </div>

        {/* 周长和围长显示 */}
        {(length || width || height) && (
          <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">周长</p>
              </div>
              <p className="text-xl font-bold font-mono">
                {(() => {
                  const l = Number(length) || 0;
                  const w = Number(width) || 0;
                  if (l || w) {
                    return ((l + w) * 2).toFixed(1) + ' cm';
                  }
                  return '-';
                })()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">(长+宽)×2</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">围长</p>
              </div>
              <p className="text-xl font-bold font-mono">
                {(() => {
                  const l = Number(length) || 0;
                  const w = Number(width) || 0;
                  const h = Number(height) || 0;
                  if (l || w || h) {
                    return (l + 2 * (w + h)).toFixed(1) + ' cm';
                  }
                  return '-';
                })()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">长+2×(宽+高)</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">体积</p>
              </div>
              <p className="text-xl font-bold font-mono">
                {(() => {
                  const l = Number(length) || 0;
                  const w = Number(width) || 0;
                  const h = Number(height) || 0;
                  if (l && w && h) {
                    return (l * w * h).toFixed(1) + ' cm³';
                  }
                  return '-';
                })()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">长×宽×高</p>
            </div>
          </div>
        )}

        <Button onClick={handleCalculate} disabled={calculating} className="w-full">
          <Calculator className="h-4 w-4 mr-2" />
          {calculating ? '计算中...' : '计算计费重量'}
        </Button>

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
              <div>
                <p className="text-sm text-muted-foreground">实重</p>
                <p className="text-2xl font-bold">{result.actualWeight} kg</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">体积重</p>
                <p className="text-2xl font-bold">{result.volumeWeight} kg</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">计费重</p>
                <p className="text-2xl font-bold text-primary">{result.chargeableWeight} kg</p>
              </div>
            </div>

            {result.ruleApplied && (
              <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <p className="text-sm font-medium">应用规则</p>
                <p className="text-sm text-muted-foreground mt-1">{result.ruleApplied}</p>
              </div>
            )}

            <div className="p-4 border rounded-lg bg-background">
              <p className="text-sm font-medium mb-2">计算详情</p>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                {result.calculation}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
