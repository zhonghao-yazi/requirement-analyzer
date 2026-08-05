/**
 * 模拟 AI 分析结果
 * 示例场景：用户登录功能
 */

const mockAnalysisResult = {
  summary: [
    '用户可通过账号+密码方式登录系统',
    '密码规则：至少8位，必须包含大写字母、小写字母和数字',
    '同一账号连续登录失败3次，锁定30分钟',
    '登录成功后生成 JWT Token，有效期2小时',
    '支持「记住我」功能，Token 有效期延长至7天',
    '登录页面需支持回车键快捷提交',
  ],

  flowSteps: [
    { id: '1', label: '打开登录页' },
    { id: '2', label: '输入账号密码' },
    { id: '3', label: '点击登录 / 回车' },
    { id: '4', label: '校验输入格式' },
    { id: '5', label: '后端验证账号密码' },
    { id: '6', label: '登录成功\n跳转首页' },
    { id: '7', label: '提示错误信息' },
    { id: '8', label: '累计失败次数' },
    { id: '9', label: '账号锁定30分钟' },
  ],

  flowEdges: [
    { from: '1', to: '2' },
    { from: '2', to: '3' },
    { from: '3', to: '4' },
    { from: '4', to: '5' },
    { from: '5', to: '6' },
    { from: '5', to: '7' },
    { from: '4', to: '7' },
    { from: '7', to: '8' },
    { from: '8', to: '9' },
  ],

  testCases: [
    // 核心流程
    {
      id: 1,
      category: '核心流程',
      title: '正确账号密码登录成功',
      preconditions: '1. 已注册账号 test@example.com / Pass1234\n2. 账号状态正常，未锁定',
      steps: '1. 打开登录页面\n2. 输入正确邮箱 test@example.com\n3. 输入正确密码 Pass1234\n4. 点击「登录」按钮',
      expected: '1. 登录成功，页面跳转至首页\n2. 导航栏显示用户头像和昵称\n3. 返回的 JWT Token 存储在 localStorage',
    },
    {
      id: 2,
      category: '核心流程',
      title: '回车键快捷登录',
      preconditions: '1. 已在登录页输入正确账号密码',
      steps: '1. 输入正确邮箱和密码\n2. 在密码输入框按下 Enter 键',
      expected: '触发登录提交，行为与点击登录按钮完全一致',
    },
    {
      id: 3,
      category: '核心流程',
      title: '勾选「记住我」登录',
      preconditions: '1. 正确账号密码\n2. 登录页勾选「记住我」复选框',
      steps: '1. 输入正确账号密码\n2. 勾选「记住我」\n3. 点击登录',
      expected: 'Token 有效期延长至7天，关闭浏览器后重新打开仍保持登录状态',
    },

    // 边界值
    {
      id: 4,
      category: '边界值',
      title: '密码长度最小边界（7位）',
      preconditions: '密码规则要求至少8位',
      steps: '1. 输入正确邮箱\n2. 输入7位有效密码如 Pass123\n3. 点击登录',
      expected: '前端校验不通过，提示「密码至少8位」，不发送后端请求',
    },
    {
      id: 5,
      category: '边界值',
      title: '密码长度最小边界（8位）',
      preconditions: '密码规则要求至少8位',
      steps: '1. 输入正确邮箱\n2. 输入8位有效密码如 Pass1234\n3. 点击登录',
      expected: '前端校验通过，正常发送登录请求',
    },
    {
      id: 6,
      category: '边界值',
      title: '密码长度超长输入（100位）',
      preconditions: '',
      steps: '1. 输入正确邮箱\n2. 输入100位符合规则的密码\n3. 点击登录',
      expected: '1. 前端不限制长度（或按规范限制最高64位）\n2. 后端正常处理，不报错',
    },
    {
      id: 7,
      category: '边界值',
      title: '邮箱格式缺少@符号',
      preconditions: '',
      steps: '1. 输入不含@的账号如 testexample.com\n2. 输入正确密码\n3. 点击登录',
      expected: '前端提示「请输入有效的邮箱地址」',
    },

    // 安全性
    {
      id: 8,
      category: '安全性',
      title: 'SQL注入防护',
      preconditions: '',
      steps: '1. 在邮箱输入框输入: admin@test.com\' OR \'1\'=\'1\n2. 输入任意密码\n3. 点击登录',
      expected: '后端正确处理特殊字符，不执行注入SQL，返回「账号或密码错误」',
    },
    {
      id: 9,
      category: '安全性',
      title: 'XSS 脚本注入防护',
      preconditions: '',
      steps: '1. 在邮箱输入框输入: <script>alert("xss")</script>\n2. 输入任意密码\n3. 点击登录',
      expected: '输入内容被转义或过滤，页面不执行脚本，不会弹出 alert',
    },
    {
      id: 10,
      category: '安全性',
      title: '暴力破解防护—锁定机制',
      preconditions: '账号 test@example.com 未被锁定',
      steps: '1. 连续3次输入错误密码\n2. 第4次输入正确密码',
      expected: '1. 第3次失败后提示「账号已锁定，请30分钟后重试」\n2. 第4次即使密码正确也无法登录',
    },
    {
      id: 11,
      category: '安全性',
      title: 'Token 过期后访问受保护页面',
      preconditions: '已登录，手动清除或等待 Token 过期',
      steps: '1. 登录成功后等待2小时（Token过期）\n2. 刷新页面或访问需要登录的接口',
      expected: '自动跳转至登录页，提示「登录已过期，请重新登录」',
    },

    // 稳定性
    {
      id: 12,
      category: '稳定性',
      title: '网络中断时点击登录',
      preconditions: '断网或网络极差',
      steps: '1. 打开登录页\n2. 输入正确账号密码\n3. 断开网络\n4. 点击登录',
      expected: '前端捕获网络错误，显示友好提示「网络连接失败，请检查网络后重试」，不白屏不崩溃',
    },
    {
      id: 13,
      category: '稳定性',
      title: '后端服务超时处理',
      preconditions: '后端服务响应缓慢（超过超时阈值）',
      steps: '1. 输入正确账号密码\n2. 点击登录\n3. 后端接口超过30秒未返回',
      expected: '前端超时后显示提示「请求超时，请稍后重试」，页面可正常重新操作',
    },
    {
      id: 14,
      category: '稳定性',
      title: '连续快速点击登录按钮',
      preconditions: '',
      steps: '1. 输入正确账号密码\n2. 快速连续点击登录按钮5次',
      expected: '1. 按钮在第一次点击后置灰（disabled）并显示 loading\n2. 只发送一次登录请求，不重复提交',
    },
  ],
}

export default mockAnalysisResult
