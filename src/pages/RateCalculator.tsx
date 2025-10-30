import { useState } from 'react';
import { Card, Input, Select, Button, Tag, Badge } from 'antd';
import { SearchOutlined, CheckCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface RateOption {
  id: string;
  vendorName: string;
  channelName: string;
  channelCode: string;
  tags: string[];
  deliveryDays: string;
  price: number;
  currency: string;
  weightLimit: string;
  volumeLimit: string;
  priceNote: string;
  isRecommended?: boolean;
  canBattery?: boolean;
}

const mockRateData: RateOption[] = [
  {
    id: '1',
    vendorName: '联邮',
    channelName: '速标准挂号-普货',
    channelCode: 'QC',
    tags: ['全额赔', '不可带电'],
    deliveryDays: '7-12',
    price: 67.60,
    currency: '元',
    weightLimit: '0-30kg',
    volumeLimit: '最长边预测: 55CM 最小尺寸预测: 10*15CM 三边长度预测: 55cm*4...',
    priceNote: '参考时效(工作日)',
    isRecommended: true,
    canBattery: false
  },
  {
    id: '2',
    vendorName: '4PX',
    channelName: '国际快递特快速递',
    channelCode: 'A1',
    tags: ['全额赔'],
    deliveryDays: '3-7',
    price: 234.43,
    currency: '元',
    weightLimit: '0-30kg',
    volumeLimit: '最长边预测: 55CM',
    priceNote: '参考时效(工作日)',
    isRecommended: true,
    canBattery: false
  },
  {
    id: '3',
    vendorName: '联邮',
    channelName: '速标准挂号-普货',
    channelCode: 'QC',
    tags: ['全额赔', '不可带电'],
    deliveryDays: '7-12',
    price: 67.60,
    currency: '元',
    weightLimit: '0-30kg',
    volumeLimit: '最长边预测: 55CM 最小尺寸预测: 10*15CM 三边长度预测: 55cm*4...',
    priceNote: '参考时效(工作日)',
    canBattery: false
  },
  {
    id: '4',
    vendorName: '联邮',
    channelName: '速经济挂号-带电',
    channelCode: 'JW',
    tags: ['全额赔', '带电'],
    deliveryDays: '9-14',
    price: 69.40,
    currency: '元',
    weightLimit: '0.001-30kg',
    volumeLimit: '最长边预测: 55CM*40CM*35CM 最小尺寸预测: 10CM*15CM',
    priceNote: '参考时效(工作日)',
    canBattery: true
  },
  {
    id: '5',
    vendorName: '联邮',
    channelName: '速标准挂号-带电',
    channelCode: 'OH',
    tags: ['全额赔', '带电'],
    deliveryDays: '7-12',
    price: 79.00,
    currency: '元',
    weightLimit: '0.001-30kg',
    volumeLimit: '最长边预测: 55CM 最小尺寸预测: 10*15CM 三边长度预测: 55cm*4...',
    priceNote: '参考时效(工作日)',
    canBattery: true
  },
  {
    id: '6',
    vendorName: 'C邮',
    channelName: '政府清/小包-普货',
    channelCode: 'SS325',
    tags: ['全额赔'],
    deliveryDays: '9-14',
    price: 81.20,
    currency: '元',
    weightLimit: '0.001-5kg',
    volumeLimit: '单边>38cm（超出部分）（？）0.453kg以上...',
    priceNote: '参考时效(工作日)',
    canBattery: false
  }
];

const RateCalculator = () => {
  const { t } = useTranslation();
  const [origin, setOrigin] = useState('深圳');
  const [destination, setDestination] = useState('US');
  const [weight, setWeight] = useState('0.6');
  const [postalCode, setPostalCode] = useState('');
  const [cargoType, setCargoType] = useState('');
  const [serviceType, setServiceType] = useState('');

  const handleSearch = () => {
    console.log('Searching rates...');
  };

  const recommendedRates = mockRateData.filter(r => r.isRecommended);
  const allRates = mockRateData;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">直发费用试算</h1>

      {/* Search Form */}
      <Card className="bg-background">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
          <div>
            <label className="text-sm text-foreground mb-1 block">
              <span className="text-red-500">*</span>发货地
            </label>
            <Input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="深圳"
            />
          </div>
          
          <div>
            <label className="text-sm text-foreground mb-1 block">
              <span className="text-red-500">*</span>目的地
            </label>
            <Select
              value={destination}
              onChange={setDestination}
              className="w-full"
              options={[
                { value: 'US', label: '美国(US)' },
                { value: 'UK', label: '英国(UK)' },
                { value: 'CA', label: '加拿大(CA)' },
                { value: 'AU', label: '澳大利亚(AU)' }
              ]}
            />
          </div>

          <div>
            <label className="text-sm text-foreground mb-1 block">
              <span className="text-red-500">*</span>重量
            </label>
            <Input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              suffix="KG"
              type="number"
              step="0.1"
            />
          </div>

          <div>
            <label className="text-sm text-foreground mb-1 block">邮编</label>
            <Input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="请输入"
            />
          </div>

          <div>
            <label className="text-sm text-foreground mb-1 block">货物属性</label>
            <Input
              value={cargoType}
              onChange={(e) => setCargoType(e.target.value)}
              placeholder="--*cm²/-/包裹/-/-"
            />
          </div>

          <div>
            <label className="text-sm text-foreground mb-1 block">服务类型</label>
            <Input
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              placeholder="请选择"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            最近查询: 深圳-美国(US), 00.6kg, 包裹 -
          </div>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            size="large"
            onClick={handleSearch}
          >
            查询产品
          </Button>
        </div>
      </Card>

      {/* Recommended Products */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 border-l-4 border-primary pl-3">
          推荐产品
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendedRates.map((rate) => (
            <Card key={rate.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
              <Badge.Ribbon text="推荐最佳" color="red" className="text-xs">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {rate.vendorName}{rate.channelName}({rate.channelCode})
                    </h3>
                    <div className="flex gap-2 mt-2">
                      {rate.tags.map((tag, idx) => (
                        <Tag key={idx} color={tag === '全额赔' ? 'blue' : 'default'} className="text-xs">
                          {tag}
                        </Tag>
                      ))}
                      <Tag icon={<CheckCircleOutlined />} color="blue" className="text-xs">标准</Tag>
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-bold text-primary">{rate.price}</div>
                      <div className="text-xs text-muted-foreground">{rate.priceNote}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-semibold text-foreground">
                        {rate.deliveryDays} <span className="text-sm font-normal">天</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{rate.priceNote}</div>
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs">
                    <button className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                      <span>📊</span> 价格走势
                    </button>
                    <button className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                      <span>📦</span> 产品介绍
                    </button>
                  </div>

                  <Button type="primary" block size="large">
                    立即下单
                  </Button>
                </div>
              </Badge.Ribbon>
              
              <div className="absolute top-2 right-2">
                <Button
                  type="text"
                  shape="circle"
                  size="small"
                  className="text-primary"
                  icon={<span className="text-lg">⚖️</span>}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* All Products */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground border-l-4 border-primary pl-3">
            全部产品
          </h2>
          <span className="text-sm text-muted-foreground">
            试算结果仅作参考，实际计费以实际为准
          </span>
        </div>

        <div className="space-y-3">
          {allRates.map((rate) => (
            <Card key={rate.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                {/* Left: Channel Info */}
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-base font-semibold text-foreground truncate">
                      {rate.vendorName}{rate.channelName}({rate.channelCode})
                    </h3>
                    <div className="flex gap-1 flex-shrink-0">
                      {rate.tags.map((tag, idx) => (
                        <Tag key={idx} color={tag === '全额赔' ? 'blue' : tag === '带电' ? 'green' : 'default'} className="text-xs m-0">
                          {tag}
                        </Tag>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Center: Time & Price */}
                <div className="flex items-center gap-8 px-6 border-x border-border">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-foreground">
                      {rate.deliveryDays} <span className="text-sm font-normal">天</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{rate.priceNote}</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {rate.price} <span className="text-sm font-normal">{rate.currency}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">预估费用总费</div>
                  </div>
                </div>

                {/* Right: Limits & Actions */}
                <div className="flex-1 min-w-0 px-4">
                  <div className="text-xs text-muted-foreground mb-2 truncate">
                    【重量限制】{rate.weightLimit}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    【材积限制】{rate.volumeLimit}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 pl-4">
                  <button className="text-xs text-primary hover:underline">
                    📊 价格走势
                  </button>
                  <button className="text-xs text-primary hover:underline">
                    📦 产品介绍
                  </button>
                  <Button type="primary" size="large">
                    立即下单
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RateCalculator;
