/**
 * 端到端WebSocket测试（需要服务器运行中）
 * 运行: npx tsx test-ws.ts
 */

import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000');

interface TestCase {
  msg: string;
  expectContains: string;  // 期望回复中包含的关键词
  desc: string;
}

const tests: TestCase[] = [
  // 第一层：正则快速匹配
  { msg: '你好', expectContains: '考研人加油', desc: 'L1问候' },
  { msg: '谢谢', expectContains: '不客气', desc: 'L1感谢' },
  { msg: '帮助', expectContains: '我在呀', desc: 'L1帮助' },
  { msg: '不用了', expectContains: '有需要随时找我', desc: 'L1拒绝' },

  // 第二层：AI意图识别
  { msg: '今天学了3小时高数，做了张宇1000题', expectContains: '记录', desc: 'L2学习记录' },
  { msg: '帮我安排明天的英语复习', expectContains: '英语', desc: 'L2制定计划' },
  { msg: '什么是泰勒展开？', expectContains: '泰勒', desc: 'L2知识问答' },

  // 第三层：安全检查
  { msg: '通宵复习了，头疼', expectContains: '休息', desc: 'L3过度学习' },
  { msg: '感觉考不上了，想放弃', expectContains: '考研人', desc: 'L3考研焦虑' },
  { msg: '别人进度比我快好多', expectContains: '节奏', desc: 'L3比较焦虑' },
];

let current = 0;
let welcomeReceived = false;
let passed = 0;
let failed = 0;

ws.on('open', () => {
  console.log('已连接到服务器\n');
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type !== 'chat') return;

  // 跳过欢迎消息
  if (!welcomeReceived) {
    welcomeReceived = true;
    setTimeout(runNext, 500);
    return;
  }

  const test = tests[current];
  const responseText = msg.text || '';
  const pass = responseText.includes(test.expectContains);
  const icon = pass ? '✅' : '❌';

  console.log(`${icon} [${current + 1}] ${test.desc}`);
  console.log(`   输入: "${test.msg}"`);
  console.log(`   回复: ${responseText.substring(0, 80)}...`);
  if (!pass) {
    console.log(`   ⚠️ 期望包含: "${test.expectContains}"`);
  }
  console.log('');

  if (pass) passed++; else failed++;

  current++;
  if (current < tests.length) {
    setTimeout(runNext, 1500);
  } else {
    console.log(`\n=== 测试完成: ${passed} 通过, ${failed} 失败 ===`);
    ws.close();
    process.exit(failed > 0 ? 1 : 0);
  }
});

ws.on('error', (err) => {
  console.error('连接失败:', err.message);
  console.error('请确保服务器已启动: npm run dev');
  process.exit(1);
});

function runNext() {
  const test = tests[current];
  ws.send(JSON.stringify({ type: 'chat', text: test.msg, timestamp: Date.now() }));
}
