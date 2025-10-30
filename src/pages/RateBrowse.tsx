import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Table, Select, Input, Button, Drawer, Tag } from 'antd';
import { DownloadOutlined, FilterOutlined } from '@ant-design/icons';
import { api } from '@/services/api';
import type { RateBrowseItem, Vendor, ShippingChannel } from '@/types';
import * as XLSX from 'xlsx';

const { Option } = Select;

export default function RateBrowse() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RateBrowseItem[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [channels, setChannels] = useState<ShippingChannel[]>([]);
  const [selectedRow, setSelectedRow] = useState<RateBrowseItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [filters, setFilters] = useState({
    vendorId: undefined as number | undefined,
    channelId: undefined as number | undefined,
    country: undefined as string | undefined,
    zone: undefined as string | undefined,
    weightFrom: undefined as number | undefined,
    weightTo: undefined as number | undefined,
  });

  useEffect(() => {
    loadVendors();
    loadData();
  }, []);

  useEffect(() => {
    if (filters.vendorId) {
      loadChannels(filters.vendorId);
    } else {
      setChannels([]);
    }
  }, [filters.vendorId]);

  const loadVendors = async () => {
    const vendors = await api.getVendors();
    setVendors(vendors);
  };

  const loadChannels = async (vendorId: number) => {
    const channels = await api.getChannels(vendorId);
    setChannels(channels);
  };

  const loadData = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const result = await api.getRateBrowse({
        ...filters,
        page,
        size: pageSize,
      });
      setData(result.content);
      setPagination({ current: page, pageSize, total: result.totalElements });
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (pagination: any) => {
    loadData(pagination.current, pagination.pageSize);
  };

  const handleFilter = () => {
    loadData(1, pagination.pageSize);
  };

  const handleReset = () => {
    setFilters({
      vendorId: undefined,
      channelId: undefined,
      country: undefined,
      zone: undefined,
      weightFrom: undefined,
      weightTo: undefined,
    });
    setTimeout(() => loadData(1, pagination.pageSize), 0);
  };

  const handleExport = () => {
    const exportData = data.map(item => ({
      [t('rateBrowse.vendor')]: item.vendorName,
      [t('rateBrowse.channel')]: item.channelName,
      [t('rateBrowse.version')]: item.versionCode,
      [t('rateBrowse.country')]: item.country,
      [t('rateBrowse.zone')]: item.zone || '-',
      [t('rateBrowse.eta')]: item.eta || '-',
      [t('rateBrowse.weight')]: `[${item.weightFrom}, ${item.weightTo}) kg`,
      [t('rateBrowse.minWeight')]: item.minChargeableWeight || '-',
      [t('rateBrowse.price')]: `${item.price} ${item.currency}`,
      [t('rateBrowse.registerFee')]: item.registerFee ? `${item.registerFee} ${item.currency}` : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rate Browse');
    XLSX.writeFile(wb, `rate_browse_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const columns = [
    {
      title: t('rateBrowse.vendor'),
      dataIndex: 'vendorName',
      key: 'vendorName',
      width: 120,
    },
    {
      title: t('rateBrowse.channel'),
      dataIndex: 'channelName',
      key: 'channelName',
      width: 150,
    },
    {
      title: t('rateBrowse.version'),
      dataIndex: 'versionCode',
      key: 'versionCode',
      width: 100,
    },
    {
      title: t('rateBrowse.country'),
      dataIndex: 'country',
      key: 'country',
      width: 80,
    },
    {
      title: t('rateBrowse.zone'),
      dataIndex: 'zone',
      key: 'zone',
      width: 80,
      render: (text: string) => text || '-',
    },
    {
      title: t('rateBrowse.eta'),
      dataIndex: 'eta',
      key: 'eta',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: t('rateBrowse.weight'),
      key: 'weight',
      width: 120,
      render: (_: any, record: RateBrowseItem) => `[${record.weightFrom}, ${record.weightTo}) kg`,
    },
    {
      title: t('rateBrowse.minWeight'),
      dataIndex: 'minChargeableWeight',
      key: 'minChargeableWeight',
      width: 100,
      render: (text: number) => text ? `${text} kg` : '-',
    },
    {
      title: t('rateBrowse.price'),
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (text: number, record: RateBrowseItem) => `${text} ${record.currency}`,
    },
    {
      title: t('rateBrowse.registerFee'),
      dataIndex: 'registerFee',
      key: 'registerFee',
      width: 100,
      render: (text: number, record: RateBrowseItem) => text ? `${text} ${record.currency}` : '-',
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t('rateBrowse.title')}</h2>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              {t('rateBrowse.export')}
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Select
              placeholder={t('rateBrowse.selectVendor')}
              value={filters.vendorId}
              onChange={(value) => setFilters({ ...filters, vendorId: value, channelId: undefined })}
              allowClear
            >
              {vendors.map(v => (
                <Option key={v.id} value={v.id}>{v.name}</Option>
              ))}
            </Select>

            <Select
              placeholder={t('rateBrowse.selectChannel')}
              value={filters.channelId}
              onChange={(value) => setFilters({ ...filters, channelId: value })}
              disabled={!filters.vendorId}
              allowClear
            >
              {channels.map(c => (
                <Option key={c.id} value={c.id}>{c.name}</Option>
              ))}
            </Select>

            <Input
              placeholder={t('rateBrowse.country')}
              value={filters.country}
              onChange={(e) => setFilters({ ...filters, country: e.target.value })}
            />

            <Input
              placeholder={t('rateBrowse.zone')}
              value={filters.zone}
              onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
            />

            <Input
              type="number"
              placeholder={t('rateBrowse.weightFrom')}
              value={filters.weightFrom}
              onChange={(e) => setFilters({ ...filters, weightFrom: e.target.value ? Number(e.target.value) : undefined })}
            />

            <Input
              type="number"
              placeholder={t('rateBrowse.weightTo')}
              value={filters.weightTo}
              onChange={(e) => setFilters({ ...filters, weightTo: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>

          <div className="flex gap-2">
            <Button type="primary" icon={<FilterOutlined />} onClick={handleFilter}>
              {t('rateBrowse.filter')}
            </Button>
            <Button onClick={handleReset}>{t('rateBrowse.reset')}</Button>
          </div>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={pagination}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          onRow={(record) => ({
            onClick: () => {
              setSelectedRow(record);
              setDrawerOpen(true);
            },
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      <Drawer
        title={t('rateBrowse.details')}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={600}
      >
        {selectedRow && (
          <div className="space-y-4">
            <pre className="bg-muted p-4 rounded-lg overflow-auto">
              {JSON.stringify(selectedRow, null, 2)}
            </pre>
          </div>
        )}
      </Drawer>
    </div>
  );
}
