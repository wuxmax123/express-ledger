import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Table, Select, Input, Button, Radio, Tag, Alert } from 'antd';
import { DownloadOutlined, SwapOutlined, TrophyOutlined } from '@ant-design/icons';
import { api } from '@/services/api';
import type { RateCompareResult, Vendor, ShippingChannel } from '@/types';
import * as XLSX from 'xlsx';

const { Option } = Select;

export default function RateCompare() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<RateCompareResult[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [channels, setChannels] = useState<ShippingChannel[]>([]);
  const [allChannels, setAllChannels] = useState<ShippingChannel[]>([]);

  const [filters, setFilters] = useState({
    vendorIds: [] as number[],
    channelIds: [] as number[],
    country: '',
    targetWeight: undefined as number | undefined,
    sortBy: 'PRICE' as 'PRICE' | 'ETA',
  });

  const [comparedBracket, setComparedBracket] = useState<string>('');

  useEffect(() => {
    loadVendors();
    loadAllChannels();
  }, []);

  useEffect(() => {
    if (filters.vendorIds.length > 0) {
      const filteredChannels = allChannels.filter(c => filters.vendorIds.includes(c.vendorId));
      setChannels(filteredChannels);
    } else {
      setChannels([]);
    }
  }, [filters.vendorIds, allChannels]);

  const loadVendors = async () => {
    const vendors = await api.getVendors();
    setVendors(vendors);
  };

  const loadAllChannels = async () => {
    const channels = await api.getChannels();
    setAllChannels(channels);
  };

  const handleCompare = async () => {
    if (!filters.country) {
      return;
    }

    setLoading(true);
    try {
      const result = await api.getRateCompare({
        vendorIds: filters.vendorIds.length > 0 ? filters.vendorIds : undefined,
        channelIds: filters.channelIds.length > 0 ? filters.channelIds : undefined,
        country: filters.country,
        targetWeight: filters.targetWeight,
        sortBy: filters.sortBy,
      });
      setData(result);
      
      // Extract matched bracket from first result
      if (result.length > 0) {
        setComparedBracket(result[0].matchedBracket);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = data.map(item => ({
      [t('rateCompare.vendor')]: item.vendorName,
      [t('rateCompare.channel')]: `${item.channelName} (${item.channelCode})`,
      [t('rateCompare.country')]: item.country,
      [t('rateCompare.bracket')]: item.matchedBracket,
      [t('rateCompare.minWeight')]: item.minChargeableWeight || '-',
      [t('rateCompare.price')]: `${item.price} ${item.currency}`,
      [t('rateCompare.registerFee')]: item.registerFee ? `${item.registerFee} ${item.currency}` : '-',
      [t('rateCompare.totalPrice')]: `${item.totalPrice} ${item.currency}`,
      [t('rateCompare.eta')]: item.eta || '-',
      [t('rateCompare.best')]: item.isBest ? t('rateCompare.yes') : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rate Compare');
    XLSX.writeFile(wb, `rate_compare_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const columns = [
    {
      title: t('rateCompare.vendor'),
      dataIndex: 'vendorName',
      key: 'vendorName',
      width: 120,
    },
    {
      title: t('rateCompare.channel'),
      key: 'channel',
      width: 180,
      render: (_: any, record: RateCompareResult) => (
        <div>
          <div className="font-medium">{record.channelName}</div>
          <div className="text-xs text-muted-foreground">{record.channelCode}</div>
        </div>
      ),
    },
    {
      title: t('rateCompare.country'),
      dataIndex: 'country',
      key: 'country',
      width: 80,
    },
    {
      title: t('rateCompare.bracket'),
      dataIndex: 'matchedBracket',
      key: 'matchedBracket',
      width: 120,
    },
    {
      title: t('rateCompare.minWeight'),
      dataIndex: 'minChargeableWeight',
      key: 'minChargeableWeight',
      width: 100,
      render: (text: number) => text ? `${text} kg` : '-',
    },
    {
      title: t('rateCompare.price'),
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (text: number, record: RateCompareResult) => `${text} ${record.currency}`,
    },
    {
      title: t('rateCompare.registerFee'),
      dataIndex: 'registerFee',
      key: 'registerFee',
      width: 100,
      render: (text: number, record: RateCompareResult) => text ? `${text} ${record.currency}` : '-',
    },
    {
      title: t('rateCompare.totalPrice'),
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      width: 120,
      render: (text: number, record: RateCompareResult) => (
        <span className={record.isBest && filters.sortBy === 'PRICE' ? 'font-bold text-primary' : ''}>
          {text} {record.currency}
        </span>
      ),
    },
    {
      title: t('rateCompare.eta'),
      dataIndex: 'eta',
      key: 'eta',
      width: 120,
      render: (text: string, record: RateCompareResult) => (
        <span className={record.isBest && filters.sortBy === 'ETA' ? 'font-bold text-primary' : ''}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: t('rateCompare.status'),
      key: 'status',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: RateCompareResult) => (
        record.isBest ? (
          <Tag icon={<TrophyOutlined />} color="gold">
            {filters.sortBy === 'PRICE' ? t('rateCompare.lowestPrice') : t('rateCompare.fastest')}
          </Tag>
        ) : null
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t('rateCompare.title')}</h2>
            <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={data.length === 0}>
              {t('rateCompare.export')}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('rateCompare.selectVendors')}</label>
              <Select
                mode="multiple"
                placeholder={t('rateCompare.selectVendorsPlaceholder')}
                value={filters.vendorIds}
                onChange={(value) => setFilters({ ...filters, vendorIds: value, channelIds: [] })}
                className="w-full"
              >
                {vendors.map(v => (
                  <Option key={v.id} value={v.id}>{v.name}</Option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('rateCompare.selectChannels')}</label>
              <Select
                mode="multiple"
                placeholder={t('rateCompare.selectChannelsPlaceholder')}
                value={filters.channelIds}
                onChange={(value) => setFilters({ ...filters, channelIds: value })}
                disabled={channels.length === 0}
                className="w-full"
              >
                {channels.map(c => (
                  <Option key={c.id} value={c.id}>{c.name}</Option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('rateCompare.country')} *</label>
              <Input
                placeholder={t('rateCompare.countryPlaceholder')}
                value={filters.country}
                onChange={(e) => setFilters({ ...filters, country: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('rateCompare.targetWeight')}</label>
              <Input
                type="number"
                placeholder={t('rateCompare.targetWeightPlaceholder')}
                value={filters.targetWeight}
                onChange={(e) => setFilters({ ...filters, targetWeight: e.target.value ? Number(e.target.value) : undefined })}
                addonAfter="kg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('rateCompare.compareBy')}</label>
              <Radio.Group
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                className="w-full"
              >
                <Radio.Button value="PRICE">{t('rateCompare.lowestPrice')}</Radio.Button>
                <Radio.Button value="ETA">{t('rateCompare.fastestETA')}</Radio.Button>
              </Radio.Group>
            </div>
          </div>

          <Button type="primary" icon={<SwapOutlined />} onClick={handleCompare} disabled={!filters.country}>
            {t('rateCompare.compare')}
          </Button>

          {comparedBracket && (
            <Alert
              message={t('rateCompare.matchedBracket', { bracket: comparedBracket })}
              type="info"
              showIcon
            />
          )}
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="channelId"
          loading={loading}
          pagination={false}
          scroll={{ x: 1400 }}
        />
      </Card>
    </div>
  );
}
