import React from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

interface ChannelLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: {
    id: number;
    channel_code: string;
    name: string;
    volume_weight_divisor: number;
    max_length: number | null;
    max_width: number | null;
    max_height: number | null;
    max_weight: number | null;
    max_single_side: number | null;
    dimension_limit_notes: string | null;
    conditional_rules: any | null;
  };
  onSave: (data: any) => void;
}

export function ChannelLimitDialog({
  open,
  onOpenChange,
  channel,
  onSave,
}: ChannelLimitDialogProps) {
  const [useConditionalRules, setUseConditionalRules] = React.useState(
    !!channel.conditional_rules
  );
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      volume_weight_divisor: channel.volume_weight_divisor || 5000,
      max_length: channel.max_length || '',
      max_width: channel.max_width || '',
      max_height: channel.max_height || '',
      max_weight: channel.max_weight || '',
      max_single_side: channel.max_single_side || '',
      dimension_limit_notes: channel.dimension_limit_notes || '',
      // Conditional rules
      cond_weight_max: channel.conditional_rules?.rules?.[0]?.condition?.weight_max || 2,
      cond_base_divisor: channel.conditional_rules?.rules?.[0]?.condition?.base_divisor || 6000,
      cond_ratio_threshold: channel.conditional_rules?.rules?.[0]?.condition?.volume_ratio_threshold || 2,
      cond_exceeds_divisor: channel.conditional_rules?.rules?.[0]?.actions?.if_exceeds?.divisor || 8000,
    },
  });

  const onSubmit = (data: any) => {
    // Convert empty strings to null
    const cleanedData: any = {
      volume_weight_divisor: Number(data.volume_weight_divisor),
      max_length: data.max_length ? Number(data.max_length) : null,
      max_width: data.max_width ? Number(data.max_width) : null,
      max_height: data.max_height ? Number(data.max_height) : null,
      max_weight: data.max_weight ? Number(data.max_weight) : null,
      max_single_side: data.max_single_side ? Number(data.max_single_side) : null,
      dimension_limit_notes: data.dimension_limit_notes || null,
    };

    // Add conditional rules if enabled
    if (useConditionalRules) {
      cleanedData.conditional_rules = {
        type: 'conditional_divisor',
        rules: [
          {
            condition: {
              weight_max: Number(data.cond_weight_max),
              base_divisor: Number(data.cond_base_divisor),
              volume_ratio_threshold: Number(data.cond_ratio_threshold),
            },
            actions: {
              if_exceeds: {
                divisor: Number(data.cond_exceeds_divisor),
              },
              if_not_exceeds: {
                use: 'actual_weight',
              },
            },
          },
        ],
        default_behavior: 'compare_and_take_larger',
      };
    } else {
      cleanedData.conditional_rules = null;
    }

    onSave(cleanedData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>编辑渠道限制 - {channel.channel_code}</DialogTitle>
          <DialogDescription>{channel.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">基础设置</TabsTrigger>
              <TabsTrigger value="advanced">条件规则</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="volume_weight_divisor">
                  体积重量系数（泡比） <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="volume_weight_divisor"
                  type="number"
                  step="1"
                  {...register('volume_weight_divisor', {
                    required: '请输入泡比',
                    min: { value: 1000, message: '泡比不能小于1000' },
                  })}
                  placeholder="例如: 5000 或 6000"
                  disabled={useConditionalRules}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {useConditionalRules 
                    ? '条件规则已启用，将使用规则中定义的泡比' 
                    : '体积重量 = 长(cm) × 宽(cm) × 高(cm) / 泡比'}
                </p>
                {errors.volume_weight_divisor && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.volume_weight_divisor.message}
                  </p>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="max_length">最大长度 (cm)</Label>
                  <Input
                    id="max_length"
                    type="number"
                    step="0.1"
                    {...register('max_length')}
                    placeholder="可选"
                  />
                </div>
                <div>
                  <Label htmlFor="max_width">最大宽度 (cm)</Label>
                  <Input
                    id="max_width"
                    type="number"
                    step="0.1"
                    {...register('max_width')}
                    placeholder="可选"
                  />
                </div>
                <div>
                  <Label htmlFor="max_height">最大高度 (cm)</Label>
                  <Input
                    id="max_height"
                    type="number"
                    step="0.1"
                    {...register('max_height')}
                    placeholder="可选"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_weight">最大重量 (kg)</Label>
                  <Input
                    id="max_weight"
                    type="number"
                    step="0.1"
                    {...register('max_weight')}
                    placeholder="可选"
                  />
                </div>
                <div>
                  <Label htmlFor="max_single_side">单边最大限制 (cm)</Label>
                  <Input
                    id="max_single_side"
                    type="number"
                    step="0.1"
                    {...register('max_single_side')}
                    placeholder="可选"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="dimension_limit_notes">备注说明</Label>
                <Textarea
                  id="dimension_limit_notes"
                  {...register('dimension_limit_notes')}
                  placeholder="输入尺寸限制的额外说明..."
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <Label className="text-base">启用条件性泡比规则</Label>
                  <p className="text-sm text-muted-foreground">
                    根据包裹重量和体积比率动态选择泡比
                  </p>
                </div>
                <Switch
                  checked={useConditionalRules}
                  onCheckedChange={setUseConditionalRules}
                />
              </div>

              {useConditionalRules && (
                <>
                  <div className="p-4 border rounded-lg bg-background space-y-4">
                    <h4 className="font-medium">条件设置</h4>
                    
                    <div>
                      <Label htmlFor="cond_weight_max">重量阈值 (kg)</Label>
                      <Input
                        id="cond_weight_max"
                        type="number"
                        step="0.1"
                        {...register('cond_weight_max')}
                        placeholder="2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        当实重 ≤ 此值时应用条件规则
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cond_base_divisor">基准泡比</Label>
                        <Input
                          id="cond_base_divisor"
                          type="number"
                          step="1"
                          {...register('cond_base_divisor')}
                          placeholder="6000"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          用于计算体积比率
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="cond_ratio_threshold">比率阈值</Label>
                        <Input
                          id="cond_ratio_threshold"
                          type="number"
                          step="0.1"
                          {...register('cond_ratio_threshold')}
                          placeholder="2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          体积比率超过此值时切换泡比
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="cond_exceeds_divisor">超出阈值时使用的泡比</Label>
                      <Input
                        id="cond_exceeds_divisor"
                        type="number"
                        step="1"
                        {...register('cond_exceeds_divisor')}
                        placeholder="8000"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        当体积比率超过阈值时使用此泡比
                      </p>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <h4 className="font-medium text-sm mb-2">规则说明</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      当实重 ≤ {watch('cond_weight_max') || 2}kg 时：
                      <br />• 若 (长×宽×高) / {watch('cond_base_divisor') || 6000} / 实重 &gt; {watch('cond_ratio_threshold') || 2}
                      <br />  则体积重 = (长×宽×高) / {watch('cond_exceeds_divisor') || 8000}
                      <br />• 若 (长×宽×高) / {watch('cond_base_divisor') || 6000} / 实重 ≤ {watch('cond_ratio_threshold') || 2}
                      <br />  则按实重收费
                      <br />• 最终计费重 = max(实重, 体积重)
                    </p>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit">
              保存
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
