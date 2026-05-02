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
import { processIntent } from './llm/intent/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

const app = express();
const server = createServer(app);

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

const wss = new WebSocketServer({ server });
const clients = new Map<string, WebSocket>();

// LLM客户端
const deepSeekClient: DeepSeekClient = createDeepSeekClient();
const llmAvailable = deepSeekClient.isAvailable();

interface Message {
  type: 'chat' | 'ping' | 'pong';
  text?: string;
  deviceId?: string;
  timestamp?: number;
  intent?: string;
  memoryContext?: string;  // 前端传来的记忆上下文
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
      if (!message.text) {
        sendMessage(ws, {
          type: 'chat',
          text: '消息内容不能为空',
          timestamp: Date.now(),
        });
        return;
      }

      // 三层意图识别
      const result = await processIntent(message.text, deepSeekClient);

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
          console.log(`[LLM] 正在调用... 意图: ${result.intent?.subIntent}`);
          const response = await deepSeekClient.simpleChat(message.text, message.memoryContext);
          sendMessage(ws, {
            type: 'chat',
            text: response,
            timestamp: Date.now(),
            intent: result.intent?.subIntent,
          });
          console.log('[LLM] 响应已发送');
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

server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('  考研小管家 - AI考研备考助手');
  console.log('='.repeat(50));
  console.log(`  服务器已启动: http://localhost:${PORT}`);
  console.log('='.repeat(50));
  console.log(`LLM状态: ${llmAvailable ? '✅ 已配置' : '❌ 未配置'}`);
  if (!llmAvailable) {
    console.log('提示: 请设置环境变量 DEEPSEEK_API_KEY');
    console.log('获取地址: https://platform.deepseek.com/');
  }
});
