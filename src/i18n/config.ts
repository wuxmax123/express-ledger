import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Navigation
      'nav.calculator': 'Rate Calculator',
      'nav.import': 'Import',
      'nav.diff': 'Difference Center',
      'nav.history': 'Version History',
      'nav.vendors': 'Vendors',
      'nav.channels': 'Channels',
      
      // Import Wizard
      'import.title': 'Rate Import Wizard',
      'import.step1': 'Upload File',
      'import.step2': 'Parse Preview',
      'import.step3': 'Structure Validation',
      'import.step4': 'Confirm Actions',
      'import.step5': 'Import Progress',
      'import.upload.title': 'Upload Excel File',
      'import.upload.hint': 'Click or drag file to this area to upload',
      'import.upload.desc': 'Support for multi-sheet Excel files (.xlsx, .xls)',
      'import.selectVendor': 'Select Vendor',
      'import.parsing': 'Parsing file...',
      'import.preview.title': 'Sheet Preview',
      'import.preview.rows': 'rows',
      'import.preview.firstVersion': 'First Version',
      'import.preview.update': 'Update',
      'import.preview.allFirstVersions': 'All channels are first versions, will skip validation',
      'import.validation.title': 'Weight Structure Validation',
      'import.validation.none': 'No Changes',
      'import.validation.minor': 'Minor Changes',
      'import.validation.major': 'Major Changes',
      'import.confirm.title': 'Confirm Import Actions',
      'import.confirm.override': 'Override Structure',
      'import.confirm.skip': 'Skip Publish',
      'import.progress.title': 'Import Progress',
      'import.progress.importing': 'Importing...',
      'import.progress.success': 'Import completed successfully',
      
      // Diff Center
      'diff.title': 'Rate Difference Center',
      'diff.filters': 'Filters',
      'diff.vendor': 'Vendor',
      'diff.channel': 'Channel',
      'diff.dateRange': 'Date Range',
      'diff.export': 'Export',
      'diff.country': 'Country',
      'diff.zone': 'Zone',
      'diff.weightRange': 'Weight Range',
      'diff.oldPrice': 'Old Price',
      'diff.newPrice': 'New Price',
      'diff.delta': 'Delta',
      'diff.deltaPct': 'Delta %',
      'diff.effectiveDate': 'Effective Date',
      
      // History
      'history.title': 'Version History',
      'history.currentVersion': 'Current Version',
      'history.selectVersion': 'Select Version',
      'history.versionInfo': 'Version Information',
      'history.effectiveDate': 'Effective Date',
      'history.uploadedBy': 'Uploaded By',
      'history.status': 'Status',
      
      // Common
      'common.search': 'Search',
      'common.reset': 'Reset',
      'common.next': 'Next',
      'common.previous': 'Previous',
      'common.submit': 'Submit',
      'common.cancel': 'Cancel',
      'common.confirm': 'Confirm',
      'common.active': 'Active',
      'common.inactive': 'Inactive',
      'common.loading': 'Loading...',
    }
  },
  zh: {
    translation: {
      // Navigation
      'nav.calculator': '价格计算',
      'nav.import': '导入',
      'nav.diff': '差异中心',
      'nav.history': '版本历史',
      'nav.vendors': '供应商',
      'nav.channels': '渠道',
      
      // Import Wizard
      'import.title': '运价导入向导',
      'import.step1': '上传文件',
      'import.step2': '解析预览',
      'import.step3': '结构验证',
      'import.step4': '确认操作',
      'import.step5': '导入进度',
      'import.upload.title': '上传Excel文件',
      'import.upload.hint': '点击或拖拽文件到此区域上传',
      'import.upload.desc': '支持多工作表Excel文件 (.xlsx, .xls)',
      'import.selectVendor': '选择供应商',
      'import.parsing': '正在解析文件...',
      'import.preview.title': '工作表预览',
      'import.preview.rows': '行',
      'import.preview.firstVersion': '初版',
      'import.preview.update': '更新版本',
      'import.preview.allFirstVersions': '所有渠道均为初版，将跳过结构验证',
      'import.validation.title': '重量结构验证',
      'import.validation.none': '无变化',
      'import.validation.minor': '轻微变化',
      'import.validation.major': '重大变化',
      'import.confirm.title': '确认导入操作',
      'import.confirm.override': '覆盖结构',
      'import.confirm.skip': '跳过发布',
      'import.progress.title': '导入进度',
      'import.progress.importing': '正在导入...',
      'import.progress.success': '导入成功完成',
      
      // Diff Center
      'diff.title': '运价差异中心',
      'diff.filters': '筛选条件',
      'diff.vendor': '供应商',
      'diff.channel': '渠道',
      'diff.dateRange': '日期范围',
      'diff.export': '导出',
      'diff.country': '国家',
      'diff.zone': '分区',
      'diff.weightRange': '重量区间',
      'diff.oldPrice': '旧价格',
      'diff.newPrice': '新价格',
      'diff.delta': '差额',
      'diff.deltaPct': '差额%',
      'diff.effectiveDate': '生效日期',
      
      // History
      'history.title': '版本历史',
      'history.currentVersion': '当前版本',
      'history.selectVersion': '选择版本',
      'history.versionInfo': '版本信息',
      'history.effectiveDate': '生效日期',
      'history.uploadedBy': '上传者',
      'history.status': '状态',
      
      // Common
      'common.search': '搜索',
      'common.reset': '重置',
      'common.next': '下一步',
      'common.previous': '上一步',
      'common.submit': '提交',
      'common.cancel': '取消',
      'common.confirm': '确认',
      'common.active': '激活',
      'common.inactive': '未激活',
      'common.loading': '加载中...',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
