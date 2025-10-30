import { Modal, Select, Button, Typography, Space, Card, Alert } from 'antd';
import { ParsedSheetData } from '@/types';
import { useState } from 'react';

const { Title, Text } = Typography;

interface ColumnMappingDialogProps {
  open: boolean;
  sheet: ParsedSheetData;
  availableColumns: string[];
  onConfirm: (mapping: { [key: string]: number }) => void;
  onCancel: () => void;
  onSkip?: () => void;
}

const REQUIRED_FIELDS = {
  country: 'Country/Destination',
  weight_range: 'Weight Range',
  price_per_kg: 'Price',
};

const OPTIONAL_FIELDS = {
  zone: 'Zone',
  eta: 'ETA/Delivery Time',
  min_chargeable_weight: 'Min Chargeable Weight',
  register_fee: 'Register Fee',
  currency: 'Currency',
};

export const ColumnMappingDialog = ({
  open,
  sheet,
  availableColumns,
  onConfirm,
  onCancel,
  onSkip,
}: ColumnMappingDialogProps) => {
  const [mapping, setMapping] = useState<{ [key: string]: number }>({});

  const handleFieldChange = (field: string, columnIndex: number) => {
    setMapping((prev) => ({
      ...prev,
      [field]: columnIndex,
    }));
  };

  const handleConfirm = () => {
    onConfirm(mapping);
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onCancel();
    }
  };

  const allRequiredMapped = Object.keys(REQUIRED_FIELDS).every(
    (field) => mapping[field] !== undefined
  );

  return (
    <Modal
      open={open}
      title={`Map Columns for "${sheet.sheetName}"`}
      onCancel={onCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        <Button key="skip" onClick={handleSkip}>
          Skip Mapping
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={handleConfirm}
          disabled={!allRequiredMapped}
        >
          Confirm Mapping
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Alert
          message="Low Confidence Detection"
          description={`Confidence score: ${sheet.confidence}%. Please verify or manually map the columns below.`}
          type="warning"
          showIcon
        />

        <Card size="small" title="Required Fields" bordered={false}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {Object.entries(REQUIRED_FIELDS).map(([field, label]) => (
              <div key={field}>
                <Text strong>{label} *</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder={`Select column for ${label}`}
                  value={mapping[field]}
                  onChange={(value) => handleFieldChange(field, value)}
                  showSearch
                  optionFilterProp="children"
                >
                  {availableColumns.map((col, idx) => (
                    <Select.Option key={idx} value={idx}>
                      {col || `Column ${idx + 1}`}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            ))}
          </Space>
        </Card>

        <Card size="small" title="Optional Fields" bordered={false}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {Object.entries(OPTIONAL_FIELDS).map(([field, label]) => (
              <div key={field}>
                <Text>{label}</Text>
                <Select
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder={`Select column for ${label}`}
                  value={mapping[field]}
                  onChange={(value) => handleFieldChange(field, value)}
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {availableColumns.map((col, idx) => (
                    <Select.Option key={idx} value={idx}>
                      {col || `Column ${idx + 1}`}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            ))}
          </Space>
        </Card>

        {sheet.detectionLog && (
          <Card size="small" title="Detection Details" bordered={false}>
            <Space direction="vertical" size="small">
              <Text type="secondary">
                Reason: {sheet.detectionLog.reason}
              </Text>
              <Text type="secondary">
                Detection Score: {sheet.detectionLog.totalScore}
              </Text>
            </Space>
          </Card>
        )}
      </Space>
    </Modal>
  );
};
