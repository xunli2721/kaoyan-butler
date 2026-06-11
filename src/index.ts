/**
 * 考研小管家 - 主入口
 */

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDeepSeekClient, DeepSeekClient } from './llm/deepseek.js';
import { createZhipuClient, ZhipuClient } from './llm/zhipu.js';
import { processIntent } from './llm/intent/index.js';
import { handlePlanIntent } from './llm/plan.js';
import { handleQaIntent } from './llm/qa.js';
import { handleReviewIntent } from './llm/review.js';
import { handleEmotionIntent } from './llm/emotion.js';
import { handleMistakeIntent } from './llm/mistake.js';
import { handleWeeklyReportIntent } from './llm/weekly-report.js';
import { handleAnalyticsIntent } from './llm/analytics.js';
import { CONFIG } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

const wss = new WebSocketServer({ server });
const clients = new Map<string, WebSocket>();

// LLM客户端
const deepSeekClient: DeepSeekClient = createDeepSeekClient();
const zhipuClient: ZhipuClient = createZhipuClient();
const llmAvailable = deepSeekClient.isAvailable();
const visionAvailable = zhipuClient.isAvailable();

interface Message {
  type: 'chat' | 'ping' | 'pong';
  text?: string;
  deviceId?: string;
  timestamp?: number;
  intent?: string;
  memoryContext?: string;  // 前端传来的记忆上下文
  plansJson?: string;      // 前端传来的现有计划数据
  planData?: any;          // 返回给前端的结构化计划数据
  mistakeData?: any;       // 返回给前端的结构化错题数据
  imageBase64?: string;    // 前端传来的图片 base64
  weeklyRecordsJson?: string; // 前端传来的本周学习记录数据
  analyticsJson?: string;  // 前端传来的智能分析数据
}

wss.on('connection', (ws: WebSocket) => {
  const connectionId = uuidv4();
  clients.set(connectionId, ws);

  console.log(`[连接] 客户端已连接: ${connectionId}`);
  console.log(`[状态] 当前连接数: ${clients.size}`);

  const welcomeMessage = llmAvailable
    ? '你好！我是考研小管家，你的AI考研备考助手。我可以帮你管理四科复习计划、记录学习进度、解答考研问题。有什么可以帮你的吗？'
    : '你好！我是考研小管家。AI服务暂未配置，请设置DEEPSEEK_API_KEY环境变量。';

  sendMessage(ws, {
    type: 'chat',
    text: welcomeMessage,
    timestamp: Date.now(),
  });

  ws.on('message', (data: Buffer) => {
    try {
      const message: Message = JSON.parse(data.toString());
      handleMessage(ws, message, connectionId);
    } catch (error) {
      console.error('[错误] 消息解析失败:', error);
      sendMessage(ws, {
        type: 'chat',
        text: '消息格式错误，请重试。',
        timestamp: Date.now(),
      });
    }
  });

  ws.on('close', () => {
    clients.delete(connectionId);
    console.log(`[断开] 客户端已断开: ${connectionId}`);
  });

  ws.on('error', (error) => {
    console.error(`[错误] WebSocket错误: ${error.message}`);
  });
});

