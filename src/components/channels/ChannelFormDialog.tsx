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
      // Conditional rules
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">基本信息</TabsTrigger>
              <TabsTrigger value="limits">尺寸限制</TabsTrigger>
              <TabsTrigger value="advanced">条件规则</TabsTrigger>
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
                      <br />• 若 (长×宽×高) / {watch('cond_base_divisor') || 6000} / 实重 &gt;{' '}
                      {watch('cond_ratio_threshold') || 2}
                      <br />  则体积重 = (长×宽×高) / {watch('cond_exceeds_divisor') || 8000}
                      <br />• 若 (长×宽×高) / {watch('cond_base_divisor') || 6000} / 实重 ≤{' '}
                      {watch('cond_ratio_threshold') || 2}
                      <br />  则按实重收费
                      <br />• 最终计费重 = max(实重, 体积重)
                    </p>
                  </div>
                </>
              )}
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
