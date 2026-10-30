export type CityId =
  | 'shanghai'
  | 'shenzhen'
  | 'guangzhou'
  | 'beijing'
  | 'tianjin'
  | 'nanjing'
  | 'hangzhou'
  | 'chongqing'
  | 'hefei'
  | 'anhui'
  | 'jiangsu'
  | 'zhejiang'
  | 'jiangxi'
  | 'guangdong'
  | 'henan'
  | 'shandong'
  | 'hubei'
  | 'hebei'
  | 'shanxi'
  | 'liaoning'
  | 'jilin'
  | 'heilongjiang'
  | 'fujian'
  | 'hunan'
  | 'guangxi'
  | 'hainan'
  | 'sichuan'
  | 'guizhou'
  | 'yunnan'
  | 'shaanxi'
  | 'gansu'
  | 'qinghai'
  | 'other';

export type PensionRule = 'standard' | 'guangdong';

export interface CityProfile {
  id: CityId;
  name: string;
  province: string;
  /** 后续月缴费指数 = 缴费基数 ÷ contributionReference */
  contributionReference: number;
  contributionYear: string;
  /** 基础养老金使用的计发基数 */
  pensionBase: number;
  pensionBaseYear: string;
  minBase: number;
  maxBase: number;
  rule: PensionRule;
  /** 上海、广西现行办法要求待遇见分进角 */
  roundUpToJiao: boolean;
  parameterNote: string;
  formulaNote: string;
}