async function handleMessage(ws: WebSocket, message: Message, connectionId: string) {
  console.log(`[消息] 收到:`, message);

  switch (message.type) {
    case 'chat':
      if (!message.text && !message.imageBase64) {
        sendMessage(ws, {
          type: 'chat',
          text: '消息内容不能为空',
          timestamp: Date.now(),
        });
        return;
      }

      // 图片消息：先识别意图，再用多模态识别图片
      const text = message.text || '';
      let imageResult: string | null = null;

      if (message.imageBase64) {
        const imgPrompt = text || '请识别图片中的数学公式或题目内容，用文字描述清楚，如果包含公式请用LaTeX格式（$...$）表示。';
        if (visionAvailable) {
          console.log(`[图片] 收到图片消息，使用智谱GLM-4V识别...`);
          try {
            imageResult = await zhipuClient.imageChat(imgPrompt, message.imageBase64, message.memoryContext);
            console.log('[图片] 识别完成');
          } catch (error) {
            console.error('[图片] 识别失败:', error);
            sendMessage(ws, { type: 'chat', text: '图片识别失败，请重试或直接文字描述。', timestamp: Date.now() });
            return;
          }
        } else {
          sendMessage(ws, { type: 'chat', text: '图片识别需要配置智谱API Key（ZHIPU_API_KEY），请在环境变量中设置后重启服务。当前请直接用文字描述题目内容。', timestamp: Date.now() });
          return;
        }
      }

      // 三层意图识别
      const result = await processIntent(text || (imageResult ? '帮我记录这道错题' : ''), deepSeekClient);

      // 如果有图片且意图是错题记录，用图片识别结果作为分析保存
      if (imageResult && result.intent?.subIntent?.startsWith('review_mistake')) {
        const today = new Date().toISOString().split('T')[0];
        const mistakeData = {
          id: Date.now().toString(),
          date: today,
          subject: result.intent.extractedData?.subject || '数学',
          question: result.intent.extractedData?.question || text || imageResult.substring(0, 200),
          userAnswer: result.intent.extractedData?.userAnswer || '',
          correctAnswer: result.intent.extractedData?.correctAnswer || '',
          errorType: result.intent.extractedData?.errorType || '未分类',
          analysis: imageResult,
        };
        sendMessage(ws, {
          type: 'chat',
          text: imageResult,
          timestamp: Date.now(),
          intent: result.intent.subIntent,
          mistakeData,
        });
        console.log('[图片+错题] 识别完成并已保存到错题本');
        return;
      }

      // 有图片但不是错题意图，直接返回识别结果
      if (imageResult) {
        sendMessage(ws, {
          type: 'chat',
          text: imageResult,
          timestamp: Date.now(),
          intent: 'image_recognize',
        });
        return;
      }

      // 第一层命中：直接返回预设回复
      if (result.handled && result.response) {
        console.log(`[意图] 第${result.layer}层处理完成，直接回复`);
        sendMessage(ws, {
          type: 'chat',
          text: result.response,
          timestamp: Date.now(),
          intent: result.intent?.subIntent,
        });
        return;
      }

      // 第二层：AI生成回复（带意图上下文+记忆上下文）
      if (llmAvailable) {
        try {
          const subIntent = result.intent?.subIntent || '';

          // 计划类意图：路由到计划处理器
          if (subIntent.startsWith('plan_') && result.intent) {
            console.log(`[计划] 处理意图: ${subIntent}`);
            const planResult = await handlePlanIntent(
              text, result.intent, deepSeekClient, message.plansJson, message.analyticsJson
            );
            sendMessage(ws, {
              type: 'chat',
              text: planResult.text,
              timestamp: Date.now(),
              intent: subIntent,
              planData: planResult.planData,
            });
            console.log('[计划] 响应已发送');
          } else if (subIntent.startsWith('qa_') && result.intent) {
            // 知识问答：路由到专用QA处理器
            console.log(`[QA] 处理意图: ${subIntent}`);
            const qaResult = await handleQaIntent(
              text, result.intent, deepSeekClient, message.memoryContext
            );
            sendMessage(ws, {
              type: 'chat',
              text: qaResult.text,
              timestamp: Date.now(),
              intent: subIntent,
            });
            console.log('[QA] 响应已发送');
          } else if (subIntent.startsWith('review_mistake') && result.intent) {
            // 错题本：路由到专用mistake处理器
            console.log(`[错题本] 处理意图: ${subIntent}`);
            const mistakeResult = await handleMistakeIntent(
              text, result.intent, deepSeekClient, message.memoryContext
            );
            sendMessage(ws, {
              type: 'chat',
              text: mistakeResult.text,
              timestamp: Date.now(),
              intent: subIntent,
              mistakeData: mistakeResult.mistakeData,
            });
            console.log('[错题本] 响应已发送');
          } else if (subIntent === 'review_weekly' && result.intent) {
            // 每周学习报告：路由到专用周报处理器
            console.log(`[周报] 处理意图: ${subIntent}`);
            const weeklyResult = await handleWeeklyReportIntent(
              text, result.intent, deepSeekClient, message.memoryContext, message.weeklyRecordsJson
            );
            sendMessage(ws, {
              type: 'chat',
              text: weeklyResult.text,
              timestamp: Date.now(),
              intent: subIntent,
            });
            console.log('[周报] 响应已发送');
          } else if (subIntent.startsWith('analytics_') && result.intent) {
            // 学习分析：路由到专用analytics处理器
            console.log(`[Analytics] 处理意图: ${subIntent}`);
            const analyticsResult = await handleAnalyticsIntent(
              text, result.intent, deepSeekClient, message.analyticsJson
            );
            sendMessage(ws, {
              type: 'chat',
              text: analyticsResult.text,
              timestamp: Date.now(),
              intent: subIntent,
            });
            console.log('[Analytics] 响应已发送');
          } else if (subIntent.startsWith('review_') && result.intent) {
            // 复习提醒：路由到专用review处理器
            console.log(`[Review] 处理意图: ${subIntent}`);
            const reviewResult = await handleReviewIntent(
              text, result.intent, deepSeekClient, message.memoryContext, message.analyticsJson
            );
            sendMessage(ws, {
              type: 'chat',
              text: reviewResult.text,
              timestamp: Date.now(),
              intent: subIntent,
            });
            console.log('[Review] 响应已发送');
          } else if ((subIntent === 'chat_comfort' || subIntent === 'chat_encouragement' || subIntent === 'chat_chat') && result.intent) {
            // 情绪关怀：路由到专用emotion处理器
            console.log(`[Emotion] 处理意图: ${subIntent}`);
            const emotionResult = await handleEmotionIntent(
              text, result.intent, deepSeekClient, message.memoryContext
            );
            sendMessage(ws, {
              type: 'chat',
              text: emotionResult.text,
              timestamp: Date.now(),
              intent: subIntent,
            });
            console.log('[Emotion] 响应已发送');
          } else {
            // 其他意图：通用LLM回复
            console.log(`[LLM] 正在调用... 意图: ${subIntent}`);
            const response = await deepSeekClient.simpleChat(text, message.memoryContext);
            sendMessage(ws, {
              type: 'chat',
              text: response,
              timestamp: Date.now(),
              intent: subIntent,
            });
            console.log('[LLM] 响应已发送');
          }
        } catch (error) {
          console.error('[LLM] 调用失败:', error);
          sendMessage(ws, {
            type: 'chat',
            text: '抱歉，AI服务出现错误，请稍后再试。',
            timestamp: Date.now(),
          });
        }
      } else {
        sendMessage(ws, {
          type: 'chat',
          text: `AI服务未配置。请设置环境变量后重启服务:\n\n设置 DEEPSEEK_API_KEY\n获取地址: https://platform.deepseek.com/`,
          timestamp: Date.now(),
        });
      }
      break;

    case 'ping':
      sendMessage(ws, { type: 'pong', timestamp: Date.now() });
      break;
  }
}

function sendMessage(ws: WebSocket, message: Message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connections: clients.size,
    timestamp: Date.now(),
  });
});

server.listen(CONFIG.PORT, () => {
  console.log('='.repeat(50));
  console.log('  考研小管家 - AI考研备考助手');
  console.log('='.repeat(50));
  console.log(`  服务器已启动: http://localhost:${CONFIG.PORT}`);
  console.log('='.repeat(50));
  console.log(`LLM状态: ${llmAvailable ? '✅ 已配置' : '❌ 未配置'}`);
  if (!llmAvailable) {
    console.log('提示: 请设置环境变量 DEEPSEEK_API_KEY');
    console.log('获取地址: https://platform.deepseek.com/');
  }
});
