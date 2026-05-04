/**
 * DeepSeek API客户端
 */

import { LLMClient, LLMRequest, LLMResponse, LLMConfig } from './types.js';
import { buildChatPrompt } from './prompt.js';

export class DeepSeekClient implements LLMClient {
  private config: LLMConfig;
  private apiKey: string | null = null;

  constructor() {
    this.config = this.loadConfig();
    this.apiKey = this.getApiKey();
  }

  private loadConfig(): LLMConfig {
    return {
      provider: 'deepseek',
      model: 'deepseek-chat',
    };
  }

  private getApiKey(): string | null {
    const envKey = process.env.DEEPSEEK_API_KEY;
    if (envKey) {
      console.log('[DeepSeek] 使用环境变量API Key');
      return envKey;
    }
    if (this.config.apiKey) {
      console.log('[DeepSeek] 使用配置文件API Key');
      return this.config.apiKey;
    }
    console.log('[DeepSeek] API Key未配置');
    return null;
  }

  isAvailable(): boolean {
    return this.apiKey !== null;
  }

  async chat(request: LLMRequest): Promise<LLMResponse> {
    if (!this.apiKey) {
      return {
        content: 'DeepSeek API Key未配置，请设置环境变量DEEPSEEK_API_KEY',
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

      const response = await this.callDeepSeekAPI(prompt);

      return {
        content: response,
        success: true,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.error('[DeepSeek] 调用失败:', error);
      return {
        content: `抱歉，DeepSeek服务出现错误: ${error.message}`,
        success: false,
        timestamp: Date.now(),
        error: error.message,
      };
    }
  }

  async simpleChat(message: string, memoryContext?: string): Promise<string> {
    const response = await this.chat({
      messages: [{ role: 'user', content: message }],
      context: memoryContext ? { memoryContext } : undefined,
    });
    return response.content;
  }

  private async callDeepSeekAPI(prompt: string): Promise<string> {
    const url = 'https://api.deepseek.com/v1/chat/completions';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model || 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as any;
      return data.choices[0].message.content;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createDeepSeekClient(): DeepSeekClient {
  return new DeepSeekClient();
}
