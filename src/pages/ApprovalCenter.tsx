import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, Tag, Modal } from 'antd';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Eye } from 'lucide-react';

interface VendorBatch {
  id: number;
  vendor_id: number;
  batch_code: string;
  file_name: string;
  uploaded_at: string;
  effective_date: string;
  total_channels: number;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  vendors: {
    name: string;
    code: string;
  };
}

interface RateDiffItem {
  id: number;
  country: string;
  zone: string;
  weight_from: number;
  weight_to: number;
  old_price: number;
  new_price: number;
  delta: number;
  delta_pct: number;
  channel_name: string;
}

const ApprovalCenter = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedBatch, setSelectedBatch] = useState<VendorBatch | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [diffModalVisible, setDiffModalVisible] = useState(false);
  const [diffBatch, setDiffBatch] = useState<VendorBatch | null>(null);

  const { data: batches, isLoading } = useQuery({
    queryKey: ['pending-batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendor_batches')
        .select('*, vendors(name, code)')
        .eq('approval_status', 'pending')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data as VendorBatch[];
    },
  });

  // Fetch rate differences for a batch
  const { data: rateDiffs, isLoading: isDiffsLoading } = useQuery({
    queryKey: ['batch-rate-diffs', diffBatch?.id],
    queryFn: async () => {
      if (!diffBatch?.id) return [];
      
      // Get sheets for this batch
      const { data: sheets, error: sheetsError } = await supabase
        .from('channel_rate_sheets')
        .select('id, channel_id, shipping_channels(name)')
        .eq('batch_id', diffBatch.id);

      if (sheetsError) throw sheetsError;
      if (!sheets || sheets.length === 0) return [];

      // Get rate items for these sheets
      const sheetIds = sheets.map(s => s.id);
      const { data: newItems, error: itemsError } = await supabase
        .from('channel_rate_items')
        .select('*')
        .in('sheet_id', sheetIds);

      if (itemsError) throw itemsError;

      // For demo, create mock diffs (in real scenario, compare with previous version)
      const diffs: RateDiffItem[] = (newItems || []).slice(0, 20).map((item, idx) => {
        const oldPrice = item.price * (0.9 + Math.random() * 0.2);
        const delta = item.price - oldPrice;
        const deltaPct = (delta / oldPrice) * 100;
        const sheet = sheets.find(s => s.id === item.sheet_id);
        
        return {
          id: item.id,
          country: item.country,
          zone: item.zone || '-',
          weight_from: item.weight_from,
          weight_to: item.weight_to,
          old_price: oldPrice,
          new_price: item.price,
          delta,
          delta_pct: deltaPct,
          channel_name: (sheet?.shipping_channels as any)?.name || '-'
        };
      });

      return diffs;
    },
    enabled: !!diffBatch?.id,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ batchId, action, rejectionReason }: { 
      batchId: number; 
      action: 'approve' | 'reject';
      rejectionReason?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('approve-batch', {
        body: { batchId, action, rejectionReason },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-batches'] });
      toast.success(
        variables.action === 'approve' ? '批次已批准' : '批次已拒绝'
      );
      setRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedBatch(null);
    },
    onError: (error: any) => {
      toast.error('操作失败', { description: error.message });
    },
  });

  const handleApprove = (batch: VendorBatch) => {
    approveMutation.mutate({ batchId: batch.id, action: 'approve' });
  };

  const handleRejectClick = (batch: VendorBatch) => {
    setSelectedBatch(batch);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedBatch) {
      approveMutation.mutate({
        batchId: selectedBatch.id,
        action: 'reject',
        rejectionReason,
      });
    }
  };

  const handleViewDiff = (batch: VendorBatch) => {
    setDiffBatch(batch);
    setDiffModalVisible(true);
  };

  const diffColumns = [
    {
      title: '渠道',
      dataIndex: 'channel_name',
      key: 'channel_name',
      width: 120,
    },
    {
      title: '国家',
      dataIndex: 'country',
      key: 'country',
      width: 80,
    },
    {
      title: '分区',
      dataIndex: 'zone',
      key: 'zone',
      width: 80,
    },
    {
      title: '重量区间',
      key: 'weight_range',
      width: 120,
      render: (_: any, record: RateDiffItem) => 
        `${record.weight_from} - ${record.weight_to} kg`
    },
    {
      title: '原价格',
      dataIndex: 'old_price',
      key: 'old_price',
      width: 100,
      render: (price: number) => `¥${price.toFixed(2)}`
    },
    {
      title: '新价格',
      dataIndex: 'new_price',
      key: 'new_price',
      width: 100,
      render: (price: number) => `¥${price.toFixed(2)}`
    },
    {
      title: '差额',
      dataIndex: 'delta',
      key: 'delta',
      width: 100,
      render: (delta: number) => (
        <span className={delta > 0 ? 'text-red-600' : 'text-green-600'}>
          {delta > 0 ? '+' : ''}{delta.toFixed(2)}
        </span>
      )
    },
    {
      title: '变化幅度',
      dataIndex: 'delta_pct',
      key: 'delta_pct',
      width: 100,
      render: (pct: number) => (
        <Tag color={pct > 0 ? 'red' : 'green'}>
          {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
        </Tag>
      )
    },
  ];

  const columns = [
    {
      title: '批次号',
      dataIndex: 'batch_code',
      key: 'batch_code',
      render: (code: string) => (
        <span className="font-mono text-sm">{code || '-'}</span>
      ),
    },
    {
      title: '物流商',
      dataIndex: ['vendors', 'name'],
      key: 'vendor',
      render: (name: string, record: VendorBatch) => (
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-sm text-muted-foreground">{record.vendors.code}</div>
        </div>
      ),
    },
    {
      title: '文件名',
      dataIndex: 'file_name',
      key: 'file_name',
    },
    {
      title: '上传时间',
      dataIndex: 'uploaded_at',
      key: 'uploaded_at',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '生效日期',
      dataIndex: 'effective_date',
      key: 'effective_date',
      render: (date: string) => date || '-',
    },
    {
      title: '渠道数量',
      dataIndex: 'total_channels',
      key: 'total_channels',
    },
    {
      title: '状态',
      dataIndex: 'approval_status',
      key: 'status',
      render: (status: string) => {
        const textMap = {
          pending: '待审核',
          approved: '已批准',
          rejected: '已拒绝',
        };
        return (
          <Badge variant={status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : 'outline'}>
            {textMap[status as keyof typeof textMap]}
          </Badge>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: VendorBatch) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleViewDiff(record)}
            title="查看差异"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => handleApprove(record)}
            disabled={approveMutation.isPending}
          >
            批准
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleRejectClick(record)}
            disabled={approveMutation.isPending}
          >
            拒绝
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">审核中心</h1>
      <Card className="p-6">
        <Table
          columns={columns}
          dataSource={batches?.map((b) => ({ ...b, key: b.id }))}
          loading={isLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝批次</DialogTitle>
            <DialogDescription>
              请输入拒绝原因，此信息将反馈给上传者
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">拒绝原因</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="请输入拒绝原因..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim() || approveMutation.isPending}
            >
              确认拒绝
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Modal
        title={`价格差异详情 - ${diffBatch?.batch_code || ''}`}
        open={diffModalVisible}
        onCancel={() => setDiffModalVisible(false)}
        width={1000}
        footer={null}
      >
        <div className="mb-4">
          <span className="text-muted-foreground">
            物流商: {diffBatch?.vendors?.name} | 文件: {diffBatch?.file_name}
          </span>
        </div>
        <Table
          columns={diffColumns}
          dataSource={rateDiffs?.map((d, i) => ({ ...d, key: i }))}
          loading={isDiffsLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
          size="small"
        />
      </Modal>
    </div>
  );
};

export default ApprovalCenter;
