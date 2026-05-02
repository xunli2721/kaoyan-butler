/**
 * 智谱ChatGLM客户端
 */

import { LLMClient, LLMRequest, LLMResponse, LLMConfig } from './types.js';
import { buildChatPrompt } from './prompt.js';

export class ZhipuClient implements LLMClient {
  private config: LLMConfig;
  private apiKey: string | null = null;

  constructor() {
    this.config = this.loadConfig();
    this.apiKey = this.getApiKey();
  }

  private loadConfig(): LLMConfig {
    return {
      provider: 'zhipu',
      model: 'glm-4-flash',
    };
  }

  private getApiKey(): string | null {
    const envKey = process.env.ZHIPU_API_KEY;
    if (envKey) {
      console.log('[智谱] 使用环境变量API Key');
      return envKey;
    }
    if (this.config.apiKey) {
      console.log('[智谱] 使用配置文件API Key');
      return this.config.apiKey;
    }
    console.log('[智谱] API Key未配置');
    return null;
  }

  isAvailable(): boolean {
    return this.apiKey !== null;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    if (!this.apiKey) {
      return {
        content: '智谱API Key未配置，请设置环境变量ZHIPU_API_KEY',
        success: false,
        timestamp: Date.now(),
        error: 'API Key未配置',
      };
    }

    try {
      const prompt = buildChatPrompt(
        request.messages[request.messages.length - 1].content,
        request.context
      );

      const response = await this.callZhipuAPI(prompt);

      return {
        content: response,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.error('[智谱] 调用失败:', error);
      return {
        content: `抱歉，智谱服务出现错误: ${error.message}`,
        success: false,
        timestamp: Date.now(),
        error: error.message,
      };
    }
  }

  async simpleChat(message: string): Promise<string> {
    const response = await this.chat({
      messages: [{ role: 'user', content: message }],
    });
    return response.content;
  }

  private async callZhipuAPI(prompt: string): Promise<string> {
    const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'glm-4-flash',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as any;
    return data.choices[0].message.content;
  }
}

export function createZhipuClient(): ZhipuClient {
  return new ZhipuClient();
}
