import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Package, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { ChannelLimitDialog } from '@/components/channels/ChannelLimitDialog';
import { WeightCalculator } from '@/components/channels/WeightCalculator';

interface ShippingChannel {
  id: number;
  channel_code: string;
  name: string;
  vendor_id: number;
  service_type: string;
  region: string;
  currency: string;
  volume_weight_divisor: number;
  max_length: number | null;
  max_width: number | null;
  max_height: number | null;
  max_weight: number | null;
  max_single_side: number | null;
  dimension_limit_notes: string | null;
  conditional_rules: any | null;
}

const ChannelManagement = () => {
  const [editingChannel, setEditingChannel] = useState<ShippingChannel | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [testingChannel, setTestingChannel] = useState<ShippingChannel | null>(null);
  const queryClient = useQueryClient();

  const { data: channels, isLoading } = useQuery({
    queryKey: ['shipping-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_channels')
        .select('*')
        .order('channel_code');
      
      if (error) throw error;
      return data as ShippingChannel[];
    },
  });

  const updateChannelMutation = useMutation({
    mutationFn: async (channel: Partial<ShippingChannel> & { id: number }) => {
      const { error } = await supabase
        .from('shipping_channels')
        .update(channel)
        .eq('id', channel.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-channels'] });
      toast.success('渠道限制已更新');
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error('更新失败: ' + error.message);
    },
  });

  const handleEdit = (channel: ShippingChannel) => {
    setEditingChannel(channel);
    setIsDialogOpen(true);
  };

  const handleSave = (data: Partial<ShippingChannel>) => {
    if (editingChannel) {
      updateChannelMutation.mutate({ ...data, id: editingChannel.id });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Package className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">渠道管理</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>物流渠道泡比与尺寸限制</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>渠道代码</TableHead>
                <TableHead>渠道名称</TableHead>
                <TableHead>服务类型</TableHead>
                <TableHead>泡比规则</TableHead>
                <TableHead>尺寸限制（长×宽×高 cm）</TableHead>
                <TableHead>最大重量</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : channels?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    暂无渠道数据
                  </TableCell>
                </TableRow>
              ) : (
                channels?.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell>
                      <Badge variant="outline">{channel.channel_code}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{channel.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{channel.service_type || '-'}</Badge>
                    </TableCell>
                    <TableCell>
                      {channel.conditional_rules ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono">条件规则</Badge>
                          <span className="text-xs text-muted-foreground">
                            /{channel.conditional_rules.rules?.[0]?.condition?.base_divisor || 6000}
                            {' → '}
                            /{channel.conditional_rules.rules?.[0]?.actions?.if_exceeds?.divisor || 8000}
                          </span>
                        </div>
                      ) : channel.volume_weight_divisor ? (
                        <span className="font-mono">/{channel.volume_weight_divisor}</span>
                      ) : (
                        <span className="text-muted-foreground">未设置</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {channel.max_length || channel.max_width || channel.max_height ? (
                        <span className="font-mono text-sm">
                          {channel.max_length || '-'} × {channel.max_width || '-'} × {channel.max_height || '-'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">未设置</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {channel.max_weight ? (
                        <span className="font-mono">{channel.max_weight} kg</span>
                      ) : (
                        <span className="text-muted-foreground">未设置</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTestingChannel(channel)}
                        >
                          <Calculator className="h-4 w-4 mr-1" />
                          测试
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(channel)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          编辑
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editingChannel && (
        <ChannelLimitDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          channel={editingChannel}
          onSave={handleSave}
        />
      )}

      {testingChannel && (
        <div className="mt-6">
          <WeightCalculator
            channelId={testingChannel.id}
            channelCode={testingChannel.channel_code}
            conditionalRules={testingChannel.conditional_rules}
            volumeWeightDivisor={testingChannel.volume_weight_divisor}
          />
          <Button
            variant="outline"
            onClick={() => setTestingChannel(null)}
            className="mt-4"
          >
            关闭测试
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChannelManagement;
