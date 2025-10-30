import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Table, Select, Input, Button, Drawer, Tag } from 'antd';
import { DownloadOutlined, FilterOutlined } from '@ant-design/icons';
import { api } from '@/services/api';
import { useImportStore } from '@/store/useImportStore';
import type { RateBrowseItem, Vendor, ShippingChannel } from '@/types';
import * as XLSX from 'xlsx';

const { Option } = Select;

export default function RateBrowse() {
  const { t } = useTranslation();
  const { parsedSheets, selectedVendorId } = useImportStore();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedRow, setSelectedRow] = useState<RateBrowseItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [filters, setFilters] = useState({
    sheetName: undefined as string | undefined,
    country: undefined as string | undefined,
    zone: undefined as string | undefined,
    weightFrom: undefined as number | undefined,
    weightTo: undefined as number | undefined,
  });

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    const vendors = await api.getVendors();
    setVendors(vendors);
  };

  // Convert parsed sheet data to RateBrowseItem format
  const allData = useMemo(() => {
    const items: RateBrowseItem[] = [];
    let idCounter = 1;

    parsedSheets.forEach((sheet) => {
      if (sheet.rateCardDetails && sheet.rateCardDetails.length > 0) {
        sheet.rateCardDetails.forEach((detail) => {
          // Parse weight range
          let weightFrom = 0;
          let weightTo = 0;
          if (detail.weightRange) {
            const match = detail.weightRange.match(/\[([\d.]+),\s*([\d.]+)\)/);
            if (match) {
              weightFrom = parseFloat(match[1]);
              weightTo = parseFloat(match[2]);
            }
          }

          items.push({
            id: idCounter++,
            sheetId: 1,
            channelId: 1,
            channelName: sheet.sheetName,
            vendorId: selectedVendorId || 1,
            vendorName: vendors.find(v => v.id === selectedVendorId)?.name || 'Unknown',
            versionCode: 'v1.0.0',
            country: detail.country || '-',
            zone: detail.zone || '-',
            eta: detail.eta || '-',
            weightFrom,
            weightTo,
            minChargeableWeight: detail.minChargeableWeight ? parseFloat(detail.minChargeableWeight.toString()) : undefined,
            price: detail.rate ? parseFloat(detail.rate.toString()) : 0,
            currency: 'RMB',
            registerFee: detail.registrationFee ? parseFloat(detail.registrationFee.toString()) : undefined,
          });
        });
      }
    });

    return items;
  }, [parsedSheets, selectedVendorId, vendors]);

  // Apply filters
  const filteredData = useMemo(() => {
    return allData.filter((item) => {
      if (filters.sheetName && item.channelName !== filters.sheetName) return false;
      if (filters.country && !item.country.toLowerCase().includes(filters.country.toLowerCase())) return false;
      if (filters.zone && !item.zone.toLowerCase().includes(filters.zone.toLowerCase())) return false;
      if (filters.weightFrom !== undefined && item.weightTo <= filters.weightFrom) return false;
      if (filters.weightTo !== undefined && item.weightFrom >= filters.weightTo) return false;
      return true;
    });
  }, [allData, filters]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (pagination.current - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, pagination]);

  const handleTableChange = (newPagination: any) => {
    setPagination({ current: newPagination.current, pageSize: newPagination.pageSize });
  };

  const handleFilter = () => {
    setPagination({ current: 1, pageSize: pagination.pageSize });
  };

  const handleReset = () => {
    setFilters({
      sheetName: undefined,
      country: undefined,
      zone: undefined,
      weightFrom: undefined,
      weightTo: undefined,
    });
    setPagination({ current: 1, pageSize: pagination.pageSize });
  };

  const handleExport = () => {
    const exportData = filteredData.map(item => ({
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

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Select
              placeholder={t('rateBrowse.selectSheet')}
              value={filters.sheetName}
              onChange={(value) => setFilters({ ...filters, sheetName: value })}
              allowClear
            >
              {parsedSheets.map((sheet, index) => (
                <Option key={index} value={sheet.sheetName}>{sheet.sheetName}</Option>
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
          dataSource={paginatedData}
          rowKey="id"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: filteredData.length,
            showSizeChanger: true,
            showTotal: (total) => t('rateBrowse.totalItems', { total }),
          }}
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
