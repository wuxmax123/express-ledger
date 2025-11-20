import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
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
import { Plus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface ChannelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel?: {
    id: number;
    channel_code: string;
    name: string;
    vendor_id: number | null;
    service_type: string | null;
    region: string | null;
    currency: string | null;
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

export function ChannelFormDialog({
  open,
  onOpenChange,
  channel,
  onSave,
}: ChannelFormDialogProps) {
  const isEditMode = !!channel;
  const [useConditionalRules, setUseConditionalRules] = useState(
    !!channel?.conditional_rules
  );

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, code, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      channel_code: channel?.channel_code || '',
      name: channel?.name || '',
      vendor_id: channel?.vendor_id?.toString() || '',
      service_type: channel?.service_type || '',
      region: channel?.region || '',
      currency: channel?.currency || 'USD',
      volume_weight_divisor: channel?.volume_weight_divisor || 5000,
      max_length: channel?.max_length || '',
      max_width: channel?.max_width || '',
      max_height: channel?.max_height || '',
      max_weight: channel?.max_weight || '',
      max_single_side: channel?.max_single_side || '',
      dimension_limit_notes: channel?.dimension_limit_notes || '',
      // Weight ranges for multi-threshold rules
      weight_ranges: channel?.conditional_rules?.ranges || [
        { max_weight: 20, divisor: 6000 }
      ],
      // Legacy conditional rules (kept for backward compatibility)
      cond_weight_max: channel?.conditional_rules?.rules?.[0]?.condition?.weight_max || 2,
      cond_base_divisor: channel?.conditional_rules?.rules?.[0]?.condition?.base_divisor || 6000,
      cond_ratio_threshold: channel?.conditional_rules?.rules?.[0]?.condition?.volume_ratio_threshold || 2,
      cond_exceeds_divisor: channel?.conditional_rules?.rules?.[0]?.actions?.if_exceeds?.divisor || 8000,
    },
  });

  // Reset form when channel changes
  useEffect(() => {
    if (channel) {
      reset({
        channel_code: channel.channel_code,
        name: channel.name,
        vendor_id: channel.vendor_id?.toString() || '',
        service_type: channel.service_type || '',
        region: channel.region || '',
        currency: channel.currency || 'USD',
        volume_weight_divisor: channel.volume_weight_divisor,
        max_length: channel.max_length || '',
        max_width: channel.max_width || '',
        max_height: channel.max_height || '',
        max_weight: channel.max_weight || '',
        max_single_side: channel.max_single_side || '',
        dimension_limit_notes: channel.dimension_limit_notes || '',
        weight_ranges: channel.conditional_rules?.ranges || [
          { max_weight: 20, divisor: 6000 }
        ],
        cond_weight_max: channel.conditional_rules?.rules?.[0]?.condition?.weight_max || 2,
        cond_base_divisor: channel.conditional_rules?.rules?.[0]?.condition?.base_divisor || 6000,
        cond_ratio_threshold: channel.conditional_rules?.rules?.[0]?.condition?.volume_ratio_threshold || 2,
        cond_exceeds_divisor: channel.conditional_rules?.rules?.[0]?.actions?.if_exceeds?.divisor || 8000,
      });
      setUseConditionalRules(!!channel.conditional_rules);
    }
  }, [channel, reset]);

  const onSubmit = (data: any) => {
    const cleanedData: any = {
      channel_code: data.channel_code.trim(),
      name: data.name.trim(),
      vendor_id: data.vendor_id ? Number(data.vendor_id) : null,
      service_type: data.service_type?.trim() || null,
      region: data.region?.trim() || null,
      currency: data.currency || 'USD',
      volume_weight_divisor: Number(data.volume_weight_divisor),
      max_length: data.max_length ? Number(data.max_length) : null,
      max_width: data.max_width ? Number(data.max_width) : null,
      max_height: data.max_height ? Number(data.max_height) : null,
      max_weight: data.max_weight ? Number(data.max_weight) : null,
      max_single_side: data.max_single_side ? Number(data.max_single_side) : null,
      dimension_limit_notes: data.dimension_limit_notes?.trim() || null,
    };

    // Add conditional rules if enabled
    if (useConditionalRules) {
      const weightRanges = data.weight_ranges || [];
      
      if (weightRanges.length > 0) {
        // Use new multi-weight-threshold format
        cleanedData.conditional_rules = {
          type: 'weight_ranges',
          ranges: weightRanges.map((range: any) => ({
            max_weight: range.max_weight ? Number(range.max_weight) : null,
            divisor: Number(range.divisor),
          })),
        };
      } else {
        // Fallback to legacy format for backward compatibility
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
      }
    } else {
      cleanedData.conditional_rules = null;
    }

    if (isEditMode) {
      cleanedData.id = channel.id;
    }

    onSave(cleanedData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? `编辑渠道 - ${channel.channel_code}` : '添加新渠道'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? '修改渠道的基本信息、泡比和尺寸限制' : '创建一个新的物流渠道'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="limits">尺寸限制</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="channel_code">
                    渠道代码 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="channel_code"
                    {...register('channel_code', {
                      required: '请输入渠道代码',
                      pattern: {
                        value: /^[A-Z0-9_-]+$/,
                        message: '渠道代码只能包含大写字母、数字、下划线和连字符',
                      },
                    })}
                    placeholder="例如: DHL-EXPRESS"
                    disabled={isEditMode}
                  />
                  {errors.channel_code && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.channel_code.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="name">
                    渠道名称 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...register('name', { required: '请输入渠道名称' })}
                    placeholder="例如: DHL 国际快递"
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendor_id">供应商</Label>
                  <Select
                    value={watch('vendor_id') || 'none'}
                    onValueChange={(value) => setValue('vendor_id', value === 'none' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择供应商（可选）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">无</SelectItem>
                      {vendors?.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id.toString()}>
                          {vendor.name} ({vendor.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="service_type">服务类型</Label>
                  <Input
                    id="service_type"
                    {...register('service_type')}
                    placeholder="例如: 快递、小包、专线"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="region">地区</Label>
                  <Input
                    id="region"
                    {...register('region')}
                    placeholder="例如: 美国、欧洲、全球"
                  />
                </div>

                <div>
                  <Label htmlFor="currency">货币</Label>
                  <Select
                    value={watch('currency')}
                    onValueChange={(value) => setValue('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD (美元)</SelectItem>
                      <SelectItem value="CNY">CNY (人民币)</SelectItem>
                      <SelectItem value="EUR">EUR (欧元)</SelectItem>
                      <SelectItem value="GBP">GBP (英镑)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="my-4" />

              {/* 泡比和重量段配置 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base">泡比配置</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">使用重量分段</span>
                    <Switch
                      checked={useConditionalRules}
                      onCheckedChange={setUseConditionalRules}
                    />
                  </div>
                </div>

                {!useConditionalRules ? (
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
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      体积重量 = 长(cm) × 宽(cm) × 高(cm) / 泡比
                    </p>
                    {errors.volume_weight_divisor && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.volume_weight_divisor.message}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">重量分段规则</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const currentRanges = watch('weight_ranges') || [
                            { max_weight: 20, divisor: 6000 }
                          ];
                          setValue('weight_ranges', [
                            ...currentRanges,
                            { max_weight: '', divisor: '' }
                          ]);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        添加重量段
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {(watch('weight_ranges') || [{ max_weight: 20, divisor: 6000 }]).map((range: any, index: number) => (
                        <div key={index} className="p-3 border rounded-lg bg-muted/50">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 grid grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs">重量起点 (kg)</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={index === 0 ? 0 : (watch('weight_ranges')?.[index - 1]?.max_weight || 0)}
                                  disabled
                                  className="bg-muted h-9 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">
                                  重量终点 (kg) {index === (watch('weight_ranges')?.length || 1) - 1 && <span className="text-muted-foreground">(留空=无上限)</span>}
                                </Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={range.max_weight}
                                  onChange={(e) => {
                                    const ranges = [...(watch('weight_ranges') || [])];
                                    ranges[index] = {
                                      ...ranges[index],
                                      max_weight: e.target.value ? Number(e.target.value) : ''
                                    };
                                    setValue('weight_ranges', ranges);
                                  }}
                                  placeholder="如: 20"
                                  className="h-9 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">泡比</Label>
                                <Input
                                  type="number"
                                  step="1"
                                  value={range.divisor}
                                  onChange={(e) => {
                                    const ranges = [...(watch('weight_ranges') || [])];
                                    ranges[index] = {
                                      ...ranges[index],
                                      divisor: e.target.value ? Number(e.target.value) : ''
                                    };
                                    setValue('weight_ranges', ranges);
                                  }}
                                  placeholder="如: 6000"
                                  className="h-9 text-sm"
                                />
                              </div>
                            </div>
                            {(watch('weight_ranges')?.length || 1) > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mt-5 h-9 w-9 p-0"
                                onClick={() => {
                                  const ranges = [...(watch('weight_ranges') || [])];
                                  ranges.splice(index, 1);
                                  setValue('weight_ranges', ranges);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {index === 0 ? '0' : (watch('weight_ranges')?.[index - 1]?.max_weight || 0)} - {range.max_weight || '∞'} kg: 泡比 /{range.divisor || '?'}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                      <h4 className="font-medium text-xs mb-2">规则说明</h4>
                      <div className="text-xs text-muted-foreground leading-relaxed space-y-1">
                        {(watch('weight_ranges') || [{ max_weight: 20, divisor: 6000 }]).map((range: any, index: number) => {
                          const prevWeight = index === 0 ? 0 : (watch('weight_ranges')?.[index - 1]?.max_weight || 0);
                          const currentWeight = range.max_weight || '以上';
                          return (
                            <p key={index}>
                              • {prevWeight} - {currentWeight} kg: 体积重 = (长×宽×高) / {range.divisor || '?'}
                            </p>
                          );
                        })}
                        <p className="mt-2 pt-2 border-t">最终计费重 = max(实重, 体积重)</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4 mt-4">
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

              {/* 周长和围长计算 */}
              {(watch('max_length') || watch('max_width') || watch('max_height')) && (
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <h4 className="font-medium text-sm mb-3">自动计算</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">周长 (长+宽)×2</Label>
                      <div className="mt-1 text-lg font-mono">
                        {(() => {
                          const length = Number(watch('max_length')) || 0;
                          const width = Number(watch('max_width')) || 0;
                          if (length || width) {
                            return ((length + width) * 2).toFixed(1) + ' cm';
                          }
                          return '-';
                        })()}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">围长 长+2×(宽+高)</Label>
                      <div className="mt-1 text-lg font-mono">
                        {(() => {
                          const length = Number(watch('max_length')) || 0;
                          const width = Number(watch('max_width')) || 0;
                          const height = Number(watch('max_height')) || 0;
                          if (length || width || height) {
                            return (length + 2 * (width + height)).toFixed(1) + ' cm';
                          }
                          return '-';
                        })()}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    根据输入的长、宽、高自动计算
                  </p>
                </div>
              )}

              <Separator />

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
                  rows={4}
                />
              </div>
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit">{isEditMode ? '保存更改' : '创建渠道'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
