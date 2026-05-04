/**
 * 功能整合测试 - 前端学习记录提取 & 数据处理
 * 运行: npx tsx test-integration.ts
 */

let passed = 0;
let failed = 0;

function assert(name: string, actual: any, expected: any) {
  if (actual === expected) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name} (期望: ${expected}, 实际: ${actual})`);
    failed++;
  }
}

function assertRange(name: string, actual: number, min: number, max: number) {
  if (actual >= min && actual <= max) {
    console.log(`  ✅ ${name} = ${actual}分钟`);
    passed++;
  } else {
    console.log(`  ❌ ${name} = ${actual}分钟 (期望: ${min}-${max}分钟)`);
    failed++;
  }
}

// ========== 模拟前端 extractAndSave 逻辑 ==========

interface StudyRecord {
  date: string;
  subject: string;
  duration: number;
  content: string;
  completed: boolean;
}

function extractStudyRecords(m: string): StudyRecord[] {
  const cnNum: Record<string, number> = {'一':1,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10};
  const nPat = '(?:一个半|[\\d.]*半|[\\d.一二两三四五六七八九十]+)';
  const uPat = '(?:小时|h|分钟|min)';
  const records: StudyRecord[] = [];
  const segs = m.split(/[,，;；。！!？?]+/);

  for (const seg of segs) {
    const s = seg.trim();
    if (!s) continue;
    const p1s = s.match(/([一-鿿]{2,6})(?=学[习了]?|复习|背|看了|做了|练了)(?:学[习了]?|复习|背|看了|做了|练了).*?((?:一个半|[\d.]*半|[\d.一二两三四五六七八九十]+))(?:小时|h|分钟|min)/);
    const temporal = /^(今[天晚]|昨[天晚]|明天|后天|前天|早上|上午|下午|今天我|昨天我)/;
    const p1 = (p1s && !temporal.test(p1s[1])) ? [p1s[0], p1s[2], p1s[1]] : null;
    const p2 = s.match(/(?:学[习了]?|复习|背|看了|做了|练了).*?((?:一个半|[\d.]*半|[\d.一二两三四五六七八九十]+))(?:小时|h|分钟|min).*?([一-鿿]{2,6})/);
    const p3 = s.match(/((?:一个半|[\d.]*半|[\d.一二两三四五六七八九十]+))(?:小时|h|分钟|min).*?([一-鿿]{2,6})/);
    const studyMatch = p1 || p2 || p3;
    if (studyMatch) {
      const numStr = studyMatch[1];
      const subj = studyMatch[2];
      const isMin = s.includes('分钟') || s.includes('min');
      let mins = 0;
      if (numStr === '一个半') { mins = 90; }
      else if (numStr === '半') { mins = 30; }
      else if (typeof numStr === 'string' && numStr.includes('半')) {
        const base = cnNum[numStr.replace('半', '')] || parseFloat(numStr);
        mins = base * 60 + 30;
      } else {
        const n = cnNum[numStr] || parseFloat(numStr);
        mins = isMin ? n : n * 60;
      }
      if (subj && mins > 0) {
        records.push({ date: '2026-05-05', subject: subj, duration: mins, content: s, completed: true });
      }
    }
  }
  return records;
}

// ========== 测试用例 ==========

console.log('\n=== 学习记录提取测试 ===\n');

// --- 单条记录 ---
console.log('--- 单条记录 ---');

let r = extractStudyRecords('今天学习一小时高数');
assert('学习一小时高数 → 1条记录', r.length, 1);
if (r.length === 1) {
  assert('  subject=高数', r[0].subject, '高数');
  assertRange('  duration', r[0].duration, 60, 60);
}

r = extractStudyRecords('背单词两小时');
assert('背单词两小时 → 0条记录(无学科)', r.length, 0);

r = extractStudyRecords('政治复习了一个半小时');
assert('政治复习了一个半小时 → 1条记录', r.length, 1);
if (r.length === 1) {
  assert('  subject=政治', r[0].subject, '政治');
  assertRange('  duration', r[0].duration, 90, 90);
}

r = extractStudyRecords('专业课学了两小时');
assert('专业课学了两小时 → 1条记录', r.length, 1);
if (r.length === 1) {
  assert('  subject=专业课', r[0].subject, '专业课');
  assertRange('  duration', r[0].duration, 120, 120);
}

r = extractStudyRecords('高数学了2小时');
assert('高数学了2小时 → 1条记录', r.length, 1);
if (r.length === 1) {
  assert('  subject=高数', r[0].subject, '高数');
  assertRange('  duration', r[0].duration, 120, 120);
}

r = extractStudyRecords('学了1.5小时英语');
assert('学了1.5小时英语 → 1条记录', r.length, 1);
if (r.length === 1) {
  assert('  subject=英语', r[0].subject, '英语');
  assertRange('  duration', r[0].duration, 90, 90);
}

r = extractStudyRecords('半小时高数');
assert('半小时高数 → 1条记录', r.length, 1);
if (r.length === 1) {
  assert('  subject=高数', r[0].subject, '高数');
  assertRange('  duration', r[0].duration, 30, 30);
}

r = extractStudyRecords('复习了90分钟政治');
assert('复习了90分钟政治 → 1条记录', r.length, 1);
if (r.length === 1) {
  assert('  subject=政治', r[0].subject, '政治');
  assertRange('  duration', r[0].duration, 90, 90);
}

// --- 多条记录（逗号分隔） ---
console.log('\n--- 多条记录（逗号分隔） ---');

r = extractStudyRecords('今天我学习一小时高数，背单词两小时，政治复习了一个半小时，专业课学了两小时');
assert('4段逗号分隔消息 → 3条记录', r.length, 3);
if (r.length >= 3) {
  assert('  第1条: 高数 60min', r[0].subject + ' ' + r[0].duration, '高数 60');
  assert('  第2条: 政治 90min', r[1].subject + ' ' + r[1].duration, '政治 90');
  assert('  第3条: 专业课 120min', r[2].subject + ' ' + r[2].duration, '专业课 120');
}

r = extractStudyRecords('高数学了2小时，英语背了1小时单词');
assert('2段逗号分隔 → 2条记录', r.length, 2);
if (r.length === 2) {
  assert('  第1条: 高数', r[0].subject, '高数');
  assert('  第2条: 英语', r[1].subject, '英语');
}

// --- 不应匹配的消息 ---
console.log('\n--- 不应匹配的消息 ---');

r = extractStudyRecords('什么是泰勒展开？');
assert('知识问答 → 0条', r.length, 0);

r = extractStudyRecords('帮我安排今天的复习');
assert('计划请求 → 0条', r.length, 0);

r = extractStudyRecords('你好');
assert('问候 → 0条', r.length, 0);

r = extractStudyRecords('感觉来不及了');
assert('焦虑情绪 → 0条', r.length, 0);

r = extractStudyRecords('考研真的好累啊');
assert('闲聊 → 0条', r.length, 0);

// ========== 用户档案提取测试 ==========

console.log('\n=== 用户档案提取测试 ===\n');

function extractProfile(m: string) {
  const profile: Record<string, any> = {};
  const nameMatch = m.match(/我叫([一-龥]{2,4})|我是([一-龥]{2,4})/);
  if (nameMatch) profile.name = nameMatch[1] || nameMatch[2];
  const schoolMatch = m.match(/考([一-龥]{2,10}大学|[一-龥]{2,10}学院)|目标[是校]([一-龥]{2,10})|报考([一-龥]{2,10})/);
  if (schoolMatch) profile.targetSchool = schoolMatch[1] || schoolMatch[2] || schoolMatch[3];
  const weakMatch = m.match(/([一-鿿]{2,6})是我的?弱[项点科]|([一-鿿]{2,6})薄弱/);
  if (weakMatch) profile.weakPoints = weakMatch[1] || weakMatch[2];
  return profile;
}

let p = extractProfile('我叫小明');
assert('我叫小明 → name=小明', p.name, '小明');

p = extractProfile('我是小红');
assert('我是小红 → name=小红', p.name, '小红');

p = extractProfile('考浙江大学');
assert('考浙江大学 → targetSchool=浙江大学', p.targetSchool, '浙江大学');

p = extractProfile('目标是北大');
assert('目标是北大 → targetSchool=北大', p.targetSchool, '北大');

p = extractProfile('高数是我的弱项');
assert('高数是我的弱项 → weakPoints=高数', p.weakPoints, '高数');

p = extractProfile('英语薄弱');
assert('英语薄弱 → weakPoints=英语', p.weakPoints, '英语');

// ========== 结果汇总 ==========

console.log(`\n${'='.repeat(50)}`);
console.log(`  功能整合测试完成: ${passed} 通过, ${failed} 失败`);
console.log(`${'='.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
