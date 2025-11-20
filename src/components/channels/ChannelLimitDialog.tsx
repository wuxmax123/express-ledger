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
  };
  onSave: (data: any) => void;
}

export function ChannelLimitDialog({
  open,
  onOpenChange,
  channel,
  onSave,
}: ChannelLimitDialogProps) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      volume_weight_divisor: channel.volume_weight_divisor || 5000,
      max_length: channel.max_length || '',
      max_width: channel.max_width || '',
      max_height: channel.max_height || '',
      max_weight: channel.max_weight || '',
      max_single_side: channel.max_single_side || '',
      dimension_limit_notes: channel.dimension_limit_notes || '',
    },
  });

  const onSubmit = (data: any) => {
    // Convert empty strings to null
    const cleanedData = {
      volume_weight_divisor: Number(data.volume_weight_divisor),
      max_length: data.max_length ? Number(data.max_length) : null,
      max_width: data.max_width ? Number(data.max_width) : null,
      max_height: data.max_height ? Number(data.max_height) : null,
      max_weight: data.max_weight ? Number(data.max_weight) : null,
      max_single_side: data.max_single_side ? Number(data.max_single_side) : null,
      dimension_limit_notes: data.dimension_limit_notes || null,
    };
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
          <div className="space-y-4">
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
          </div>

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
