/**
 * 第一层+第三层 单元测试
 * 运行: npx tsx test-intent.ts
 */

import { regexMatch } from './src/llm/intent/regex.js';
import { safetyCheck } from './src/llm/intent/safety.js';

let passed = 0;
let failed = 0;

function assert(name: string, actual: string, expected: string) {
  if (actual === expected) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name} (期望: ${expected}, 实际: ${actual})`);
    failed++;
  }
}

// ========== 第一层：正则快速匹配 ==========
console.log('\n=== 第一层：正则快速匹配 ===\n');

// 应该命中的
assert('L1-01 你好 → greeting', regexMatch('你好')?.type || 'null', 'greeting');
assert('L1-02 您好 → greeting', regexMatch('您好')?.type || 'null', 'greeting');
assert('L1-03 hi → greeting', regexMatch('hi')?.type || 'null', 'greeting');
assert('L1-04 hello → greeting', regexMatch('hello')?.type || 'null', 'greeting');
assert('L1-05 早上好 → greeting', regexMatch('早上好')?.type || 'null', 'greeting');
assert('L1-06 晚上好 → greeting', regexMatch('晚上好')?.type || 'null', 'greeting');
assert('L1-07 谢谢 → thanks', regexMatch('谢谢')?.type || 'null', 'thanks');
assert('L1-08 感谢 → thanks', regexMatch('感谢')?.type || 'null', 'thanks');
assert('L1-09 好的 → confirm', regexMatch('好的')?.type || 'null', 'confirm');
assert('L1-10 ok → confirm', regexMatch('ok')?.type || 'null', 'confirm');
assert('L1-11 可以 → confirm', regexMatch('可以')?.type || 'null', 'confirm');
assert('L1-12 再见 → farewell', regexMatch('再见')?.type || 'null', 'farewell');
assert('L1-13 拜拜 → farewell', regexMatch('拜拜')?.type || 'null', 'farewell');
assert('L1-14 在吗 → help', regexMatch('在吗')?.type || 'null', 'help');
assert('L1-15 帮助 → help', regexMatch('帮助')?.type || 'null', 'help');
assert('L1-16 你能做什么 → help', regexMatch('你能做什么')?.type || 'null', 'help');
assert('L1-17 不用了 → refuse', regexMatch('不用了')?.type || 'null', 'refuse');
assert('L1-18 算了 → refuse', regexMatch('算了')?.type || 'null', 'refuse');

// 不应该命中的（长消息或非关键词）
assert('L1-19 今天学了3小时高数 → null', regexMatch('今天学了3小时高数，做了张宇1000题')?.type || 'null', 'null');
assert('L1-20 什么是泰勒展开 → null', regexMatch('什么是泰勒展开？')?.type || 'null', 'null');
assert('L1-21 帮我安排明天的复习 → null', regexMatch('帮我安排明天的英语复习')?.type || 'null', 'null');

// ========== 第三层：安全检查 ==========
console.log('\n=== 第三层：安全检查 ===\n');

assert('L3-01 头疼学不进去 → WARN', safetyCheck('头疼，学不进去了').level, 'WARN');
assert('L3-02 眼睛干涩 → WARN', safetyCheck('眼睛干涩看不清').level, 'WARN');
assert('L3-03 颈椎疼 → WARN', safetyCheck('颈椎疼得厉害').level, 'WARN');
assert('L3-04 通宵复习 → WARN', safetyCheck('通宵复习了').level, 'WARN');
assert('L3-05 学14小时没吃饭 → WARN', safetyCheck('学了14小时没吃饭').level, 'WARN');
assert('L3-06 想放弃考研 → URGENT', safetyCheck('感觉考不上了，想放弃').level, 'URGENT');
assert('L3-07 心态崩了 → URGENT', safetyCheck('压力好大，心态崩了').level, 'URGENT');
assert('L3-08 来不及了 → URGENT', safetyCheck('来不及了，时间不够').level, 'URGENT');
assert('L3-09 别人进度快 → WARN', safetyCheck('别人进度比我快好多').level, 'WARN');
assert('L3-10 室友复习两轮 → WARN', safetyCheck('室友已经复习两轮了').level, 'WARN');

// 安全的消息
assert('L3-11 今天学了3小时 → SAFE', safetyCheck('今天学了3小时高数').level, 'SAFE');
assert('L3-12 什么是泰勒展开 → SAFE', safetyCheck('什么是泰勒展开？').level, 'SAFE');

// ========== 结果汇总 ==========
console.log(`\n=== 测试完成: ${passed} 通过, ${failed} 失败 ===\n`);
process.exit(failed > 0 ? 1 : 0);
