import { Card, Select, Descriptions, Table, Tag, Button, Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { VendorBatch, ChannelRateSheet } from '@/types';

const RateHistory = () => {
  const { t } = useTranslation();
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [selectedChannelIds, setSelectedChannelIds] = useState<number[]>(
    channelId ? [Number(channelId)] : []
  );
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  // Update selected channels when URL param changes
  useEffect(() => {
    if (channelId) {
      setSelectedChannelIds([Number(channelId)]);
    }
  }, [channelId]);

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => api.getVendors()
  });

  const { data: channels } = useQuery({
    queryKey: ['channels', selectedVendorId],
    queryFn: () => api.getChannels(selectedVendorId || undefined),
    enabled: !!selectedVendorId
  });

  // Fetch vendor batches when vendor selected and no channels selected
  const { data: vendorBatches } = useQuery({
    queryKey: ['vendor-batches', selectedVendorId],
    queryFn: () => api.getVendorBatches(selectedVendorId!),
    enabled: !!selectedVendorId && selectedChannelIds.length === 0
  });

  // Fetch batch channels for modal
  const { data: batchChannels } = useQuery({
    queryKey: ['batch-channels', selectedBatchId],
    queryFn: () => api.getBatchChannels(selectedBatchId!),
    enabled: !!selectedBatchId
  });

  // Fetch versions for selected channels
  const { data: channelVersionsData } = useQuery({
    queryKey: ['channel-versions', selectedChannelIds],
    queryFn: async () => {
      if (selectedChannelIds.length === 0) return {};
      
      const results = await Promise.all(
        selectedChannelIds.map(async (id) => {
          try {
            const versions = await api.getChannelVersions(id);
            return { id, versions };
          } catch (error) {
            console.error(`Failed to fetch versions for channel ${id}:`, error);
            return { id, versions: [] };
          }
        })
      );
      
      return results.reduce((acc, { id, versions }) => {
        acc[id] = versions;
        return acc;
      }, {} as Record<number, ChannelRateSheet[]>);
    },
    enabled: selectedChannelIds.length > 0
  });

  const handleVendorChange = (vendorId: number) => {
    setSelectedVendorId(vendorId);
    setSelectedChannelIds([]);
    navigate('/rates/history');
  };

  const handleChannelChange = (ids: number[]) => {
    setSelectedChannelIds(ids);
    if (ids.length === 1) {
      navigate(`/rates/history/${ids[0]}`);
    } else if (ids.length > 1) {
      navigate(`/rates/history/${ids[0]}`);
    } else {
      navigate('/rates/history');
    }
  };

  const handleViewBatchChannels = (batchId: number) => {
    setSelectedBatchId(batchId);
    setBatchModalVisible(true);
  };

  // Batch table columns
  const batchColumns = [
    {
      title: '上传时间 / Upload Time',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '文件名 / File Name',
      dataIndex: 'fileName',
      key: 'fileName',
      render: (text: string) => <span className="font-medium text-foreground">{text}</span>
    },
    {
      title: '生效日期 / Effective Date',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      render: (date?: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: '渠道数 / Total Channels',
      dataIndex: 'totalChannels',
      key: 'totalChannels',
      render: (count: number) => <Tag color="blue">{count}</Tag>
    },
    {
      title: '上传者 / Uploaded By',
      dataIndex: 'uploadedBy',
      key: 'uploadedBy'
    },
    {
      title: '备注 / Notes',
      dataIndex: 'notes',
      key: 'notes',
      render: (text?: string) => <span className="text-muted-foreground">{text || '-'}</span>
    },
    {
      title: '操作 / Action',
      key: 'action',
      render: (_: any, record: VendorBatch) => (
        <Button 
          type="link" 
          size="small"
          onClick={() => handleViewBatchChannels(record.id)}
        >
          查看渠道 / View Channels
        </Button>
      )
    }
  ];

  // Channel version table columns
  const versionColumns = [
    {
      title: '渠道 / Channel',
      dataIndex: 'channelId',
      key: 'channelId',
      render: (channelId: number) => {
        const channel = channels?.find(c => c.id === channelId);
        return <span className="font-medium text-foreground">{channel?.name || `Channel ${channelId}`}</span>;
      }
    },
    {
      title: '批次文件 / Batch File',
      dataIndex: 'fileName',
      key: 'fileName'
    },
    {
      title: '上传时间 / Upload Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '生效日期 / Effective Date',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '版本号 / Version Code',
      dataIndex: 'versionCode',
      key: 'versionCode',
      render: (code: string) => <Tag color="green">{code}</Tag>
    },
    {
      title: '状态 / Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status}
        </Tag>
      )
    }
  ];

  // Modal batch channel columns
  const modalChannelColumns = [
    {
      title: '渠道 / Channel',
      dataIndex: 'channelId',
      key: 'channelId',
      render: (channelId: number) => {
        const channel = channels?.find(c => c.id === channelId);
        return channel?.name || `Channel ${channelId}`;
      }
    },
    {
      title: '版本号 / Version Code',
      dataIndex: 'versionCode',
      key: 'versionCode',
      render: (code: string) => <Tag color="green">{code}</Tag>
    },
    {
      title: '生效日期 / Effective Date',
      dataIndex: 'effectiveDate',
      key: 'effectiveDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '状态 / Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>
          {status}
        </Tag>
      )
    }
  ];

  // Flatten all versions for channel view
  const allChannelVersions = selectedChannelIds.length > 0 && channelVersionsData
    ? selectedChannelIds.flatMap(id => channelVersionsData[id] || [])
    : [];

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-foreground">{t('history.title')}</h1>

      <Card className="mb-6">
        <div className="space-y-4">
          <div>
            <label className="block mb-2 font-medium text-foreground">
              供应商 / Vendor
            </label>
            <Select
              className="w-full"
              placeholder="选择供应商 / Select Vendor"
              value={selectedVendorId}
              onChange={handleVendorChange}
              options={vendors?.map(v => ({ label: v.name, value: v.id }))}
            />
          </div>

          {selectedVendorId && (
            <div>
              <label className="block mb-2 font-medium text-foreground">
                渠道 / Channels (可选多个 / Optional Multi-select)
              </label>
              <Select
                mode="multiple"
                className="w-full"
                placeholder="选择渠道（不选则显示批次视图）/ Select Channels (leave empty for batch view)"
                value={selectedChannelIds}
                onChange={handleChannelChange}
                options={channels?.map(c => ({ label: c.name, value: c.id }))}
                maxTagCount="responsive"
                allowClear
              />
            </div>
          )}
        </div>
      </Card>

      {!selectedVendorId && (
        <Card>
          <div className="text-center py-8 text-muted-foreground">
            请先选择供应商 / Please select a vendor first
          </div>
        </Card>
      )}

      {selectedVendorId && selectedChannelIds.length === 0 && (
        <Card>
          <div className="mb-4 font-medium text-lg text-foreground">
            批次上传历史 / Batch Upload History
          </div>
          <Table
            columns={batchColumns}
            dataSource={vendorBatches?.map(b => ({ ...b, key: b.id }))}
            pagination={{ pageSize: 10 }}
            loading={!vendorBatches}
          />
        </Card>
      )}

      {selectedVendorId && selectedChannelIds.length > 0 && (
        <Card>
          <div className="mb-4 font-medium text-lg text-foreground">
            渠道版本历史 / Channel Version History
          </div>
          <Table
            columns={versionColumns}
            dataSource={allChannelVersions.map((v, i) => ({ ...v, key: `${v.id}-${i}` }))}
            pagination={{ pageSize: 10 }}
            loading={!channelVersionsData}
          />
        </Card>
      )}

      <Modal
        title="批次包含的渠道 / Channels in Batch"
        open={batchModalVisible}
        onCancel={() => {
          setBatchModalVisible(false);
          setSelectedBatchId(null);
        }}
        footer={null}
        width={800}
      >
        <Table
          columns={modalChannelColumns}
          dataSource={batchChannels?.map(c => ({ ...c, key: c.id }))}
          pagination={false}
          loading={!batchChannels}
        />
      </Modal>
    </div>
  );
};

export default RateHistory;