export const CITY_PROFILES: Record<CityId, CityProfile> = {
  shanghai: {
    id: 'shanghai', name: '上海', province: '上海市',
    contributionReference: 12577, contributionYear: '2025 年度全口径月均工资',
    pensionBase: 12577, pensionBaseYear: '2026 年计发参数',
    minBase: 7546, maxBase: 37731, rule: 'standard', roundUpToJiao: true,
    parameterNote: '2026 年 7 月起缴费上下限；计发与缴费指数均采用 2025 年度全口径月均工资。',
    formulaNote: '历史缴费指数保底及过渡性养老金未自动展开。',
  },
  shenzhen: {
    id: 'shenzhen', name: '深圳', province: '广东省',
    contributionReference: 9201, contributionYear: '2025 年度广东全口径月均工资',
    pensionBase: 11293, pensionBaseYear: '2025 年计发基数（2026 新值未公布，暂作参考）',
    minBase: 5521, maxBase: 27603, rule: 'guangdong', roundUpToJiao: false,
    parameterNote: '缴费上下限采用广东 2026 年 7 月标准；深圳养老金计发基数单独核定。',
    formulaNote: '已应用广东低平均指数修正；未含深户地方补充养老、缴费年限津贴及过渡性养老金。',
  },
  guangzhou: {
    id: 'guangzhou', name: '广州', province: '广东省',
    contributionReference: 9201, contributionYear: '2025 年度广东全口径月均工资',
    pensionBase: 9493, pensionBaseYear: '2025 年广东计发基数（2026 新值未公布，暂作参考）',
    minBase: 5521, maxBase: 27603, rule: 'guangdong', roundUpToJiao: false,
    parameterNote: '缴费上下限采用广东 2026 年 7 月标准；广州使用广东省（不含深圳）计发基数。',
    formulaNote: '已应用广东低平均指数修正；未含缴费年限津贴、地方补助及过渡性养老金。',
  },
  beijing: {
    id: 'beijing', name: '北京', province: '北京市',
    contributionReference: 12116, contributionYear: '2025 年度全口径月均工资',
    pensionBase: 12049, pensionBaseYear: '2025 年计发基数（2026 新值未公布，暂作参考）',
    minBase: 7270, maxBase: 36348, rule: 'standard', roundUpToJiao: false,
    parameterNote: '2026 年 7 月起缴费上下限；计发基数暂沿用 2025 年官方值。',
    formulaNote: '已支持N应缴断缴月数进入平均指数分母；失业保险待遇等可扣除期间请勿填入，视同缴费及过渡性养老金细则未自动展开。',
  },
  tianjin: {
    id: 'tianjin', name: '天津', province: '天津市',
    contributionReference: 8634, contributionYear: '2025 年度全市职工月均工资',
    pensionBase: 9417, pensionBaseYear: '2025 年计发基数（2026 新值未公布，暂作参考）',
    minBase: 5180, maxBase: 25902, rule: 'standard', roundUpToJiao: false,
    parameterNote: '2026 年 9 月起缴费上下限；计发基数暂沿用 2025 年官方值。',
    formulaNote: '未含视同缴费指数及过渡性养老金的地方细则。',
  },
  nanjing: {
    id: 'nanjing', name: '南京', province: '江苏省',
    contributionReference: 8375.67, contributionYear: '2025 年度江苏全口径月均工资（由缴费上限折算）',
    pensionBase: 8917, pensionBaseYear: '2025 年江苏计发基数（2026 新值未公布，暂作参考）',
    minBase: 5025, maxBase: 25127, rule: 'standard', roundUpToJiao: false,
    parameterNote: '采用江苏省 2026 年缴费上下限；南京与全省使用统一参数。',
    formulaNote: '未含江苏视同缴费指数及过渡性养老金办法。',
  },
  hangzhou: {
    id: 'hangzhou', name: '杭州', province: '浙江省',
    contributionReference: 8537, contributionYear: '2025 年度浙江加权月均工资',
    pensionBase: 8537, pensionBaseYear: '2026 年浙江待遇计发基数',
    minBase: 5122, maxBase: 25611, rule: 'standard', roundUpToJiao: false,
    parameterNote: '采用浙江省 2026 年参数；杭州与全省使用统一计发及缴费基数。',
    formulaNote: '未含浙江视同缴费指数及过渡性养老金办法。',
  },
  chongqing: {
    id: 'chongqing', name: '重庆', province: '重庆市',
    contributionReference: 7588.25, contributionYear: '2025 年度重庆就业人员月均工资',
    pensionBase: 8240, pensionBaseYear: '2025 年计发基数（2026 新值未公布，暂作参考）',
    minBase: 4553, maxBase: 22765, rule: 'standard', roundUpToJiao: false,
    parameterNote: '采用重庆 2026 年缴费上下限；计发基数暂沿用 2025 年参考值。',
    formulaNote: '未含重庆视同缴费指数及过渡性养老金办法。',
  },
  hefei: {
    id: 'hefei', name: '合肥', province: '安徽省',
    contributionReference: 7257, contributionYear: '2025 年度安徽全口径月均工资',
    pensionBase: 7999, pensionBaseYear: '2025 年安徽计发基数（2026 新值未公布，暂作参考）',
    minBase: 4354, maxBase: 21772, rule: 'standard', roundUpToJiao: false,
    parameterNote: '采用安徽省 2026 年缴费上下限；合肥与全省使用统一参数。',
    formulaNote: '未含安徽视同缴费指数及过渡性养老金办法。',
  },
  anhui: {
    id: 'anhui', name: '安徽省', province: '省内通用',
    contributionReference: 7257, contributionYear: '2025 年度安徽全口径月均工资',
    pensionBase: 7999, pensionBaseYear: '2025 年安徽计发基数（2026 新值未公布，暂作参考）',
    minBase: 4354, maxBase: 21772, rule: 'standard', roundUpToJiao: false,
    parameterNote: '安徽省内城市通用：2026 年缴费上下限与省级计发参考值。',
    formulaNote: '基础养老金使用标准公式；未含视同缴费指数及过渡性养老金办法。',
  },
  jiangsu: {
    id: 'jiangsu', name: '江苏省', province: '省内通用',
    contributionReference: 8375.67, contributionYear: '2025 年度江苏全口径月均工资（由缴费上限折算）',
    pensionBase: 8917, pensionBaseYear: '2025 年江苏计发基数（2026 新值未公布，暂作参考）',
    minBase: 5025, maxBase: 25127, rule: 'standard', roundUpToJiao: false,
    parameterNote: '江苏省内城市通用：2026 年缴费上下限与省级计发参考值。',
    formulaNote: '基础养老金使用标准公式；未含江苏视同缴费指数及过渡性养老金新办法。',
  },
  zhejiang: {
    id: 'zhejiang', name: '浙江省', province: '省内通用',
    contributionReference: 8537, contributionYear: '2025 年度浙江加权月均工资',
    pensionBase: 8537, pensionBaseYear: '2026 年浙江待遇计发基数',
    minBase: 5122, maxBase: 25611, rule: 'standard', roundUpToJiao: false,
    parameterNote: '浙江省内城市通用：2026 年缴费与待遇计发均采用省级统一参数。',
    formulaNote: '基础养老金使用标准公式；未含浙江视同缴费指数及过渡性养老金办法。',
  },
  jiangxi: {
    id: 'jiangxi', name: '江西省', province: '省内通用',
    contributionReference: 6649, contributionYear: '2026 年江西城镇职工缴费基数标准',
    pensionBase: 7054, pensionBaseYear: '2025 年江西计发基数（2026 新值未公布，暂作参考）',
    minBase: 3990, maxBase: 19947, rule: 'standard', roundUpToJiao: false,
    parameterNote: '江西省内城市通用：2026 年缴费参数与 2025 年计发参考值。',
    formulaNote: '基础养老金使用标准公式；未含江西视同缴费指数及过渡性养老金办法。',
  },
  guangdong: {
    id: 'guangdong', name: '广东省', province: '不含深圳',
    contributionReference: 9201, contributionYear: '2025 年度广东全口径月均工资',
    pensionBase: 9493, pensionBaseYear: '2025 年广东计发基数（2026 新值未公布，暂作参考）',
    minBase: 5521, maxBase: 27603, rule: 'guangdong', roundUpToJiao: false,
    parameterNote: '适用于广东省内除深圳外的城市；深圳请选城市专用参数。',
    formulaNote: '已应用广东低平均指数修正；未含地方补助及过渡性养老金。',
  },
  henan: {
    id: 'henan', name: '河南省', province: '省内通用',
    contributionReference: 6520, contributionYear: '2026 年河南社保缴费基数核定工资',
    pensionBase: 6738, pensionBaseYear: '2025 年河南基础养老金计发基数（2026 新值未公布，暂作参考）',
    minBase: 3912, maxBase: 19560, rule: 'standard', roundUpToJiao: false,
    parameterNote: '河南省内城市通用：2026 年缴费参数与省级基础养老金计发参考值。',
    formulaNote: '基础养老金使用标准公式；河南过渡性养老金另用地市基数，本工具未计算该项。',
  },
  shandong: {
    id: 'shandong', name: '山东省', province: '除菏泽企业退休',
    contributionReference: 7621, contributionYear: '2025 年度山东全口径月均工资',
    pensionBase: 7831, pensionBaseYear: '2025 年山东计发基数（2026 新值未公布，暂作参考）',
    minBase: 4573, maxBase: 22863, rule: 'standard', roundUpToJiao: false,
    parameterNote: '适用于山东多数城市；菏泽企业退休请手动将计发基数改为当地值。',
    formulaNote: '基础养老金使用标准公式；未含山东视同缴费指数及过渡性养老金办法。',
  },
  hubei: {
    id: 'hubei', name: '湖北省', province: '需补退休地基数',
    contributionReference: 7587, contributionYear: '2026 社保年度湖北缴费基数月标准',
    pensionBase: NaN, pensionBaseYear: '必填：湖北各市州计发基数分档，请按退休地核定口径填写',
    minBase: 4552, maxBase: 22761, rule: 'standard', roundUpToJiao: false,
    parameterNote: '已填湖北缴费参数；计发基数不做全省统一假设，请补退休地数值。',
    formulaNote: '基础养老金使用标准公式；退休地计发基数由用户填写，未含过渡性养老金。',
  },
  hebei: {
    id: 'hebei', name: '河北省', province: '省内通用',
    contributionReference: 6794, contributionYear: '2025 年度河北全口径月均工资',
    pensionBase: 7410, pensionBaseYear: '2025 年河北计发基数（2026 新值未公布，暂作参考）',
    minBase: 4076, maxBase: 20382, rule: 'standard', roundUpToJiao: false,
    parameterNote: '河北省内城市通用：2026 年缴费上下限与省级计发参考值。',
    formulaNote: '基础养老金使用标准公式；未含河北视同缴费指数及过渡性养老金办法。',
  },
  shanxi: {
    id: 'shanxi', name: '山西省', province: '省内通用',
    contributionReference: 7073, contributionYear: '2025 年度山西全口径月均工资',
    pensionBase: 7253, pensionBaseYear: '2025 年山西计发基数（2026 新值未公布，暂作参考）',
    minBase: 4244, maxBase: 21219, rule: 'standard', roundUpToJiao: false,
    parameterNote: '山西省内城市通用：2026 年缴费上下限与 2025 年计发参考值。',
    formulaNote: '基础养老金使用标准公式；未含山西视同缴费指数及过渡性养老金办法。',
  },
  liaoning: {
    id: 'liaoning', name: '辽宁省', province: '不含沈阳、大连企业退休',
    contributionReference: 7555, contributionYear: '2025 年度辽宁全口径月均工资',
    pensionBase: 7346, pensionBaseYear: '2025 年辽宁普通地区计发基数（2026 新值未公布，暂作参考）',
    minBase: 4533, maxBase: 22665, rule: 'standard', roundUpToJiao: false,
    parameterNote: '适用于辽宁普通地区；2025 年沈阳企业 8390 元、大连企业 8956 元，请在高级参数中改计发基数。',
    formulaNote: '基础养老金使用标准公式；沈阳、大连企业退休须改用当地基数，未含过渡性养老金。',
  },
  jilin: {
    id: 'jilin', name: '吉林省', province: '不含长春、农垦企业',
    contributionReference: 7481.5, contributionYear: '2025 年度吉林全口径月均工资',
    pensionBase: 7322.08, pensionBaseYear: '2025 年吉林普通地区计发基数（2026 新值未公布，暂作参考）',
    minBase: 4488.9, maxBase: 22444.5, rule: 'standard', roundUpToJiao: false,
    parameterNote: '适用于吉林普通地区；2025 年长春 7978.25 元、农垦企业 2223.42 元，请按退休地手动修正。',
    formulaNote: '基础养老金使用标准公式；长春及农垦企业须改用对应基数，未含过渡性养老金。',
  },
  heilongjiang: {
    id: 'heilongjiang', name: '黑龙江省', province: '省内通用',
    contributionReference: 7705, contributionYear: '2025 年度黑龙江全口径月均工资',
    pensionBase: 7705, pensionBaseYear: '2026 年黑龙江计发参数',
    minBase: 4623, maxBase: 23115, rule: 'standard', roundUpToJiao: false,
    parameterNote: '黑龙江省内城市通用：2026 年缴费与待遇计发采用统一参数。',
    formulaNote: '基础养老金使用标准公式；未含黑龙江视同缴费指数及过渡性养老金办法。',
  },
  fujian: {
    id: 'fujian', name: '福建省', province: '省内通用',
    contributionReference: 7631, contributionYear: '2025 年度福建全口径月均工资',
    pensionBase: 7932, pensionBaseYear: '2025 年福建计发基数（2026 新值未公布，暂作参考）',
    minBase: 4579, maxBase: 22893, rule: 'standard', roundUpToJiao: false,
    parameterNote: '福建省内城市通用：2026 年缴费上下限与 2025 年计发参考值。',
    formulaNote: '基础养老金使用标准公式；未含福建视同缴费指数及过渡性养老金办法。',
  },
  hunan: {
    id: 'hunan', name: '湖南省', province: '省内通用',
    contributionReference: 6843, contributionYear: '2025 年度湖南全口径月均工资',
    pensionBase: 7694, pensionBaseYear: '2025 年湖南计发基数（2026 新值未公布，暂作参考）',
    minBase: 4106, maxBase: 20529, rule: 'standard', roundUpToJiao: false,
    parameterNote: '湖南省内城市通用：2026 年缴费上下限与 2025 年计发参考值。',
    formulaNote: '基础养老金使用标准公式；未含湖南视同缴费指数及过渡性养老金办法。',
  },
  guangxi: {
    id: 'guangxi', name: '广西壮族自治区', province: '区内通用',
    contributionReference: 7008, contributionYear: '2026 年广西缴费基数核定指标',
    pensionBase: 6983, pensionBaseYear: '2025 年广西待遇计发基数（2026 新值未公布，暂作参考）',
    minBase: 4204.8, maxBase: 21024, rule: 'standard', roundUpToJiao: true,
    parameterNote: '广西区内城市通用：2026 年缴费上下限与 2025 年计发参考值。',
    formulaNote: '基础养老金使用标准公式并按见分进角估算；未含广西视同缴费指数、建账前实际缴费及过渡性养老金细则。',
  },
  hainan: {
    id: 'hainan', name: '海南省', province: '省内通用',
    contributionReference: 8254, contributionYear: '2025 年度海南全口径月均工资',
    pensionBase: 8254, pensionBaseYear: '2026 年海南计发参数',
    minBase: 4952.4, maxBase: 24762, rule: 'standard', roundUpToJiao: false,
    parameterNote: '海南省内城市通用：2026 年缴费与待遇计发采用统一参数。',
    formulaNote: '基础养老金使用标准公式；未含海南视同缴费指数及过渡性养老金办法。',
  },
  sichuan: {
    id: 'sichuan', name: '四川省', province: '省内通用',
    contributionReference: 7831, contributionYear: '2025 年度四川全口径月均工资',
    pensionBase: 8462, pensionBaseYear: '2025 年四川计发基数（2026 新值未公布，暂作参考）',
    minBase: 4699, maxBase: 23493, rule: 'standard', roundUpToJiao: false,
    parameterNote: '四川省内城市通用：2026 年缴费上下限与 2025 年计发参考值。',
    formulaNote: '基础养老金使用标准公式；未含四川视同缴费指数及过渡性养老金办法。',
  },
  guizhou: {
    id: 'guizhou', name: '贵州省', province: '省内通用',
    contributionReference: 7376.75, contributionYear: '2025 年度贵州全口径月均工资',
    pensionBase: 7376.75, pensionBaseYear: '2026 年贵州计发参数',
    minBase: 4426, maxBase: 22130, rule: 'standard', roundUpToJiao: false,
    parameterNote: '贵州省内城市通用：2026 年缴费与待遇计发采用统一参数，上下限按元取整。',
    formulaNote: '基础养老金使用标准公式；未含贵州视同缴费指数及过渡性养老金办法。',
  },
  yunnan: {
    id: 'yunnan', name: '云南省', province: '省内通用',
    contributionReference: 7339, contributionYear: '2025 年度云南全口径月均工资',
    pensionBase: 8265, pensionBaseYear: '2025 年云南计发基数（2026 新值未公布，暂作参考）',
    minBase: 4403, maxBase: 22017, rule: 'standard', roundUpToJiao: false,
    parameterNote: '云南省内城市通用：2026 年缴费上下限与 2025 年计发参考值。',
    formulaNote: '基础养老金使用标准公式；未含云南视同缴费指数及过渡性养老金办法。',
  },
  shaanxi: {
    id: 'shaanxi', name: '陕西省', province: '省内通用',
    contributionReference: 7895, contributionYear: '2025 年度陕西全口径月均工资',
    pensionBase: 7881, pensionBaseYear: '2025 年陕西计发基数（2026 新值未公布，暂作参考）',
    minBase: 4737, maxBase: 23685, rule: 'standard', roundUpToJiao: false,
    parameterNote: '陕西省内城市通用：2026 年缴费上下限与 2025 年计发参考值。',
    formulaNote: '基础养老金使用标准公式；未含陕西视同缴费指数及过渡性养老金办法。',
  },
  gansu: {
    id: 'gansu', name: '甘肃省', province: '省内通用',
    contributionReference: 7542, contributionYear: '2025 年度甘肃全口径月均工资',
    pensionBase: 7746, pensionBaseYear: '2025 年甘肃计发基数（2026 新值未公布，暂作参考）',
    minBase: 4526, maxBase: 22626, rule: 'standard', roundUpToJiao: false,
    parameterNote: '甘肃省内城市通用：2026 年缴费上下限与 2025 年计发参考值。',
    formulaNote: '基础养老金使用标准公式；未含甘肃视同缴费指数及过渡性养老金办法。',
  },
  qinghai: {
    id: 'qinghai', name: '青海省', province: '省内通用',
    contributionReference: 8888, contributionYear: '2025 年度青海全口径月均工资',
    pensionBase: 9056, pensionBaseYear: '2025 年青海计发基数（2026 新值未公布，暂作参考）',
    minBase: 5333, maxBase: 26664, rule: 'standard', roundUpToJiao: false,
    parameterNote: '青海省内城市通用：2026 年缴费上下限与 2025 年计发参考值。',
    formulaNote: '基础养老金使用标准公式；未含青海视同缴费指数及过渡性养老金办法。',
  },
  other: {
    id: 'other', name: '其他城市', province: '手动填写参数',
    contributionReference: NaN, contributionYear: '必填：按退休地规定，填写计算后续缴费指数所用的工资或基准',
    pensionBase: NaN, pensionBaseYear: '必填：按退休时待遇领取地公布的计发基数填写',
    minBase: 0, maxBase: 10_000_000, rule: 'standard', roundUpToJiao: false,
    parameterNote: '不限城市。请在高级计发参数中填写退休地两项基准，即可按通用公式估算。',
    formulaNote: '当前为手动参数模式，仅应用通用两项公式，不自动应用退休地特殊修正、地方补充待遇或过渡性养老金。',
  },
};

export const CITY_ORDER: CityId[] = [
  'shanghai', 'beijing', 'shenzhen', 'guangzhou', 'tianjin',
  'nanjing', 'hangzhou', 'chongqing', 'hefei',
];

export const PROVINCE_ORDER: CityId[] = [
  'anhui', 'jiangsu', 'zhejiang', 'jiangxi', 'guangdong',
  'henan', 'shandong', 'hubei', 'hebei', 'shanxi', 'liaoning',
  'jilin', 'heilongjiang', 'fujian', 'hunan', 'guangxi', 'hainan',
  'sichuan', 'guizhou', 'yunnan', 'shaanxi', 'gansu', 'qinghai',
];

export const REGION_ORDER: CityId[] = [...CITY_ORDER, ...PROVINCE_ORDER, 'other'];
